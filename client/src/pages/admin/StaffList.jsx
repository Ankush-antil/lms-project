import * as XLSX from 'xlsx';
import { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    Download, Upload,
    Users, Search, Building, Mail, Briefcase, Calendar,
    DollarSign, CheckSquare, Plus, Check, Clock, AlertCircle, Trash2, Edit, Filter, ChevronDown, Eye, Bell, CheckCircle,
    Award, AlertTriangle, ChevronLeft, X, Pencil
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import BulkEditModal from '../../components/common/BulkEditModal';
import { useUserProfile } from '../../components/common/UserProfileContext';

const calculateSpendingTime = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'â€”';
    const parseTimeToMinutes = (timeStr) => {
        const clean = timeStr.trim().toUpperCase();
        let hours = 0;
        let minutes = 0;

        const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
        if (ampmMatch) {
            hours = parseInt(ampmMatch[1], 10);
            minutes = parseInt(ampmMatch[2], 10);
            const ampm = ampmMatch[3];
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        }

        const HHMMMatch = clean.match(/^(\d{1,2}):(\d{2})$/);
        if (HHMMMatch) {
            hours = parseInt(HHMMMatch[1], 10);
            minutes = parseInt(HHMMMatch[2], 10);
            return hours * 60 + minutes;
        }
        return null;
    };

    const startMins = parseTimeToMinutes(checkIn);
    const endMins = parseTimeToMinutes(checkOut);

    if (startMins === null || endMins === null) return 'â€”';

    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;

    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;

    if (hrs > 0) {
        return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`;
    }
    return `${mins} min${mins > 1 ? 's' : ''}`;
};

const StaffList = () => {
    const { user } = useAuth();
    const { openProfile } = useUserProfile();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('directory'); // directory, attendance, salary, task
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedStaffForDetails, setSelectedStaffForDetails] = useState(null);
    const [institutes, setInstitutes] = useState([]);
    const [filterInstitute, setFilterInstitute] = useState('All');

    // Bulk actions
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    useEffect(() => {
        setSelectedIds(new Set());
        setBulkAction('');
    }, [activeTab]);

    // Points / Valuation Management states
    const [pointsLogs, setPointsLogs] = useState(() => {
        const stored = localStorage.getItem('staff_points') || localStorage.getItem('staff_minus_points');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        localStorage.setItem('staff_points', JSON.stringify(pointsLogs));
    }, [pointsLogs]);

    const [selectedPreviewStaff, setSelectedPreviewStaff] = useState(null);
    const [pointsDateFilter, setPointsDateFilter] = useState('year');
    const [pointsParticularDate, setPointsParticularDate] = useState('');
    const [pointsStartDate, setPointsStartDate] = useState('');
    const [pointsEndDate, setPointsEndDate] = useState('');

    const [showPointsModal, setShowPointsModal] = useState(false);
    const [pointsStaff, setPointsStaff] = useState('');
    const [pointsType, setPointsType] = useState('minus'); // 'plus' or 'minus'
    const [isPointsStaffPreselected, setIsPointsStaffPreselected] = useState(false);
    const [pointsModalRows, setPointsModalRows] = useState([
        { title: '', description: '', valuation: '', date: new Date().toISOString().split('T')[0] }
    ]);
    const [editingLogId, setEditingLogId] = useState(null);
    const [submittingPoints, setSubmittingPoints] = useState(false);
    const [descPopupIndex, setDescPopupIndex] = useState(null);
    const [descPopupText, setDescPopupText] = useState('');
    const [descPopupType, setDescPopupType] = useState('points');

    // Sub-modules state
    const [tasks, setTasks] = useState([
        { id: 1, staffName: 'Ravi Kumar', title: 'Compile Fee Report', due: '2026-07-12', priority: 'High', status: 'pending', createdAt: '2026-07-10', verificationStatus: 'under_verification' },
        { id: 2, staffName: 'Sunita Sharma', title: 'Setup IT Lab computers', due: '2026-07-15', priority: 'Medium', status: 'inprogress', createdAt: '2026-07-11', verificationStatus: '' },
        { id: 3, staffName: 'Mohit Verma', title: 'Clean general lobby area', due: '2026-07-13', priority: 'Low', status: 'done', createdAt: '2026-07-12', verificationStatus: 'approved' },
        { id: 4, staffName: 'Priya Singh', title: 'File all hardcopy admissions', due: '2026-07-18', priority: 'High', status: 'pending', createdAt: '2026-07-12', verificationStatus: '' }
    ]);
    const [newTask, setNewTask] = useState({ staffName: '', title: '', due: '', priority: 'Medium' });

    // Filter states for tasks
    const [taskPriorityFilter, setTaskPriorityFilter] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState('');
    const [selectedStaffForTasks, setSelectedStaffForTasks] = useState(null);
    const [taskDateFilter, setTaskDateFilter] = useState('year');
    const [filterParticularDate, setFilterParticularDate] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [taskVerificationFilter, setTaskVerificationFilter] = useState('');

    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [submittingAttendance, setSubmittingAttendance] = useState(false);
    const [viewAttendanceStaff, setViewAttendanceStaff] = useState(null);
    const [viewTaskStaffRecord, setViewTaskStaffRecord] = useState(null);
    const [historyDateFilter, setHistoryDateFilter] = useState('');
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editRecord, setEditRecord] = useState({ status: '', checkInTime: '', checkOutTime: '' });

    const [salaryPayouts, setSalaryPayouts] = useState({
        'Ravi Kumar': 'Paid',
        'Sunita Sharma': 'Pending',
        'Mohit Verma': 'Paid',
        'Priya Singh': 'Pending'
    });

    const fetchStaffData = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const staffRes = await axios.get('/api/users?role=Teacher,Editor,Accountant,Marketer,Staff,Institute', config);
            setStaffList(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.users || []);
        } catch (err) {
            console.error("Error fetching staff list:", err);
            setStaffList([]);
        }
    };

    useEffect(() => {
        const initData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const [staffRes, instsRes] = await Promise.all([
                    axios.get('/api/users?role=Teacher,Editor,Accountant,Marketer,Staff,Institute', config),
                    axios.get('/api/setup/institutes')
                ]);
                setStaffList(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.users || []);
                setInstitutes(instsRes.data);
            } catch (err) {
                console.error("Error initializing staff data:", err);
                setStaffList([]);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    const handleToggleStatus = async (staffId, currentIsActive) => {
        try {
            const nextActive = currentIsActive === false ? true : false;
            await axios.put(`/api/users/${staffId}`, { isActive: nextActive });
            setStaffList(prev => prev.map(s => s._id === staffId ? { ...s, isActive: nextActive } : s));
            toast.success('Staff status updated successfully');
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

    const handleApplyBulkAction = async () => {
        if (selectedIds.size === 0 || !bulkAction) return;

        if (bulkAction === 'edit') {
            setIsBulkEditOpen(true);
            return;
        }

        if (bulkAction === 'delete') {
            const confirmMsg = activeTab === 'attendance'
                ? `Are you sure you want to delete attendance logs for the ${selectedIds.size} selected staff members on ${attendanceDate}?`
                : `Are you sure you want to delete the ${selectedIds.size} selected staff members?`;

            if (window.confirm(confirmMsg)) {
                try {
                    const promises = Array.from(selectedIds).map(id => {
                        if (activeTab === 'directory') {
                            return axios.delete(`/api/users/${id}`);
                        } else if (activeTab === 'attendance') {
                            return axios.delete(`/api/users/${id}/physical-attendance/${attendanceDate}`);
                        }
                        return Promise.resolve();
                    });

                    await Promise.all(promises);
                    toast.success('Successfully completed bulk deletion');
                    setSelectedIds(new Set());
                    setBulkAction('');
                    // refresh staff list
                    await fetchStaffData();
                } catch (err) {
                    console.error("Bulk delete error:", err);
                    toast.error('Failed to complete some actions');
                }
            }
        }
    };

    useEffect(() => {
        setEditingId(null);
    }, [attendanceDate, activeTab]);

    useEffect(() => {
        if (!staffList.length) return;
        const init = {};
        staffList.forEach(s => {
            const attendanceList = s.staffProfile?.physicalAttendance || s.teacherProfile?.physicalAttendance || s.studentProfile?.physicalAttendance || [];
            const existing = attendanceList.find(a => a.date === attendanceDate);
            init[s._id] = {
                status: existing ? (existing.status || 'Present') : '',
                attendanceType: existing?.source || 'Physical',
                markedBy: existing?.markedBy || (existing ? 'Admin' : '—'),
                teacherNote: existing?.teacherNote || existing?.note || '',
                studentNote: existing?.studentNote || existing?.leaveNote || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
            };
        });
        setAttendanceRecords(init);
    }, [staffList, attendanceDate]);

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'Present':
                return <span style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800, background: '#ecfdf5', color: '#059669', border: '1.5px solid #a7f3d0', borderRadius: '8px' }}>Present</span>;
            case 'Absent':
                return <span style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800, background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: '8px' }}>Absent</span>;
            case 'Leave':
                return <span style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800, background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a', borderRadius: '8px' }}>Leave</span>;
            case 'Holiday':
                return <span style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800, background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: '8px' }}>Holiday</span>;
            default:
                return <span style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800, background: '#f1f5f9', color: '#94a3b8', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>Not Marked</span>;
        }
    };

    const handleStartEdit = (staffId, currentRecord) => {
        setEditingId(staffId);
        setEditRecord({
            status: currentRecord.status || 'Present',
            attendanceType: currentRecord.attendanceType || 'Physical',
            markedBy: currentRecord.markedBy || 'Admin',
            teacherNote: currentRecord.teacherNote || '',
            studentNote: currentRecord.studentNote || '',
            checkInTime: currentRecord.checkInTime || '',
            checkOutTime: currentRecord.checkOutTime || ''
        });
    };

    const handleAttendanceFieldChange = (staffId, field, value) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [staffId]: {
                ...(prev[staffId] || { status: '', attendanceType: 'Physical', markedBy: 'Admin', teacherNote: '', studentNote: '', checkInTime: '', checkOutTime: '' }),
                [field]: value
            }
        }));
    };

    const handleSaveSingleAttendance = async (staffId) => {
        try {
            setSubmittingAttendance(true);
            const dataToSave = editingId === staffId ? editRecord : (attendanceRecords[staffId] || {});
            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: [{
                    studentId: staffId,
                    status: dataToSave.status || 'Present',
                    source: dataToSave.attendanceType || 'Physical',
                    markedBy: dataToSave.markedBy || 'Admin',
                    note: dataToSave.teacherNote || '',
                    studentNote: dataToSave.studentNote || '',
                    checkInTime: dataToSave.checkInTime || '',
                    checkOutTime: dataToSave.checkOutTime || ''
                }]
            });
            toast.success('Attendance record updated successfully!');
            setEditingId(null);
            await fetchStaffData();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to update attendance');
        } finally {
            setSubmittingAttendance(false);
        }
    };

    const handleSaveAttendance = async () => {
        try {
            setSubmittingAttendance(true);
            const recordsToSave = Object.entries(attendanceRecords).map(([staffId, data]) => ({
                studentId: staffId,
                status: data.status,
                source: data.attendanceType || 'Physical',
                markedBy: data.markedBy || 'Admin',
                note: data.teacherNote || data.note || '',
                studentNote: data.studentNote || '',
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || '',
            }));

            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: recordsToSave
            });

            toast.success(`Staff attendance saved for ${attendanceDate}!`);
            await fetchStaffData();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmittingAttendance(false);
        }
    };

    const filtered = staffList.filter(s =>
        (filterInstitute === 'All' || (s.institute?._id === filterInstitute || s.institute === filterInstitute)) &&
        (s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase()) ||
            s.staffProfile?.designation?.toLowerCase().includes(search.toLowerCase()))
    );

    const displayList = filtered.length > 0 ? filtered : (search ? [] : staffList);

    // ── Pagination States & Handlers ─────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, search, filterInstitute, taskPriorityFilter, taskStatusFilter, taskDateFilter, itemsPerPage]);

    const paginatedDisplayList = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return displayList.slice(start, start + itemsPerPage);
    }, [displayList, currentPage, itemsPerPage]);

    const renderEntriesPerPageSelector = () => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                SHOW
            </span>
            <select
                value={itemsPerPage}
                onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                }}
                style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    background: '#f8fafc',
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
            >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </select>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ENTRIES
            </span>
        </div>
    );

    const renderPaginationFooter = (totalCount, currentPg, setPg, perPage, setPerPage) => {
        const totalPg = Math.max(1, Math.ceil(totalCount / perPage));
        const startIdx = totalCount === 0 ? 0 : (currentPg - 1) * perPage + 1;
        const endIdx = Math.min(totalCount, currentPg * perPage);

        const pageNumbers = [];
        let startPage = Math.max(1, currentPg - 2);
        let endPage = Math.min(totalPg, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '14px 20px',
                background: '#fff',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                {/* Left: Showing X to Y of Z entries */}
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                    Showing <span style={{ fontWeight: 900, color: '#0f172a' }}>{startIdx}</span> to <span style={{ fontWeight: 900, color: '#0f172a' }}>{endIdx}</span> of <span style={{ fontWeight: 900, color: '#0f172a' }}>{totalCount}</span> entries
                </div>

                {/* Right: Page Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                    <button
                        type="button"
                        disabled={currentPg <= 1}
                        onClick={() => setPg(prev => Math.max(1, prev - 1))}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: currentPg <= 1 ? '#f8fafc' : '#fff',
                            color: currentPg <= 1 ? '#cbd5e1' : '#334155',
                            cursor: currentPg <= 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        Previous
                    </button>

                    {startPage > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setPg(1)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    background: currentPg === 1 ? '#0b1329' : '#fff',
                                    color: currentPg === 1 ? '#fff' : '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                1
                            </button>
                            {startPage > 2 && <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0 2px' }}>...</span>}
                        </>
                    )}

                    {pageNumbers.map(pg => (
                        <button
                            key={pg}
                            type="button"
                            onClick={() => setPg(pg)}
                            style={{
                                padding: '6px 11px',
                                borderRadius: '10px',
                                border: pg === currentPg ? 'none' : '1px solid #e2e8f0',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                background: pg === currentPg ? '#0b1329' : '#fff',
                                color: pg === currentPg ? '#fff' : '#334155',
                                cursor: 'pointer',
                                boxShadow: pg === currentPg ? '0 2px 6px rgba(11, 19, 41, 0.25)' : 'none'
                            }}
                        >
                            {pg}
                        </button>
                    ))}

                    {endPage < totalPg && (
                        <>
                            {endPage < totalPg - 1 && <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0 2px' }}>...</span>}
                            <button
                                type="button"
                                onClick={() => setPg(totalPg)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    background: currentPg === totalPg ? '#0b1329' : '#fff',
                                    color: currentPg === totalPg ? '#fff' : '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                {totalPg}
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        disabled={currentPg >= totalPg}
                        onClick={() => setPg(prev => Math.min(totalPg, prev + 1))}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: currentPg >= totalPg ? '#f8fafc' : '#fff',
                            color: currentPg >= totalPg ? '#cbd5e1' : '#334155',
                            cursor: currentPg >= totalPg ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTask.staffName || !newTask.title || !newTask.due) {
            toast.error('Please fill all task fields');
            return;
        }
        setTasks(prev => [
            ...prev,
            { id: Date.now(), ...newTask, status: 'Pending' }
        ]);
        setNewTask({ staffName: '', title: '', due: '', priority: 'Medium' });
        toast.success('Task assigned successfully!');
    };

    // ── Points Modal Helpers ─────────────
    const openAddPointsModal = (staffId = '', defaultType = 'minus') => {
        setPointsStaff(staffId);
        setIsPointsStaffPreselected(!!staffId);
        setPointsType(defaultType);
        setPointsModalRows([
            { title: '', description: '', valuation: '', date: new Date().toISOString().split('T')[0] }
        ]);
        setEditingLogId(null);
        setShowPointsModal(true);
    };

    const openEditPointsModal = (log) => {
        setPointsStaff(log.staffId);
        setIsPointsStaffPreselected(true);
        setPointsType(log.type);
        setPointsModalRows([
            {
                title: log.taskTitle || '',
                description: log.reason || '',
                valuation: log.points ? log.points.toString() : '',
                date: log.date || new Date().toISOString().split('T')[0]
            }
        ]);
        setEditingLogId(log.id);
        setShowPointsModal(true);
    };

    const addPointsRow = () => {
        setPointsModalRows(prev => [
            ...prev,
            { title: '', description: '', valuation: '', date: new Date().toISOString().split('T')[0] }
        ]);
    };

    const removePointsRow = (index) => {
        if (pointsModalRows.length <= 1) {
            toast.error('At least one points row must remain.');
            return;
        }
        setPointsModalRows(prev => prev.filter((_, idx) => idx !== index));
    };

    const handlePointsRowChange = (index, field, val) => {
        setPointsModalRows(prev => prev.map((row, idx) => idx === index ? { ...row, [field]: val } : row));
    };

    const recalculateStaffPoints = async (staffId, logs) => {
        const staffLogs = logs.filter(l => l.staffId === staffId);
        const plusPoints = staffLogs.filter(l => l.type === 'plus').reduce((sum, l) => sum + (Number(l.points) || 0), 0);
        const minusPoints = staffLogs.filter(l => l.type === 'minus').reduce((sum, l) => sum + (Number(l.points) || 0), 0);

        setStaffList(prev => prev.map(s => {
            if (s._id === staffId) {
                return {
                    ...s,
                    staffProfile: {
                        ...(s.staffProfile || {}),
                        plusPoints,
                        minusPoints
                    }
                };
            }
            return s;
        }));

        if (staffId && !staffId.startsWith('pl_') && !staffId.startsWith('d_') && !staffId.startsWith('d')) {
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(`/api/users/${staffId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const currentProfile = (data?.user || data)?.staffProfile || {};

                await axios.put(`/api/users/${staffId}`, {
                    staffProfile: {
                        ...currentProfile,
                        plusPoints,
                        minusPoints
                    }
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error('Failed to update staff points on server', err);
            }
        }
    };

    const handleSavePointsLog = async (e) => {
        e.preventDefault();
        if (!pointsStaff) {
            toast.error('Please select a staff member.');
            return;
        }

        const staff = staffList.find(s => s._id === pointsStaff);
        if (!staff) {
            toast.error('Staff member not found.');
            return;
        }

        // Validate rows
        const validRows = pointsModalRows.filter(r => r.valuation && Number(r.valuation) > 0);
        if (validRows.length === 0) {
            toast.error('Please fill at least one row with a valid positive points value.');
            return;
        }

        for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            if (!row.description || !row.description.trim()) {
                toast.error(`Please enter a description / reason for row #${i + 1}`);
                return;
            }
        }

        try {
            setSubmittingPoints(true);
            let updatedLogs = [...pointsLogs];

            if (editingLogId) {
                // Edit mode
                const row = validRows[0];
                updatedLogs = updatedLogs.map(l => l.id === editingLogId ? {
                    ...l,
                    staffId: pointsStaff,
                    staffName: staff.name,
                    taskTitle: row.title || '',
                    reason: row.description,
                    points: Number(row.valuation),
                    type: pointsType,
                    date: row.date
                } : l);
                toast.success('Points entry updated successfully!');
            } else {
                // Add mode
                const newEntries = validRows.map((row, idx) => ({
                    id: 'pl_' + (Date.now() + idx),
                    staffId: pointsStaff,
                    staffName: staff.name,
                    taskTitle: row.title || '',
                    reason: row.description,
                    points: Number(row.valuation),
                    type: pointsType,
                    date: row.date
                }));
                updatedLogs = [...newEntries, ...updatedLogs];
                toast.success(`Successfully recorded points entries for ${staff.name}!`);
            }

            setPointsLogs(updatedLogs);
            await recalculateStaffPoints(pointsStaff, updatedLogs);

            if (editingLogId) {
                const oldLog = pointsLogs.find(l => l.id === editingLogId);
                if (oldLog && oldLog.staffId !== pointsStaff) {
                    await recalculateStaffPoints(oldLog.staffId, updatedLogs);
                }
            }

            setShowPointsModal(false);
            setPointsStaff('');
            setPointsModalRows([
                { title: '', description: '', valuation: '', date: new Date().toISOString().split('T')[0] }
            ]);
            setEditingLogId(null);

            // Refresh staff list
            await fetchStaffData();
        } catch (err) {
            toast.error('Failed to record points');
        } finally {
            setSubmittingPoints(false);
        }
    };

    const handleDeletePointsLog = async (logId) => {
        if (!window.confirm('Are you sure you want to delete this points entry?')) return;

        const log = pointsLogs.find(l => l.id === logId);
        if (!log) return;

        const staffId = log.staffId;
        const updatedLogs = pointsLogs.filter(l => l.id !== logId);

        try {
            setPointsLogs(updatedLogs);
            await recalculateStaffPoints(staffId, updatedLogs);
            toast.success('Points entry deleted successfully.');
            // Refresh staff list
            await fetchStaffData();
        } catch (err) {
            toast.error('Failed to delete points entry.');
        }
    };

    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

    const importUsersRef = useRef(null);

    const handleImportUsers = (e) => {

        const file = e.target.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        const filename = file.name.toLowerCase();

        const processImportedArray = async (parsed) => {

            if (!Array.isArray(parsed)) {

                toast.error('File must contain an array of rows');

                return;

            }

            const parsedMapped = parsed.map(row => {

                const keys = Object.keys(row);

                const nameKey = keys.find(k => k.toLowerCase() === 'name');

                const emailKey = keys.find(k => k.toLowerCase() === 'email');

                const passwordKey = keys.find(k => k.toLowerCase() === 'password');

                const courseKey = keys.find(k => ['course name', 'coursename', 'course'].includes(k.toLowerCase()));

                const mobileKey = keys.find(k => ['mobile number', 'mobilenumber', 'mobile', 'phone'].includes(k.toLowerCase()));

                return {

                    name: nameKey ? String(row[nameKey]).trim() : '',

                    email: emailKey ? String(row[emailKey]).trim() : '',

                    password: passwordKey ? String(row[passwordKey]).trim() : '',

                    role: 'Staff',

                    courseName: courseKey ? String(row[courseKey]).trim() : '',

                    mobileNumber: mobileKey ? String(row[mobileKey]).trim() : ''

                };

            }).filter(item => item.name && item.email && item.role);

            if (parsedMapped.length === 0) {

                toast.error('No valid rows found. Make sure each object has "Name" and "Email" columns.');

                return;

            }

            const loadingToast = toast.loading(`Importing ${parsedMapped.length} users...`);

            try {

                const res = await axios.post('/api/users/import', { users: parsedMapped });

                toast.dismiss(loadingToast);

                const { successCount, errors } = res.data.results;

                if (errors && errors.length > 0) {

                    toast.success(`Successfully imported ${successCount} users. ${errors.length} failed.`);

                } else {

                    toast.success(`Successfully imported ${successCount} users!`);

                }

                if (typeof fetchData === 'function') fetchData();

                else if (typeof fetchStaff === 'function') fetchStaff();

            } catch (err) {

                toast.dismiss(loadingToast);

                toast.error(err.response?.data?.message || 'Error importing users');

            }

        };

        if (filename.endsWith('.json')) {

            reader.onload = async (evt) => {

                try {

                    const parsed = JSON.parse(evt.target.result);

                    processImportedArray(parsed);

                } catch (err) {

                    toast.error('Failed to parse JSON file');

                }

            };

            reader.readAsText(file);

        } else {

            reader.onload = async (evt) => {

                try {

                    const data = new Uint8Array(evt.target.result);

                    const workbook = XLSX.read(data, { type: 'array' });

                    const firstSheetName = workbook.SheetNames[0];

                    const worksheet = workbook.Sheets[firstSheetName];

                    const parsed = XLSX.utils.sheet_to_json(worksheet);

                    processImportedArray(parsed);

                } catch (err) {

                    toast.error('Failed to parse file');

                }

            };

            reader.readAsArrayBuffer(file);

        }

        e.target.value = '';

    };


    const exportUsers = (format) => {

        const list = staffList;

        if (list.length === 0) {

            toast.error('No users to export');

            return;

        }

        const rows = list.map(u => ({

            Name: u.name || '',

            Email: u.email || '',

            Role: u.role || 'Staff',

            'Mobile Number': u.mobileNumber || '',

            Course: u.studentProfile?.course?.name || u.teacherProfile?.assignedCourses?.[0]?.name || u.editorProfile?.assignedCourses?.[0]?.name || '',

            Batch: u.studentProfile?.batch || '',

            Section: u.studentProfile?.section || '',

            'Created At': u.createdAt ? new Date(u.createdAt).toLocaleString() : ''

        }));

        if (format === 'json') {

            const jsonContent = JSON.stringify(rows.map(r => ({

                name: r.Name,

                email: r.Email,

                role: r.Role,

                mobileNumber: r['Mobile Number'],

                courseName: r.Course,

                batch: r.Batch,

                section: r.Section

            })), null, 2);

            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `staff_list_${new Date().toISOString().split('T')[0]}.json`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${list.length} users to JSON`);

        } else if (format === 'csv') {

            const worksheet = XLSX.utils.json_to_sheet(rows);

            const csv = XLSX.utils.sheet_to_csv(worksheet);

            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `staff_list_${new Date().toISOString().split('T')[0]}.csv`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${list.length} users to CSV`);

        } else if (format === 'excel') {

            const worksheet = XLSX.utils.json_to_sheet(rows);

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;

            link.download = `staff_list_${new Date().toISOString().split('T')[0]}.xlsx`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${list.length} users to Excel`);

        }

    };


    return (
        <>
            <DashboardLayout role={user?.role || 'Admin'} fullWidth={true}>
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
                                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>All Staff Portal</h1>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage staff accounts, attendance, salaries, and tasks</p>
                            </div>
                        </div>
                    </div>


                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', overflowX: 'auto' }}>
                        {[
                            { id: 'directory', label: 'Staff Directory', icon: Users },
                            { id: 'attendance', label: 'Attendance Management', icon: Calendar },
                            { id: 'salary', label: 'Salary & Payouts', icon: DollarSign },
                            { id: 'task', label: 'Task Assignments', icon: CheckSquare },
                            { id: 'minusPoints', label: 'Points Management', icon: Award },
                        ].map(t => {
                            const Icon = t.icon;
                            const isSel = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800,
                                        border: 'none', background: isSel ? '#0f172a' : 'transparent',
                                        color: isSel ? '#fff' : '#64748b', cursor: 'pointer',
                                        transition: 'all 0.15s ease', whiteSpace: 'nowrap'
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', flexWrap: 'wrap' }}>
                                        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
                                            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                placeholder="Search staff directory..."
                                                style={{
                                                    width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                                                    border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.82rem',
                                                    fontWeight: 600, color: '#374151', background: '#fff', outline: 'none',
                                                    fontFamily: 'inherit', boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <select
                                            value={bulkAction}
                                            onChange={(e) => setBulkAction(e.target.value)}
                                            style={{
                                                paddingLeft: 12, paddingRight: 24, paddingTop: 10, paddingBottom: 10,
                                                border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.82rem',
                                                fontWeight: 600, color: '#374151', background: '#fff', outline: 'none',
                                                fontFamily: 'inherit', cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">Bulk Action</option>
                                            <option value="edit">Edit Selected</option>
                                            <option value="delete">Delete Selected</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleApplyBulkAction}
                                            disabled={selectedIds.size === 0 || !bulkAction}
                                            style={{
                                                paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                                                border: 'none', borderRadius: '12px', fontSize: '0.82rem',
                                                fontWeight: 700, color: '#fff', backgroundColor: selectedIds.size > 0 && bulkAction ? '#4f46e5' : '#cbd5e1',
                                                cursor: selectedIds.size > 0 && bulkAction ? 'pointer' : 'not-allowed',
                                                transition: 'all 0.2s', height: '38px', whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Apply to All ({selectedIds.size})
                                        </button>
                                    </div>
                                    {user?.role === 'Admin' && (
                                        <div style={{ position: 'relative', width: 220 }}>
                                            <Filter size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <select
                                                value={filterInstitute}
                                                onChange={(e) => setFilterInstitute(e.target.value)}
                                                style={{
                                                    width: '100%', paddingLeft: 32, paddingRight: 24, paddingTop: 10, paddingBottom: 10,
                                                    border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.82rem',
                                                    fontWeight: 600, color: '#374151', background: '#fff', outline: 'none',
                                                    fontFamily: 'inherit', appearance: 'none', cursor: 'pointer'
                                                }}
                                            >
                                                <option value="All">All Institutes</option>
                                                {institutes.map(inst => (
                                                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {renderEntriesPerPageSelector()}
                                    <input
                                        type="file"
                                        ref={importUsersRef}
                                        onChange={handleImportUsers}
                                        accept=".json,.csv,.xlsx,.xls"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => importUsersRef.current?.click()}
                                        className="px-4 py-2 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-md shadow-[#0b1329]/10 cursor-pointer whitespace-nowrap"
                                    >
                                        <Upload size={16} /> Import
                                    </button>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                            className="px-4 py-2 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-md shadow-[#0b1329]/10 cursor-pointer whitespace-nowrap"
                                        >
                                            <Download size={16} /> Export
                                        </button>
                                        {isExportDropdownOpen && (
                                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                                                <button
                                                    type="button"
                                                    onClick={() => { exportUsers('excel'); setIsExportDropdownOpen(false); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                                >
                                                    Excel (.xlsx)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { exportUsers('csv'); setIsExportDropdownOpen(false); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                                >
                                                    CSV (.csv)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { exportUsers('json'); setIsExportDropdownOpen(false); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                                >
                                                    JSON (.json)
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 700 }}>Loading staff...</div>
                            ) : (
                                <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                                    <th style={{ padding: '13px 16px', width: '40px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={paginatedDisplayList.length > 0 && paginatedDisplayList.every(s => selectedIds.has(s._id))}
                                                            onChange={() => {
                                                                const pageIds = paginatedDisplayList.map(s => s._id);
                                                                const allSelected = pageIds.every(id => selectedIds.has(id));
                                                                setSelectedIds(prev => {
                                                                    const next = new Set(prev);
                                                                    if (allSelected) { pageIds.forEach(id => next.delete(id)); }
                                                                    else { pageIds.forEach(id => next.add(id)); }
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                        />
                                                    </th>
                                                    {['Name', 'Department', 'Institute', 'Status', 'Actions'].map(h => (
                                                        <th key={h} style={{ padding: '13px 16px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedDisplayList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                                                            No staff found
                                                        </td>
                                                    </tr>
                                                ) : paginatedDisplayList.map((s, i) => (
                                                    <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <td style={{ padding: '13px 16px', width: '40px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(s._id)}
                                                                onChange={() => {
                                                                    setSelectedIds(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(s._id)) {
                                                                            next.delete(s._id);
                                                                        } else {
                                                                            next.add(s._id);
                                                                        }
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                            />
                                                        </td>
                                                        <td style={{ padding: '13px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: 34, height: 34, borderRadius: '10px',
                                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: '#fff', fontSize: '0.8rem', fontWeight: 900
                                                                }}>
                                                                    {s.name?.[0]?.toUpperCase() || '?'}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                                                                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 650 }}>{s.email}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '13px 16px' }}>
                                                            <span style={{
                                                                padding: '3px 10px',
                                                                fontSize: '0.68rem',
                                                                fontWeight: 800,
                                                                borderRadius: '8px',
                                                                background: s.role === 'Teacher' ? '#eef2ff' : s.role === 'Editor' ? '#fef3c7' : s.role === 'Accountant' ? '#dcfce7' : '#fce7f3',
                                                                color: s.role === 'Teacher' ? '#4f46e5' : s.role === 'Editor' ? '#d97706' : s.role === 'Accountant' ? '#16a34a' : '#db2777'
                                                            }}>{s.role || '—'}</span>
                                                        </td>
                                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Building size={12} style={{ color: '#94a3b8' }} />
                                                                {s.instituteName || s.institute?.name || 'All Institutes'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '13px 16px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleStatus(s._id, s.isActive)}
                                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${s.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                                    }`}
                                                                title={s.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                                            >
                                                                <span className="sr-only">Toggle status</span>
                                                                <span
                                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${s.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                                                        }`}
                                                                />
                                                            </button>
                                                        </td>
                                                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                                <button
                                                                    onClick={() => openProfile(s._id)}
                                                                    title="View Profile"
                                                                    style={{
                                                                        padding: '6px 8px', border: 'none', borderRadius: '8px',
                                                                        background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedStaff(s);
                                                                        setIsEditModalOpen(true);
                                                                    }}
                                                                    title="Edit Staff"
                                                                    style={{
                                                                        padding: '6px 8px', border: 'none', borderRadius: '8px',
                                                                        background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!window.confirm('Delete this staff member?')) return;
                                                                        try {
                                                                            await axios.delete(`/api/users/${s._id}`);
                                                                            toast.success('Staff deleted');
                                                                            setStaffList(prev => prev.filter(x => x._id !== s._id));
                                                                        } catch { toast.error('Failed to delete'); }
                                                                    }}
                                                                    title="Delete Staff"
                                                                    style={{
                                                                        padding: '6px 8px', border: 'none', borderRadius: '8px',
                                                                        background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {renderPaginationFooter(displayList.length, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage)}
                                </div>
                            )}

                        </>
                    )}

                    {activeTab === 'attendance' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Attendance Filter Row */}
                            <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder="Search staff..."
                                            style={{
                                                paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                                                border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.82rem',
                                                fontWeight: 600, color: '#374151', background: '#fff', outline: 'none',
                                                minWidth: 260, fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>
                                    {user?.role === 'Admin' && (
                                        <div style={{ position: 'relative', width: 220 }}>
                                            <Filter size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <select
                                                value={filterInstitute}
                                                onChange={(e) => setFilterInstitute(e.target.value)}
                                                style={{
                                                    width: '100%', paddingLeft: 32, paddingRight: 24, paddingTop: 10, paddingBottom: 10,
                                                    border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.82rem',
                                                    fontWeight: 600, color: '#374151', background: '#fff', outline: 'none',
                                                    fontFamily: 'inherit', appearance: 'none', cursor: 'pointer'
                                                }}
                                            >
                                                <option value="All">All Institutes</option>
                                                {institutes.map(inst => (
                                                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    {renderEntriesPerPageSelector()}
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>Attendance Date:</span>
                                    <input
                                        type="date"
                                        value={attendanceDate}
                                        onChange={e => setAttendanceDate(e.target.value)}
                                        style={{
                                            padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                                            fontSize: '0.82rem', fontWeight: 600, color: '#374151', background: '#fff',
                                            outline: 'none', fontFamily: 'inherit', cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Attendance Table */}
                            <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                                <th style={{ padding: '13px 14px', width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={paginatedDisplayList.length > 0 && paginatedDisplayList.every(s => selectedIds.has(s._id))}
                                                        onChange={() => {
                                                            const pageIds = paginatedDisplayList.map(s => s._id);
                                                            const allSelected = pageIds.every(id => selectedIds.has(id));
                                                            setSelectedIds(prev => {
                                                                const next = new Set(prev);
                                                                if (allSelected) { pageIds.forEach(id => next.delete(id)); }
                                                                else { pageIds.forEach(id => next.add(id)); }
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                    />
                                                </th>
                                                {[
                                                    'Name',
                                                    'Role',
                                                    'Attendance Type',
                                                    'Attendance By',
                                                    'Attendance Status',
                                                    'Admin Note',
                                                    'Staff Note',
                                                    'Check-In',
                                                    'Check-Out',
                                                    'Time Spent',
                                                    'Action'
                                                ].map(h => (
                                                    <th key={h} style={{ padding: '13px 14px', textAlign: h === 'Action' ? 'center' : 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedDisplayList.length === 0 ? (
                                                <tr><td colSpan={12} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No staff found</td></tr>
                                            ) : paginatedDisplayList.map((s, i) => {
                                                const rec = attendanceRecords[s._id] || { status: '', attendanceType: 'Physical', markedBy: 'Admin', teacherNote: '', studentNote: '', checkInTime: '', checkOutTime: '' };
                                                return (
                                                    <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                        <td style={{ padding: '12px 14px', width: '40px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(s._id)}
                                                                onChange={() => {
                                                                    setSelectedIds(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(s._id)) {
                                                                            next.delete(s._id);
                                                                        } else {
                                                                            next.add(s._id);
                                                                        }
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                            />
                                                        </td>
                                                        {/* 1. Name */}
                                                        <td style={{ padding: '12px 14px', minWidth: '170px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 900 }}>
                                                                    {s.name?.[0]?.toUpperCase() || '?'}
                                                                </div>
                                                                <div>
                                                                    <span style={{ fontSize: '0.83rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>{s.name}</span>
                                                                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{s.email}</span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* 3. Role */}
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <span style={{
                                                                padding: '3px 10px', fontSize: '0.68rem', fontWeight: 800, borderRadius: '8px',
                                                                background: s.role === 'Teacher' ? '#eef2ff' : s.role === 'Editor' ? '#fef3c7' : s.role === 'Accountant' ? '#dcfce7' : '#fce7f3',
                                                                color: s.role === 'Teacher' ? '#4f46e5' : s.role === 'Editor' ? '#d97706' : s.role === 'Accountant' ? '#16a34a' : '#db2777'
                                                            }}>{s.role || '—'}</span>
                                                        </td>

                                                        {/* 4. Attendance Type */}
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                                                                {rec.attendanceType || 'Physical'}
                                                            </span>
                                                        </td>

                                                        {/* 5. Attendance By */}
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                                                                {rec.markedBy || 'Admin'}
                                                            </span>
                                                        </td>

                                                        {/* 6. Attendance Status */}
                                                        <td style={{ padding: '12px 14px' }}>
                                                            {renderStatusBadge(rec.status)}
                                                        </td>

                                                        {/* 7. Admin Note */}
                                                        <td style={{ padding: '12px 14px', minWidth: '130px' }}>
                                                            <span style={{ fontSize: '0.78rem', color: rec.teacherNote ? '#334155' : '#94a3b8', fontWeight: 600 }}>
                                                                {rec.teacherNote || '—'}
                                                            </span>
                                                        </td>

                                                        {/* 8. Staff Note */}
                                                        <td style={{ padding: '12px 14px', minWidth: '130px' }}>
                                                            <span style={{ fontSize: '0.78rem', color: rec.studentNote ? '#334155' : '#94a3b8', fontWeight: 600 }}>
                                                                {rec.studentNote || '—'}
                                                            </span>
                                                        </td>

                                                        {/* 9. Check-in */}
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                                                {rec.checkInTime || '—'}
                                                            </span>
                                                        </td>

                                                        {/* 10. Check-out */}
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                                                {rec.checkOutTime || '—'}
                                                            </span>
                                                        </td>

                                                        {/* 11. Time spent */}
                                                        <td style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                                            {calculateSpendingTime(rec.checkInTime, rec.checkOutTime)}
                                                        </td>

                                                        {/* 12. Action */}
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => setViewAttendanceStaff(s)}
                                                                title="View Staff Attendance Record"
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    background: '#eef2ff',
                                                                    color: '#4f46e5',
                                                                    border: '1px solid #c7d2fe',
                                                                    borderRadius: '8px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 800,
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                <Eye size={15} /> View Record
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {renderPaginationFooter(displayList.length, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage)}
                            </div>
                        </div>
                    )}

                    {activeTab === 'salary' && (
                        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Salary Processing ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</h3>
                                    {user?.role === 'Admin' && (
                                        <div style={{ position: 'relative', width: 200 }}>
                                            <Filter size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <select value={filterInstitute} onChange={(e) => setFilterInstitute(e.target.value)} style={{ width: '100%', paddingLeft: 32, paddingRight: 24, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, color: '#374151', background: '#fff', outline: 'none', fontFamily: 'inherit', appearance: 'none', cursor: 'pointer' }}>
                                                <option value="All">All Institutes</option>
                                                {institutes.map(inst => (<option key={inst._id} value={inst._id}>{inst.name}</option>))}
                                            </select>
                                            <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                        </div>
                                    )}
                                    {renderEntriesPerPageSelector()}
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            <th style={{ padding: '12px 16px', width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={paginatedDisplayList.length > 0 && paginatedDisplayList.every(s => selectedIds.has(s._id))}
                                                    onChange={() => {
                                                        const pageIds = paginatedDisplayList.map(s => s._id);
                                                        const allSelected = pageIds.every(id => selectedIds.has(id));
                                                        setSelectedIds(prev => {
                                                            const next = new Set(prev);
                                                            if (allSelected) { pageIds.forEach(id => next.delete(id)); }
                                                            else { pageIds.forEach(id => next.add(id)); }
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                />
                                            </th>
                                            {['#', 'Staff Member', 'Role', 'Institute', 'Monthly Salary', 'Status', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedDisplayList.length === 0 ? (
                                            <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No staff found</td></tr>
                                        ) : paginatedDisplayList.map((s, i) => {
                                            const status = salaryPayouts[s.name] || s.staffProfile?.salaryStatus || 'Pending';
                                            const salary = s.staffProfile?.salary || 25000;
                                            return (
                                                <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                    <td style={{ padding: '12px 16px', width: '40px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(s._id)}
                                                            onChange={() => {
                                                                setSelectedIds(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(s._id)) { next.delete(s._id); }
                                                                    else { next.add(s._id); }
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#94a3b8' }}>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 900 }}>{s.name?.[0]?.toUpperCase() || '?'}</div>
                                                            <div>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>{s.name}</span>
                                                                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{s.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ padding: '3px 10px', fontSize: '0.68rem', fontWeight: 800, borderRadius: '8px', background: s.role === 'Teacher' ? '#eef2ff' : s.role === 'Editor' ? '#fef3c7' : s.role === 'Accountant' ? '#dcfce7' : '#fce7f3', color: s.role === 'Teacher' ? '#4f46e5' : s.role === 'Editor' ? '#d97706' : s.role === 'Accountant' ? '#16a34a' : '#db2777' }}>{s.role || '—'}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b' }}>{s.institute?.name || s.instituteName || '—'}</td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>₹{salary.toLocaleString('en-IN')}/mo</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ background: status === 'Paid' ? '#dcfce7' : status === 'Processing' ? '#fef3c7' : '#fee2e2', color: status === 'Paid' ? '#16a34a' : status === 'Processing' ? '#d97706' : '#ef4444', borderRadius: '999px', padding: '4px 12px', fontSize: '0.68rem', fontWeight: 900 }}>{status}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <button onClick={() => setSelectedStaffForDetails(s)} style={{ padding: '5px 12px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Eye size={13} /> Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {renderPaginationFooter(displayList.length, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage)}
                            </div>
                        </div>
                    )}

                    {activeTab === 'task' && (
                        <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Task Assignments</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Assign and monitor tasks for staff members with priorities and completion tracking.</p>
                                </div>
                                <button
                                    onClick={() => setShowAddTaskModal(true)}
                                    style={{
                                        padding: '9px 18px',
                                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                                    }}
                                >
                                    <Plus size={16} /> Add Task
                                </button>
                            </div>

                            {/* Filters */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {renderEntriesPerPageSelector()}
                                <select value={taskPriorityFilter} onChange={e => setTaskPriorityFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, outline: 'none', cursor: 'pointer', background: '#fff' }}>
                                    <option value="">All Priorities</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                                <select value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, outline: 'none', cursor: 'pointer', background: '#fff' }}>
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="inprogress">In Progress</option>
                                    <option value="done">Done</option>
                                </select>

                                {/* Date Filter Dropdown */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '5px 12px' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>Date:</span>
                                    <select
                                        value={taskDateFilter}
                                        onChange={e => setTaskDateFilter(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="today">Today</option>
                                        <option value="month">This Month</option>
                                        <option value="particular">Particular Date</option>
                                        <option value="range">Date Range</option>
                                        <option value="year">Complete Year</option>
                                    </select>
                                </div>

                                {taskDateFilter === 'particular' && (
                                    <input
                                        type="date"
                                        value={filterParticularDate}
                                        onChange={e => setFilterParticularDate(e.target.value)}
                                        style={{ padding: '6px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 600, outline: 'none', background: '#fff' }}
                                    />
                                )}
                                {taskDateFilter === 'range' && (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input
                                            type="date"
                                            value={filterStartDate}
                                            onChange={e => setFilterStartDate(e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 600, outline: 'none', background: '#fff' }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>to</span>
                                        <input
                                            type="date"
                                            value={filterEndDate}
                                            onChange={e => setFilterEndDate(e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 600, outline: 'none', background: '#fff' }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Task Table */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflowX: 'auto' }}>
                                {(() => {
                                    const filterTaskByDate = (t) => {
                                        if (!taskDateFilter || taskDateFilter === 'all' || taskDateFilter === 'year') return true;
                                        const getFormattedDateStr = (d) => {
                                            if (!d) return '';
                                            try { return new Date(d).toISOString().split('T')[0]; } catch (e) { return d; }
                                        };
                                        const taskDate = getFormattedDateStr(t.due || t.createdAt || t.date || t.assignedDate);
                                        const todayStr = new Date().toISOString().split('T')[0];

                                        if (taskDateFilter === 'today') return taskDate === todayStr;
                                        if (taskDateFilter === 'month') return taskDate.startsWith(todayStr.substring(0, 7));
                                        if (taskDateFilter === 'particular') return !filterParticularDate || taskDate === filterParticularDate;
                                        if (taskDateFilter === 'range') return (!filterStartDate || !filterEndDate) || (taskDate >= filterStartDate && taskDate <= filterEndDate);
                                        return true;
                                    };

                                    const filteredTasks = tasks.filter(t => 
                                        (!taskPriorityFilter || t.priority === taskPriorityFilter) &&
                                        (!taskStatusFilter || t.status === taskStatusFilter) &&
                                        filterTaskByDate(t)
                                    );

                                    const paginatedTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                                    return (
                                        <>
                                            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                                                        <th style={{ padding: '12px 14px', width: '40px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={paginatedTasks.length > 0 && paginatedTasks.every(t => selectedIds.has(t.id || t._id))}
                                                                onChange={() => {
                                                                    const pageIds = paginatedTasks.map(t => t.id || t._id);
                                                                    const allSelected = pageIds.every(id => selectedIds.has(id));
                                                                    setSelectedIds(prev => {
                                                                        const next = new Set(prev);
                                                                        if (allSelected) { pageIds.forEach(id => next.delete(id)); }
                                                                        else { pageIds.forEach(id => next.add(id)); }
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                            />
                                                        </th>
                                                        {[
                                                            '1. Staff',
                                                            '2. Role',
                                                            '3. Institute',
                                                            '4. Today’s surrendered task',
                                                            '5. Self created',
                                                            '6. Due Date',
                                                            '7. Priority',
                                                            '8. Status with Evidence',
                                                            '9. Verification Status',
                                                            '10. Individually all record'
                                                        ].map(h => (
                                                            <th key={h} style={{ padding: '12px 14px', textAlign: h.includes('Individually') ? 'center' : 'left' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedTasks.map(t => {
                                                        const staffMember = staffList.find(s => s._id === t.staffId || s.name === t.staffName) || {};
                                                        const isSelfCreated = t.isSelfCreated || t.source === 'Self';
                                                        const surrenderTask = t.title || t.surrenderedTask || '—';
                                                        const verificationStatus = t.verificationStatus || (t.status === 'done' ? 'Verified' : 'Pending');
                                                        const taskId = t.id || t._id;

                                                        return (
                                                            <tr key={taskId} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                                <td style={{ padding: '12px 14px', width: '40px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedIds.has(taskId)}
                                                                        onChange={() => {
                                                                            setSelectedIds(prev => {
                                                                                const next = new Set(prev);
                                                                                if (next.has(taskId)) { next.delete(taskId); }
                                                                                else { next.add(taskId); }
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                                    />
                                                                </td>
                                                                {/* 1. Staff */}
                                                                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#334155', minWidth: '160px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>
                                                                            {t.staffName?.[0]?.toUpperCase() || '?'}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{t.staffName}</div>
                                                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{staffMember.email || '—'}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                {/* 2. Role */}
                                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: '#f1f5f9', color: '#475569' }}>
                                                                        {staffMember.role || t.role || 'Staff'}
                                                                    </span>
                                                                </td>

                                                                {/* 3. Institute */}
                                                                <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                    {staffMember.instituteName || staffMember.institute?.name || 'All Institutes'}
                                                                </td>

                                                                {/* 4. Today’s surrendered task */}
                                                                <td style={{ padding: '12px 14px', minWidth: '180px' }}>
                                                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{surrenderTask}</div>
                                                                    {t.description && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{t.description}</div>}
                                                                </td>

                                                                {/* 5. Self created */}
                                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: isSelfCreated ? '#e0e7ff' : '#f1f5f9', color: isSelfCreated ? '#4338ca' : '#64748b' }}>
                                                                        {isSelfCreated ? 'Yes (Self)' : 'No (Admin)'}
                                                                    </span>
                                                                </td>

                                                                {/* 6. Due Date */}
                                                                <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                    {t.due ? new Date(t.due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                                </td>

                                                                {/* 7. Priority */}
                                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                    <span style={{ background: t.priority === 'High' ? '#fee2e2' : t.priority === 'Medium' ? '#fffbeb' : '#dcfce7', color: t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#d97706' : '#16a34a', fontSize: '0.68rem', fontWeight: 900, padding: '2px 8px', borderRadius: '12px' }}>
                                                                        {t.priority}
                                                                    </span>
                                                                </td>

                                                                {/* 8. Status with Evidence */}
                                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ background: t.status === 'done' ? '#dcfce7' : t.status === 'inprogress' ? '#fffbeb' : '#fee2e2', color: t.status === 'done' ? '#16a34a' : t.status === 'inprogress' ? '#d97706' : '#ef4444', borderRadius: '999px', padding: '3px 10px', fontSize: '0.68rem', fontWeight: 900 }}>
                                                                            {t.status}
                                                                        </span>
                                                                        {t.evidenceFile ? (
                                                                            <a href={t.evidenceFile} target="_blank" rel="noreferrer" title="View Evidence File" style={{ color: '#4f46e5', textDecoration: 'underline', fontSize: '0.7rem', fontWeight: 800 }}>
                                                                                📎 Evidence
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>No Evidence</span>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* 9. Verification Status */}
                                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                    <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 900, background: verificationStatus === 'Verified' ? '#ecfdf5' : verificationStatus === 'Rejected' ? '#fef2f2' : '#fffbeb', color: verificationStatus === 'Verified' ? '#047857' : verificationStatus === 'Rejected' ? '#b91c1c' : '#b45309' }}>
                                                                        {verificationStatus}
                                                                    </span>
                                                                </td>

                                                                {/* 10. Individually all record */}
                                                                <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                    <button
                                                                        onClick={() => setViewTaskStaffRecord(staffMember._id ? staffMember : { name: t.staffName })}
                                                                        title="View All Task Records"
                                                                        style={{ padding: '6px 12px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                    >
                                                                        <Eye size={13} /> View Record
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {filteredTasks.length === 0 && (
                                                        <tr><td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No tasks match the filters</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            {renderPaginationFooter(filteredTasks.length, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage)}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'minusPoints' && (() => {
                        const currentPreviewStaff = selectedPreviewStaff
                            ? (staffList.find(s => s._id === selectedPreviewStaff._id) || selectedPreviewStaff)
                            : null;
                        return (
                            <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {/* Header Section */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Points Management</h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                            {currentPreviewStaff
                                                ? `Viewing plus and minus points log history for ${currentPreviewStaff.name}.`
                                                : 'Manage plus and minus points logs for all staff members.'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        {!currentPreviewStaff && renderEntriesPerPageSelector()}
                                        {currentPreviewStaff && (
                                            <button
                                                onClick={() => setSelectedPreviewStaff(null)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    background: '#f1f5f9', color: '#475569', border: 'none',
                                                    borderRadius: '12px', padding: '9px 16px', fontSize: '0.8rem',
                                                    fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
                                                }}
                                            >
                                                <ChevronLeft size={16} /> Back to Staff List
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openAddPointsModal(currentPreviewStaff ? currentPreviewStaff._id : '', 'minus')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '7px',
                                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                                                border: 'none', borderRadius: '12px', padding: '9px 18px',
                                                fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                            }}
                                        >
                                            <Plus size={15} /> Add Points
                                        </button>
                                    </div>
                                </div>

                                {/* View 1: Default Staff List View */}
                                {!currentPreviewStaff ? (
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                        <th style={{ padding: '14px 16px', width: '40px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={paginatedDisplayList.length > 0 && paginatedDisplayList.every(s => selectedIds.has(s._id))}
                                                                onChange={() => {
                                                                    const pageIds = paginatedDisplayList.map(s => s._id);
                                                                    const allSelected = pageIds.every(id => selectedIds.has(id));
                                                                    setSelectedIds(prev => {
                                                                        const next = new Set(prev);
                                                                        if (allSelected) { pageIds.forEach(id => next.delete(id)); }
                                                                        else { pageIds.forEach(id => next.add(id)); }
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                            />
                                                        </th>
                                                        <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                                                        <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Staff Name</th>
                                                        <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Role / Designation</th>
                                                        <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Institute</th>
                                                        <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Plus Points</th>
                                                        <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Minus Points</th>
                                                        <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedDisplayList.length === 0 ? (
                                                        <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No staff found</td></tr>
                                                    ) : paginatedDisplayList.map((staff, idx) => {
                                                        const getStaffPointsSum = (type) => {
                                                            if (!pointsLogs || !Array.isArray(pointsLogs)) return 0;
                                                            return pointsLogs
                                                                .filter(l => (l.staffId === staff._id || l.staffName === staff.name) && l.type === type)
                                                                .reduce((sum, l) => sum + (Number(l.points) || 1), 0);
                                                        };
                                                        const plusCount = getStaffPointsSum('plus');
                                                        const minusCount = getStaffPointsSum('minus');

                                                        return (
                                                            <tr key={staff._id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                                <td style={{ padding: '14px 16px', width: '40px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedIds.has(staff._id)}
                                                                        onChange={() => {
                                                                            setSelectedIds(prev => {
                                                                                const next = new Set(prev);
                                                                                if (next.has(staff._id)) { next.delete(staff._id); }
                                                                                else { next.add(staff._id); }
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                                                <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{staff.name}</td>
                                                                <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>{staff.role || 'Staff'}</td>
                                                                <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                                                                    {staff.instituteName || staff.institute?.name || 'All Institutes'}
                                                                </td>
                                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 900 }}>
                                                                        +{plusCount}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                    <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 900 }}>
                                                                        -{minusCount}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <button
                                                                            onClick={() => setSelectedPreviewStaff(staff)}
                                                                            style={{
                                                                                background: '#e0e7ff', color: '#4338ca', border: 'none',
                                                                                borderRadius: '8px', padding: '6px 14px', fontSize: '0.72rem',
                                                                                fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                                            }}
                                                                        >
                                                                            <Eye size={12} /> Preview Valuation
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openAddPointsModal(staff._id, 'minus')}
                                                                            title="Add Valuation for this Staff"
                                                                            style={{
                                                                                background: '#dcfce7', color: '#15803d', border: 'none',
                                                                                borderRadius: '8px', padding: '6px 10px', fontSize: '0.72rem',
                                                                                fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                                            }}
                                                                        >
                                                                            <Plus size={12} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {renderPaginationFooter(displayList.length, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage)}
                                    </div>
                                ) : (
                                    // View 2: Detailed Plus/Minus Tables for Selected Staff
                                    <div>

                                        {/* Unified Points Filter Toolbar */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            flexWrap: 'wrap',
                                            background: '#f8fafc',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            marginBottom: '20px'
                                        }}>
                                            {/* Date Filter */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>Date:</span>
                                                <select
                                                    value={pointsDateFilter}
                                                    onChange={e => setPointsDateFilter(e.target.value)}
                                                    style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 700, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                                >
                                                    <option value="today">Today</option>
                                                    <option value="month">This Month</option>
                                                    <option value="particular">Particular Date</option>
                                                    <option value="range">Date Range</option>
                                                    <option value="year">Complete Year</option>
                                                </select>
                                            </div>

                                            {pointsDateFilter === 'particular' && (
                                                <input type="date" value={pointsParticularDate} onChange={e => setPointsParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                            )}
                                            {pointsDateFilter === 'range' && (
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <input type="date" value={pointsStartDate} onChange={e => setPointsStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>to</span>
                                                    <input type="date" value={pointsEndDate} onChange={e => setPointsEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                                </div>
                                            )}
                                        </div>

                                        {(() => {
                                            const filterPointsLog = (log) => {
                                                const logDate = log.date || new Date().toISOString().split('T')[0];
                                                const todayStr = new Date().toISOString().split('T')[0];

                                                if (pointsDateFilter === 'today') {
                                                    return logDate === todayStr;
                                                }
                                                if (pointsDateFilter === 'month') {
                                                    const currentMonthStr = todayStr.substring(0, 7);
                                                    return logDate.startsWith(currentMonthStr);
                                                }
                                                if (pointsDateFilter === 'range') {
                                                    if (!pointsStartDate || !pointsEndDate) return true;
                                                    return logDate >= pointsStartDate && logDate <= pointsEndDate;
                                                }
                                                if (pointsDateFilter === 'particular') {
                                                    if (!pointsParticularDate) return true;
                                                    return logDate === pointsParticularDate;
                                                }
                                                if (pointsDateFilter === 'year') {
                                                    return true;
                                                }
                                                return true;
                                            };

                                            const plusLogsFiltered = pointsLogs.filter(l => l.staffId === currentPreviewStaff._id && l.type === 'plus' && filterPointsLog(l));
                                            const minusLogsFiltered = pointsLogs.filter(l => l.staffId === currentPreviewStaff._id && l.type === 'minus' && filterPointsLog(l));

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                                    {/* Left: Plus Valuation Table */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                            <Award size={18} style={{ color: '#16a34a' }} />
                                                            <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                Plus Valuation Log
                                                                <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '12px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800 }}>
                                                                    {plusLogsFiltered.length}
                                                                </span>
                                                            </h4>
                                                        </div>

                                                        {plusLogsFiltered.length === 0 ? (
                                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 650 }}>
                                                                No plus valuation logs match this filter.
                                                            </div>
                                                        ) : (
                                                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                                    <thead>
                                                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date</th>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Task / Reason</th>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Valuation</th>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {plusLogsFiltered.map((log, idx) => (
                                                                            <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                                                <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                                    📅 {new Date(log.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                                </td>
                                                                                <td style={{ padding: '12px 14px' }}>
                                                                                    {log.taskTitle && (
                                                                                        <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 800, marginBottom: '2px' }}>📋 Task: {log.taskTitle}</div>
                                                                                    )}
                                                                                    <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 650 }}>{log.reason}</div>
                                                                                </td>
                                                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                                    <span style={{
                                                                                        background: '#dcfce7',
                                                                                        color: '#15803d',
                                                                                        borderRadius: '8px',
                                                                                        padding: '4px 10px',
                                                                                        fontSize: '0.75rem',
                                                                                        fontWeight: 800
                                                                                    }}>
                                                                                        +{log.points}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => openEditPointsModal(log)}
                                                                                            title="Edit Log"
                                                                                            style={{ padding: '6px', border: 'none', background: '#dbeafe', borderRadius: '8px', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                        >
                                                                                            <Pencil size={12} />
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleDeletePointsLog(log.id)}
                                                                                            title="Delete entry"
                                                                                            style={{ padding: '6px', border: 'none', background: '#fee2e2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                        >
                                                                                            <Trash2 size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right: Minus Points Table */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                                            <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                Minus Valuation Log
                                                                <span style={{ background: '#fee2e2', color: '#ef4444', borderRadius: '12px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800 }}>
                                                                    {minusLogsFiltered.length}
                                                                </span>
                                                            </h4>
                                                        </div>

                                                        {minusLogsFiltered.length === 0 ? (
                                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 650 }}>
                                                                No minus valuation logs match this filter.
                                                            </div>
                                                        ) : (
                                                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                                    <thead>
                                                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date</th>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Task / Reason</th>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Valuation</th>
                                                                            <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {minusLogsFiltered.map((log, idx) => (
                                                                            <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                                                <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                                    📅 {new Date(log.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                                </td>
                                                                                <td style={{ padding: '12px 14px' }}>
                                                                                    {log.taskTitle && (
                                                                                        <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 800, marginBottom: '2px' }}>📋 Task: {log.taskTitle}</div>
                                                                                    )}
                                                                                    <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 650 }}>{log.reason}</div>
                                                                                </td>
                                                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                                    <span style={{
                                                                                        background: '#fee2e2',
                                                                                        color: '#ef4444',
                                                                                        borderRadius: '8px',
                                                                                        padding: '4px 10px',
                                                                                        fontSize: '0.75rem',
                                                                                        fontWeight: 800
                                                                                    }}>
                                                                                        -{log.points}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => openEditPointsModal(log)}
                                                                                            title="Edit Log"
                                                                                            style={{ padding: '6px', border: 'none', background: '#dbeafe', borderRadius: '8px', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                        >
                                                                                            <Pencil size={12} />
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleDeletePointsLog(log.id)}
                                                                                            title="Delete entry"
                                                                                            style={{ padding: '6px', border: 'none', background: '#fee2e2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                        >
                                                                                            <Trash2 size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                </div>
            </DashboardLayout>
            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                role="Teacher"
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    fetchStaffData();
                }}
            />
            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setSelectedStaff(null); }}
                user={selectedStaff}
                onSuccess={() => {
                    fetchStaffData();
                }}
            />
            {selectedStaffForDetails && (
                <StaffSalaryDetailsModal
                    staff={selectedStaffForDetails}
                    onClose={() => setSelectedStaffForDetails(null)}
                />
            )}
            <BulkEditModal
                isOpen={isBulkEditOpen}
                onClose={() => setIsBulkEditOpen(false)}
                type="staff"
                selectedIds={Array.from(selectedIds)}
                onSuccess={async () => {
                    await fetchStaffData();
                }}
            />
            {showPointsModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '1050px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: '0 auto', position: 'relative', border: '1px solid #e2e8f0' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
                                    {editingLogId ? 'Edit Valuation Entry' : 'Record Plus/Minus Valuation'}
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                                    {editingLogId ? 'Update the details of this valuation log entry.' : 'You can add multiple rows to record multiple valuation entries for the selected staff member at once.'}
                                </p>
                            </div>
                            <button onClick={() => setShowPointsModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={18} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePointsLog} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Top Controls: Select Staff & Points Type */}
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>

                                {/* 1. Select Staff */}
                                <div style={{ flex: 1, minWidth: '240px', maxWidth: '320px' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Select Staff Member *</label>
                                    <select
                                        value={pointsStaff}
                                        disabled={isPointsStaffPreselected}
                                        onChange={e => setPointsStaff(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: isPointsStaffPreselected ? '#f1f5f9' : '#fff', cursor: isPointsStaffPreselected ? 'not-allowed' : 'pointer' }}
                                    >
                                        <option value="">-- Choose Staff member --</option>
                                        {staffList.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} ({s.role || 'Staff'})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. Valuation Type Switch */}
                                <div style={{ flex: 1, minWidth: '240px', maxWidth: '320px' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Valuation Type *</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            disabled={editingLogId !== null}
                                            onClick={() => setPointsType('plus')}
                                            style={{
                                                flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #86efac',
                                                background: pointsType === 'plus' ? '#f0fdf4' : '#fff',
                                                color: '#16a34a', fontSize: '0.8rem', fontWeight: 800, cursor: editingLogId ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                opacity: editingLogId && pointsType !== 'plus' ? 0.5 : 1
                                            }}
                                        >
                                            <Award size={15} /> Plus Valuation
                                        </button>
                                        <button
                                            type="button"
                                            disabled={editingLogId !== null}
                                            onClick={() => setPointsType('minus')}
                                            style={{
                                                flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #fca5a5',
                                                background: pointsType === 'minus' ? '#fff5f5' : '#fff',
                                                color: '#ef4444', fontSize: '0.8rem', fontWeight: 800, cursor: editingLogId ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                opacity: editingLogId && pointsType !== 'minus' ? 0.5 : 1
                                            }}
                                        >
                                            <AlertTriangle size={15} /> Minus Valuation
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Table Rows */}
                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '50px' }}>#</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '220px' }}>Task Title (Optional)</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Description / Reason *</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '130px' }}>Valuation *</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '160px' }}>Date</th>
                                            {!editingLogId && (
                                                <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', textAlign: 'center', width: '80px' }}>Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pointsModalRows.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>{idx + 1}</td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Design Dashboard"
                                                        value={row.title}
                                                        onChange={e => handlePointsRowChange(idx, 'title', e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Reason or explanation..."
                                                        value={row.description}
                                                        onChange={e => handlePointsRowChange(idx, 'description', e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="e.g. 5"
                                                        value={row.valuation}
                                                        onChange={e => handlePointsRowChange(idx, 'valuation', e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <input
                                                        type="date"
                                                        value={row.date}
                                                        onChange={e => handlePointsRowChange(idx, 'date', e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                                                    />
                                                </td>
                                                {!editingLogId && (
                                                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePointsRow(idx)}
                                                            disabled={pointsModalRows.length <= 1}
                                                            style={{ padding: '8px', border: 'none', background: pointsModalRows.length <= 1 ? '#f8fafc' : '#fee2e2', borderRadius: '10px', color: pointsModalRows.length <= 1 ? '#cbd5e1' : '#ef4444', cursor: pointsModalRows.length <= 1 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add Row Button */}
                            {!editingLogId && (
                                <button
                                    type="button"
                                    onClick={addPointsRow}
                                    style={{
                                        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px',
                                        background: '#fff', border: '1.5px dashed #cbd5e1', borderRadius: '12px',
                                        padding: '8px 16px', fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <Plus size={14} /> Add Row
                                </button>
                            )}

                            {/* Footer Controls */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowPointsModal(false)}
                                    style={{
                                        padding: '10px 24px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                                        background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingPoints}
                                    style={{
                                        padding: '10px 24px', borderRadius: '12px', border: 'none',
                                        background: pointsType === 'plus' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#b91c1c)',
                                        color: '#fff', fontSize: '0.8rem', fontWeight: 900,
                                        cursor: submittingPoints ? 'not-allowed' : 'pointer', opacity: submittingPoints ? 0.7 : 1,
                                        boxShadow: pointsType === 'plus' ? '0 4px 12px rgba(16,185,129,0.2)' : '0 4px 12px rgba(239,68,68,0.2)'
                                    }}
                                >
                                    {submittingPoints ? 'Saving...' : editingLogId ? 'Save Changes' : 'Record Points'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            {viewAttendanceStaff && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '1000px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: '0 auto', position: 'relative', border: '1px solid #e2e8f0' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 900 }}>
                                    {viewAttendanceStaff.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{viewAttendanceStaff.name}</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{viewAttendanceStaff.email} • <span style={{ color: '#4f46e5', fontWeight: 800 }}>{viewAttendanceStaff.role}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setViewAttendanceStaff(null)} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Attendance History Stats */}
                        {(() => {
                            const logs = viewAttendanceStaff.staffProfile?.physicalAttendance || viewAttendanceStaff.teacherProfile?.physicalAttendance || viewAttendanceStaff.studentProfile?.physicalAttendance || [];
                            const presentCount = logs.filter(l => l.status === 'Present').length;
                            const absentCount = logs.filter(l => l.status === 'Absent').length;
                            const leaveCount = logs.filter(l => l.status === 'Leave').length;
                            const holidayCount = logs.filter(l => l.status === 'Holiday').length;

                            return (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Days Recorded</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{logs.length}</div>
                                        </div>
                                        <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '14px', border: '1px solid #a7f3d0' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>Present</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>{presentCount}</div>
                                        </div>
                                        <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '14px', border: '1px solid #fecaca' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase' }}>Absent</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b91c1c', marginTop: '4px' }}>{absentCount}</div>
                                        </div>
                                        <div style={{ background: '#fffbeb', padding: '14px', borderRadius: '14px', border: '1px solid #fde68a' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase' }}>Leave</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>{leaveCount}</div>
                                        </div>
                                        <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase' }}>Holiday</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1d4ed8', marginTop: '4px' }}>{holidayCount}</div>
                                        </div>
                                    </div>

                                    {/* History Table */}
                                    <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Full Attendance History Logs</h4>
                                    {logs.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem' }}>
                                            No attendance records found for this staff member.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        {['Date', 'Status', 'Attendance Type', 'Marked By', 'Admin Note', 'Staff Note', 'Check-In', 'Check-Out', 'Time Spent'].map(th => (
                                                            <th key={th} style={{ padding: '10px 12px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{th}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {logs.map((log, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                                📅 {log.date}
                                                            </td>
                                                            <td style={{ padding: '10px 12px' }}>
                                                                {renderStatusBadge(log.status)}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                                                                {log.source || 'Physical'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                                                                {log.markedBy || 'Admin'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#64748b' }}>
                                                                {log.teacherNote || log.note || '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#64748b' }}>
                                                                {log.studentNote || log.leaveNote || '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#64748b' }}>
                                                                {log.checkInTime || '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#64748b' }}>
                                                                {log.checkOutTime || '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                                                {calculateSpendingTime(log.checkInTime, log.checkOutTime)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}
            {showAddTaskModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setShowAddTaskModal(false)}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', border: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                    <CheckSquare size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Assign New Task</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Assign a task to a staff member</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddTaskModal(false)} style={{ background: '#f1f5f9', border: 'none', width: 34, height: 34, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={(e) => {
                            handleAddTask(e);
                            setShowAddTaskModal(false);
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Staff Select */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Staff Member *</label>
                                <select
                                    required
                                    value={newTask.staffName}
                                    onChange={e => setNewTask(p => ({ ...p, staffName: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer', background: '#f8fafc' }}
                                >
                                    <option value="">Select Staff</option>
                                    {staffList.map(s => <option key={s._id} value={s.name}>{s.name} ({s.role})</option>)}
                                </select>
                            </div>

                            {/* Task Title */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Task Title *</label>
                                <input
                                    required
                                    type="text"
                                    value={newTask.title}
                                    onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Enter task title..."
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                                />
                            </div>

                            {/* Due Date & Priority */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Due Date *</label>
                                    <input
                                        required
                                        type="date"
                                        value={newTask.due}
                                        onChange={e => setNewTask(p => ({ ...p, due: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer', background: '#f8fafc' }}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
                                >
                                    <Plus size={18} /> Assign Task
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddTaskModal(false)}
                                    style={{ padding: '12px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            {viewTaskStaffRecord && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '1000px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: '0 auto', position: 'relative', border: '1px solid #e2e8f0' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 900 }}>
                                    {viewTaskStaffRecord.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{viewTaskStaffRecord.name} — Task History Record</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{viewTaskStaffRecord.email || 'Staff Member'} • <span style={{ color: '#4f46e5', fontWeight: 800 }}>{viewTaskStaffRecord.role || 'Staff'}</span></p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Calendar Date Picker */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '14px' }}>
                                    <Calendar size={16} style={{ color: '#4f46e5' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Date:</span>
                                    <input
                                        type="date"
                                        value={historyDateFilter}
                                        onChange={e => setHistoryDateFilter(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                                    />
                                    {historyDateFilter && (
                                        <button
                                            onClick={() => setHistoryDateFilter('')}
                                            title="Clear date filter"
                                            style={{ background: '#fee2e2', border: 'none', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                <button onClick={() => { setViewTaskStaffRecord(null); setHistoryDateFilter(''); }} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Task History Stats & Table */}
                        {(() => {
                            let staffTasksList = tasks.filter(t => t.staffId === viewTaskStaffRecord._id || t.staffName === viewTaskStaffRecord.name);

                            if (historyDateFilter) {
                                staffTasksList = staffTasksList.filter(t => {
                                    const formatD = (d) => {
                                        if (!d) return '';
                                        try { return new Date(d).toISOString().split('T')[0]; } catch (e) { return d; }
                                    };
                                    const dueStr = formatD(t.due);
                                    const createdStr = formatD(t.createdAt);
                                    const assignedStr = formatD(t.assignedDate || t.date);
                                    return dueStr === historyDateFilter || createdStr === historyDateFilter || assignedStr === historyDateFilter;
                                });
                            }

                            const doneCount = staffTasksList.filter(t => t.status === 'done').length;
                            const inProgressCount = staffTasksList.filter(t => t.status === 'inprogress').length;
                            const pendingCount = staffTasksList.filter(t => t.status === 'pending').length;
                            const selfCount = staffTasksList.filter(t => t.isSelfCreated || t.source === 'Self').length;

                            return (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Tasks Assigned</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{staffTasksList.length}</div>
                                        </div>
                                        <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '14px', border: '1px solid #a7f3d0' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>Done / Completed</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>{doneCount}</div>
                                        </div>
                                        <div style={{ background: '#fffbeb', padding: '14px', borderRadius: '14px', border: '1px solid #fde68a' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase' }}>In Progress</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>{inProgressCount}</div>
                                        </div>
                                        <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '14px', border: '1px solid #fecaca' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase' }}>Pending</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b91c1c', marginTop: '4px' }}>{pendingCount}</div>
                                        </div>
                                        <div style={{ background: '#eef2ff', padding: '14px', borderRadius: '14px', border: '1px solid #c7d2fe' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#4338ca', fontWeight: 800, textTransform: 'uppercase' }}>Self Created Tasks</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#3730a3', marginTop: '4px' }}>{selfCount}</div>
                                        </div>
                                    </div>

                                    {/* Task Table */}
                                    <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>All Task Logs & Verification History</h4>
                                    {staffTasksList.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem' }}>
                                            No task assignment records found for this staff member.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        {['Task Title & Description', 'Self Created', 'Due Date', 'Priority', 'Status', 'Evidence File', 'Verification'].map(th => (
                                                            <th key={th} style={{ padding: '10px 12px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{th}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {staffTasksList.map((task, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                                                                <div>{task.title}</div>
                                                                {task.description && <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{task.description}</div>}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                                                                {task.isSelfCreated || task.source === 'Self' ? 'Yes (Self)' : 'No (Admin)'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                                                                {task.due ? new Date(task.due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px' }}>
                                                                <span style={{ background: task.priority === 'High' ? '#fee2e2' : task.priority === 'Medium' ? '#fffbeb' : '#dcfce7', color: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#d97706' : '#16a34a', fontSize: '0.68rem', fontWeight: 900, padding: '2px 8px', borderRadius: '12px' }}>
                                                                    {task.priority}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 12px' }}>
                                                                <span style={{ background: task.status === 'done' ? '#dcfce7' : task.status === 'inprogress' ? '#fffbeb' : '#fee2e2', color: task.status === 'done' ? '#16a34a' : task.status === 'inprogress' ? '#d97706' : '#ef4444', borderRadius: '999px', padding: '3px 10px', fontSize: '0.68rem', fontWeight: 900 }}>
                                                                    {task.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem' }}>
                                                                {task.evidenceFile ? (
                                                                    <a href={task.evidenceFile} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontWeight: 800, textDecoration: 'underline' }}>
                                                                        📎 View Evidence
                                                                    </a>
                                                                ) : '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '0.75rem' }}>
                                                                <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 900, background: (task.verificationStatus || 'Verified') === 'Verified' ? '#ecfdf5' : '#fffbeb', color: (task.verificationStatus || 'Verified') === 'Verified' ? '#047857' : '#b45309' }}>
                                                                    {task.verificationStatus || (task.status === 'done' ? 'Verified' : 'Pending')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

const StaffSalaryDetailsModal = ({ staff, onClose }) => {
    if (!staff) return null;
    const designation = staff.staffProfile?.designation || staff.teacherProfile ? 'Teacher' : '—';
    const department = staff.staffProfile?.department || '—';
    const salary = staff.staffProfile?.salary || 25000;
    const institute = staff.instituteName || staff.institute?.name || 'All Institutes';
    const formatNumber = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
    const history = [
        { id: '1', month: 'June 2026', date: '2026-06-30', amount: salary, mode: 'Bank Transfer', status: 'Paid', receiptNo: `PAY-2026-06-${staff._id?.slice(-4) || '1021'}` },
        { id: '2', month: 'May 2026', date: '2026-05-31', amount: salary, mode: 'Bank Transfer', status: 'Paid', receiptNo: `PAY-2026-05-${staff._id?.slice(-4) || '1021'}` },
        { id: '3', month: 'April 2026', date: '2026-04-30', amount: salary, mode: 'Bank Transfer', status: 'Paid', receiptNo: `PAY-2026-04-${staff._id?.slice(-4) || '1021'}` }
    ];
    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '720px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', color: '#94a3b8', background: '#f8fafc', border: 'none', borderRadius: '999px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Salary & Transaction Details</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', backgroundColor: '#f8fafc' }}>
                            <div style={{ width: '70px', height: '70px', borderRadius: '999px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', fontWeight: 950 }}>{staff.name?.[0]?.toUpperCase() || '?'}</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{staff.name}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{staff.email}</p>
                            </div>
                            <span style={{ background: '#eef2ff', color: '#4f46e5', borderRadius: '999px', padding: '4px 12px', fontSize: '0.68rem', fontWeight: 900 }}>{staff.role}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[['Designation', designation], ['Department', department], ['Monthly Salary', formatNumber(salary) + ' / month'], ['Institute', institute]].map(([label, val]) => (
                                <div key={label} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginTop: '4px' }}>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {['Payout ID', 'For Month', 'Paid Date', 'Amount', 'Method', 'Status'].map(h => <th key={h} style={{ padding: '10px 16px' }}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(rec => (
                                    <tr key={rec.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#334155' }}>{rec.receiptNo}</td>
                                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 700 }}>{rec.month}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 800 }}>{formatNumber(rec.amount)}</td>
                                        <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>{rec.mode}</td>
                                        <td style={{ padding: '12px 16px' }}><span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '999px', padding: '3px 10px', fontSize: '0.62rem', fontWeight: 900 }}>{rec.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StaffList;


