import * as XLSX from 'xlsx';
import { useRef,  useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Download,  Upload, 
    Users, Search, Building, Mail, Briefcase, Calendar,
    DollarSign, CheckSquare, Plus, Check, Clock, AlertCircle, Trash2, Edit, Filter, ChevronDown, Eye, Bell, CheckCircle,
    Award, AlertTriangle, ChevronLeft
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';

const calculateSpendingTime = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '—';
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
    
    if (startMins === null || endMins === null) return '—';
    
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

    // Points / Valuation Management states (Read-only on Admin side)
    const [pointsLogs, setPointsLogs] = useState(() => {
        const stored = localStorage.getItem('staff_points') || localStorage.getItem('staff_minus_points');
        return stored ? JSON.parse(stored) : [];
    });
    const [selectedPreviewStaff, setSelectedPreviewStaff] = useState(null);
    const [pointsDateFilter, setPointsDateFilter] = useState('year');
    const [pointsParticularDate, setPointsParticularDate] = useState('');
    const [pointsStartDate, setPointsStartDate] = useState('');
    const [pointsEndDate, setPointsEndDate] = useState('');

    // Sub-modules state
    const [tasks, setTasks] = useState([
        { id: 1, staffName: 'Ravi Kumar', title: 'Compile Fee Report', due: '2026-07-12', priority: 'High', status: 'pending', createdAt: '2026-07-10', verificationStatus: 'under_verification' },
        { id: 2, staffName: 'Sunita Sharma', title: 'Setup IT Lab computers', due: '2026-07-15', priority: 'Medium', status: 'inprogress', createdAt: '2026-07-11', verificationStatus: '' },
        { id: 3, staffName: 'Mohit Verma', title: 'Clean general lobby area', due: '2026-07-13', priority: 'Low', status: 'done', createdAt: '2026-07-12', verificationStatus: 'approved' },
        { id: 4, staffName: 'Priya Singh', title: 'Update visitor log book', due: '2026-07-14', priority: 'Medium', status: 'done', createdAt: '2026-07-12', verificationStatus: 'needs_revision' },
        { id: 5, staffName: 'Ravi Kumar', title: 'Audit desk registers', due: '2026-07-18', priority: 'High', status: 'inprogress', createdAt: '2026-07-13', verificationStatus: '' },
        { id: 6, staffName: 'Sunita Sharma', title: 'Update system software', due: '2026-07-20', priority: 'Low', status: 'done', createdAt: '2026-07-12', verificationStatus: 'approved', isSelfCreated: true }
    ]);
    const [taskDateFilter, setTaskDateFilter] = useState('year');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterParticularDate, setFilterParticularDate] = useState('');
    const [taskVerificationFilter, setTaskVerificationFilter] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState('');
    const [selectedStaffForTasks, setSelectedStaffForTasks] = useState(null);

    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [submittingAttendance, setSubmittingAttendance] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editRecord, setEditRecord] = useState({ status: '', checkInTime: '', checkOutTime: '' });

    const [salaryPayouts, setSalaryPayouts] = useState({
        'Ravi Kumar': 'Paid',
        'Sunita Sharma': 'Pending',
        'Mohit Verma': 'Paid',
        'Priya Singh': 'Pending'
    });

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const [staffRes, instsRes] = await Promise.all([
                    axios.get('/api/users?role=Staff', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/setup/institutes')
                ]);
                setStaffList(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.users || []);
                setInstitutes(instsRes.data);
            } catch {
                setStaffList([]);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
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

    useEffect(() => {
        setEditingId(null);
    }, [attendanceDate, activeTab]);

    useEffect(() => {
        if (!staffList.length) return;
        const init = {};
        staffList.forEach(s => {
            const existing = s.staffProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id] = {
                status: existing ? (existing.status || 'Present') : '',
                note: existing?.teacherNote || '',
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
            checkInTime: currentRecord.checkInTime || '',
            checkOutTime: currentRecord.checkOutTime || ''
        });
    };

    const handleSaveSingleAttendance = async (staffId) => {
        try {
            setSubmittingAttendance(true);
            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: [{
                    studentId: staffId,
                    status: editRecord.status,
                    checkInTime: editRecord.checkInTime || '',
                    checkOutTime: editRecord.checkOutTime || '',
                    note: ''
                }]
            });
            toast.success('Attendance updated successfully!');
            setEditingId(null);
            
            const token = localStorage.getItem('authToken');
            const res = await axios.get('/api/users?role=Staff', { headers: { Authorization: `Bearer ${token}` } });
            setStaffList(Array.isArray(res.data) ? res.data : res.data.users || []);
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
                note: data.note || '',
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || '',
            }));

            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: recordsToSave
            });
            
            toast.success(`Staff attendance saved for ${attendanceDate}!`);
            const token = localStorage.getItem('authToken');
            const res = await axios.get('/api/users?role=Staff', { headers: { Authorization: `Bearer ${token}` } });
            setStaffList(Array.isArray(res.data) ? res.data : res.data.users || []);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmittingAttendance(false);
        }
    };

    const handleAttendanceStatusChange = (staffId, status) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [staffId]: {
                ...(prev[staffId] || { note: '', checkInTime: '', checkOutTime: '' }),
                status
            }
        }));
    };

    const filtered = staffList.filter(s =>
        (filterInstitute === 'All' || (s.institute?._id === filterInstitute || s.institute === filterInstitute)) &&
        (s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.staffProfile?.designation?.toLowerCase().includes(search.toLowerCase()))
    );

    const displayList = filtered.length > 0 ? filtered : (search ? [] : DUMMY_STAFF.filter(s => {
        if (filterInstitute === 'All') return true;
        const selectedInst = institutes.find(i => i._id === filterInstitute);
        if (selectedInst) {
            return s.instituteName === selectedInst.name;
        }
        return true;
    }));

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
        <DashboardLayout role="Admin" fullWidth={true}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                                <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
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
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                                >
                                    <Upload size={16} /> Import
                                </button>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                        className="px-4 py-2 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
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
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 20px', background: '#4f46e5', color: '#fff',
                                        border: 'none', borderRadius: '12px', fontSize: '0.82rem',
                                        fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s ease',
                                        boxShadow: '0 4px 12px rgba(79,70,229,0.25)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
                                >
                                    <Plus size={16} /> Add New Staff
                                </button>
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
                                            {['#', 'Name', 'Designation', 'Department', 'Institute', 'Minus Valuation', 'Status', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '13px 16px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayList.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                                                    No staff found
                                                </td>
                                            </tr>
                                        ) : displayList.map((s, i) => (
                                            <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</td>
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
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Briefcase size={12} style={{ color: '#94a3b8' }} />
                                                        {s.staffProfile?.designation || '—'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{s.staffProfile?.department || '—'}</td>
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Building size={12} style={{ color: '#94a3b8' }} />
                                                        {s.instituteName || s.institute?.name || 'All Institutes'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 800, color: s.staffProfile?.minusPoints > 0 ? '#ef4444' : '#64748b' }}>
                                                    {s.staffProfile?.minusPoints !== undefined ? s.staffProfile.minusPoints : 0}
                                                </td>
                                                <td style={{ padding: '13px 16px' }}>
                                                     <button
                                                         type="button"
                                                         onClick={() => handleToggleStatus(s._id, s.isActive)}
                                                         className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                             s.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                         }`}
                                                         title={s.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                                     >
                                                         <span className="sr-only">Toggle status</span>
                                                         <span
                                                             className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                 s.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                                             }`}
                                                         />
                                                     </button>
                                                </td>
                                                <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>Attendance Date:</span>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="date"
                                        value={attendanceDate}
                                        onChange={e => setAttendanceDate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                        style={{
                                            paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                                            border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.8rem',
                                            fontWeight: 700, color: '#374151', background: '#fff', outline: 'none',
                                            fontFamily: 'inherit', cursor: 'pointer'
                                        }}
                                    />
                            </div>
                        </div>
                    </div>

                        {/* Staff Attendance Grid/List */}
                        <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        {['Staff Name', 'Designation & Department', 'Institute', 'Attendance Status', 'Check-In / Out', 'Time'].map(h => {
                                            const widths = {
                                                'Staff Name': '26%',
                                                'Designation & Department': '22%',
                                                'Institute': '20%',
                                                'Attendance Status': '14%',
                                                'Check-In / Out': '12%',
                                                'Time': '6%'
                                            };
                                            return (
                                                <th key={h} style={{ width: widths[h] || 'auto', padding: '14px 18px', textAlign: h.includes('Status') || h.includes('Time') || h.includes('Out') ? 'center' : 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    {h}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                                                No staff found
                                            </td>
                                        </tr>
                                    ) : filtered.map((s) => {
                                        const record = attendanceRecords[s._id] || { status: '', checkInTime: '', checkOutTime: '' };
                                        return (
                                            <tr key={s._id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}>
                                                <td style={{ padding: '14px 18px', overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#fff', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0
                                                        }}>
                                                            {s.name?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>{s.name}</span>
                                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.email}>{s.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 18px', overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.staffProfile?.designation || '—'}>{s.staffProfile?.designation || '—'}</span>
                                                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.staffProfile?.department || '—'}>{s.staffProfile?.department || '—'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 650, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.instituteName || s.institute?.name || 'All Institutes'}>
                                                    {s.instituteName || s.institute?.name || 'All Institutes'}
                                                </td>
                                                <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                                    {renderStatusBadge(record.status)}
                                                </td>
                                                <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>
                                                        {record.checkInTime || record.checkOutTime ? (
                                                            `${record.checkInTime || '—'} to ${record.checkOutTime || '—'}`
                                                        ) : '—'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                                                    {calculateSpendingTime(record.checkInTime, record.checkOutTime)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'salary' && (
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Salary Processing (July 2026)</h3>
                                {user?.role === 'Admin' && (
                                    <div style={{ position: 'relative', width: 200 }}>
                                        <Filter size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <select
                                            value={filterInstitute}
                                            onChange={(e) => setFilterInstitute(e.target.value)}
                                            style={{
                                                width: '100%', paddingLeft: 32, paddingRight: 24, paddingTop: 8, paddingBottom: 8,
                                                border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.8rem',
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
                        </div>
                        
                        <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '14px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        {['Name', 'Designation & Department', 'Institute', 'Salary', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '13px 16px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayList.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                                                No staff found
                                            </td>
                                        </tr>
                                    ) : displayList.map((s, i) => {
                                        const status = salaryPayouts[s.name] || 'Pending';
                                        const designation = s.staffProfile?.designation || '—';
                                        const department = s.staffProfile?.department || '—';
                                        const salary = s.staffProfile?.salary ? `₹${Number(s.staffProfile.salary).toLocaleString('en-IN')} / month` : '₹25,000 / month';
                                        const institute = s.instituteName || s.institute?.name || 'All Institutes';

                                        return (
                                            <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
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
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Briefcase size={12} style={{ color: '#94a3b8' }} />
                                                        {designation} / {department}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Building size={12} style={{ color: '#94a3b8' }} />
                                                        {institute}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                                                    {salary}
                                                </td>
                                                <td style={{ padding: '13px 16px' }}>
                                                    <span style={{
                                                        background: status === 'Paid' ? '#dcfce7' : '#fffbeb',
                                                        color: status === 'Paid' ? '#16a34a' : '#d97706',
                                                        borderRadius: '999px', padding: '4px 12px',
                                                        fontSize: '0.68rem', fontWeight: 900
                                                    }}>{status}</span>
                                                </td>
                                                <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setSelectedStaffForDetails(s)}
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
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'task' && (
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Task Assignments</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Monitor tasks assigned to staff members with priorities, completion logs, and verification statuses.</p>
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
                        {displayList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                👥 No staff members found.
                            </div>
                        ) : (
                            <div style={{ borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            <th style={{ padding: '14px 20px', width: '80px' }}>Sr No.</th>
                                            <th style={{ padding: '14px 20px' }}>Staff Name</th>
                                            <th style={{ padding: '14px 20px' }}>Institute</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center' }}>Assigned Tasks</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center' }}>Not Assigned Tasks</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', width: '100px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '0.75rem' }}>
                                        {displayList.map((s, idx) => {
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
                                                return true;
                                            });

                                            const assignedTasks = filteredStaffTasks.filter(t =>
                                                !t.isSelfCreated &&
                                                (taskVerificationFilter === '' || (t.verificationStatus || '') === taskVerificationFilter) &&
                                                (taskStatusFilter === '' || (t.status || 'pending') === taskStatusFilter)
                                            );
                                            const assPending = assignedTasks.filter(t => t.status === 'pending' || !t.status || t.status === 'Pending').length;
                                            const assInprogress = assignedTasks.filter(t => t.status === 'inprogress' || t.status === 'In Progress').length;
                                            const assCompleted = assignedTasks.filter(t => t.status === 'done' || t.status === 'Completed').length;

                                            const selfTasks = filteredStaffTasks.filter(t =>
                                                t.isSelfCreated &&
                                                (taskVerificationFilter === '' || (t.verificationStatus || '') === taskVerificationFilter) &&
                                                (taskStatusFilter === '' || (t.status || 'pending') === taskStatusFilter)
                                            );
                                            const selfCompleted = selfTasks.length;
                                            const institute = s.instituteName || s.institute?.name || 'All Institutes';

                                            return (
                                                <tr key={s._id || s.name} style={{ borderBottom: '1px solid #f1f5f9' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '14px 20px', fontWeight: 800, color: '#94a3b8' }}>{idx + 1}</td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'linear-gradient(135deg,#e0e7ff,#eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 900 }}>
                                                                {s.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#64748b', fontWeight: 600 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Building size={12} style={{ color: '#94a3b8' }} />
                                                            {institute}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
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
                                                    <td style={{ padding: '14px 20px' }}>
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
                                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => setSelectedStaffForTasks(s)}
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

                {activeTab === 'minusPoints' && (() => {
                    const currentPreviewStaff = selectedPreviewStaff 
                        ? (staffList.find(s => s._id === selectedPreviewStaff._id) || selectedPreviewStaff) 
                        : null;
                    return (
                        <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Header Section */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Points Management (Read-Only)</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                        {currentPreviewStaff 
                                            ? `Viewing plus and minus points log history for ${currentPreviewStaff.name}.` 
                                            : 'Preview plus and minus points logs for all staff members.'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                                </div>
                            </div>

                            {/* View 1: Default Staff List View */}
                            {!currentPreviewStaff ? (
                                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                                                <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Staff Name</th>
                                                <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Role / Designation</th>
                                                <th style={{ padding: '14px 16px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staffList.map((staff, idx) => {
                                                return (
                                                    <tr key={staff._id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                        <td style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{idx + 1}</td>
                                                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{staff.name}</td>
                                                        <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>{staff.staffProfile?.designation || 'Staff'}</td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
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
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                // View 2: Detailed Plus/Minus Tables for Selected Staff (Read-Only)
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
            role="Staff"
            onSuccess={() => {
                setIsAddModalOpen(false);
                // Refresh list
                axios.get('/api/users?role=Staff').then(r => setStaffList(Array.isArray(r.data) ? r.data : r.data.users || [])).catch(() => {});
            }}
        />
        <EditUserModal
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setSelectedStaff(null); }}
            user={selectedStaff}
            onSuccess={() => {
                axios.get('/api/users?role=Staff').then(r => setStaffList(Array.isArray(r.data) ? r.data : r.data.users || [])).catch(() => {});
            }}
        />
        {selectedStaffForDetails && (
            <StaffSalaryDetailsModal
                staff={selectedStaffForDetails}
                onClose={() => setSelectedStaffForDetails(null)}
            />
        )}
        {selectedStaffForTasks && (
            <StaffTasksViewModal
                staff={selectedStaffForTasks}
                tasks={tasks}
                onClose={() => setSelectedStaffForTasks(null)}
                dateFilter={taskDateFilter}
                particularDate={filterParticularDate}
                startDate={filterStartDate}
                endDate={filterEndDate}
                verificationFilter={taskVerificationFilter}
                statusFilter={taskStatusFilter}
            />
        )}
        </>
    );
};

const StaffSalaryDetailsModal = ({ staff, onClose }) => {
    if (!staff) return null;

    const designation = staff.staffProfile?.designation || '—';
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
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            padding: '16px'
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '720px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        color: '#94a3b8',
                        background: '#f8fafc',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Staff Salary & Transaction Details</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
                            {/* Left panel card */}
                            <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: '12px',
                                backgroundColor: '#f8fafc'
                            }}>
                                <div style={{
                                    width: '70px',
                                    height: '70px',
                                    borderRadius: '999px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: '1.8rem',
                                    fontWeight: 950
                                }}>
                                    {staff.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{staff.name}</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{staff.email}</p>
                                </div>
                                <span style={{
                                    background: staff.isActive !== false ? '#dcfce7' : '#fee2e2',
                                    color: staff.isActive !== false ? '#16a34a' : '#dc2626',
                                    borderRadius: '999px',
                                    padding: '4px 12px',
                                    fontSize: '0.68rem',
                                    fontWeight: 900
                                }}>
                                    {staff.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* Right panel details */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Designation</span>
                                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginTop: '4px' }}>{designation}</span>
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</span>
                                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginTop: '4px' }}>{department}</span>
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Salary</span>
                                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatNumber(salary)} / month</span>
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Institute</span>
                                    <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginTop: '4px' }}>{institute}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment/Payout History Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#334155' }}>
                                Transaction History ({history.length})
                            </h3>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#fff' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            <th style={{ padding: '10px 16px' }}>Payout ID</th>
                                            <th style={{ padding: '10px 16px' }}>For Month</th>
                                            <th style={{ padding: '10px 16px' }}>Paid Date</th>
                                            <th style={{ padding: '10px 16px' }}>Amount</th>
                                            <th style={{ padding: '10px 16px' }}>Method</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'center' }}>Status</th>
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
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{
                                                        background: '#dcfce7',
                                                        color: '#16a34a',
                                                        borderRadius: '999px',
                                                        padding: '3px 10px',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 900
                                                    }}>{rec.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const StaffTasksViewModal = ({ staff, tasks, onClose, dateFilter, particularDate, startDate, endDate, verificationFilter, statusFilter }) => {
    if (!staff) return null;

    const staffTasks = tasks.filter(t => t.staffName?.toLowerCase() === staff.name?.toLowerCase());

    const filtered = staffTasks.filter(t => {
        const taskDate = t.createdAt || t.due || new Date().toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        if (dateFilter === 'today') {
            return taskDate === todayStr;
        }
        if (dateFilter === 'month') {
            const currentMonthStr = todayStr.substring(0, 7);
            return taskDate.startsWith(currentMonthStr);
        }
        if (dateFilter === 'particular') {
            if (!particularDate) return true;
            return taskDate === particularDate;
        }
        if (dateFilter === 'range') {
            if (!startDate || !endDate) return true;
            return taskDate >= startDate && taskDate <= endDate;
        }
        return true; // Complete Year
    }).filter(t => 
        (verificationFilter === '' || (t.verificationStatus || '') === verificationFilter) &&
        (statusFilter === '' || (t.status || 'pending') === statusFilter)
    );

    const getStatusStyle = (status) => {
        const st = status?.toLowerCase();
        if (st === 'done' || st === 'completed') return { bg: '#dcfce7', text: '#16a34a' };
        if (st === 'inprogress' || st === 'in progress') return { bg: '#fffbeb', text: '#d97706' };
        return { bg: '#fee2e2', text: '#ef4444' };
    };

    const getVerificationStyle = (status) => {
        if (!status) return { bg: '#f1f5f9', text: '#64748b', label: 'Not Submitted' };
        const mapping = {
            approved: { bg: '#dcfce7', text: '#16a34a', label: 'Approved' },
            rejected: { bg: '#fee2e2', text: '#ef4444', label: 'Rejected' },
            needs_revision: { bg: '#fef3c7', text: '#d97706', label: 'Needs Revision' },
            under_verification: { bg: '#e0e7ff', text: '#4f46e5', label: 'Under Verification' },
        };
        return mapping[status] || { bg: '#f1f5f9', text: '#64748b', label: status };
    };

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            padding: '16px'
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '680px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        color: '#94a3b8',
                        background: '#f8fafc',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Tasks for {staff.name}</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Review the details and verification statuses of all assigned tasks.</p>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#fff' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    <th style={{ padding: '10px 16px' }}>Task Title</th>
                                    <th style={{ padding: '10px 16px' }}>Due Date</th>
                                    <th style={{ padding: '10px 16px' }}>Priority</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'center' }}>Verification</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>No tasks match the active filters.</td>
                                    </tr>
                                ) : filtered.map(t => {
                                    const stStyle = getStatusStyle(t.status);
                                    const verStyle = getVerificationStyle(t.verificationStatus);
                                    return (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 800, color: '#334155' }}>
                                                {t.title}
                                                {t.isSelfCreated && (
                                                    <span style={{ marginLeft: '6px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Self Created</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>
                                                {t.due ? new Date(t.due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    backgroundColor: t.priority === 'High' ? '#fee2e2' : t.priority === 'Medium' ? '#fffbeb' : '#dcfce7',
                                                    color: t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#d97706' : '#16a34a',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 900,
                                                    padding: '2px 8px',
                                                    borderRadius: '12px'
                                                }}>{t.priority}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    backgroundColor: stStyle.bg,
                                                    color: stStyle.text,
                                                    borderRadius: '999px',
                                                    padding: '3px 10px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 900
                                                }}>{t.status || 'pending'}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    backgroundColor: verStyle.bg,
                                                    color: verStyle.text,
                                                    borderRadius: '999px',
                                                    padding: '3px 10px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 900
                                                }}>{verStyle.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const DUMMY_STAFF = [
    { _id: 'd1', name: 'Ravi Kumar', email: 'ravi@hartron.edu', staffProfile: { designation: 'Office Clerk', department: 'Administration' }, instituteName: 'Hartron Institute', isActive: true },
    { _id: 'd2', name: 'Sunita Sharma', email: 'sunita@hartron.edu', staffProfile: { designation: 'Lab Assistant', department: 'IT Lab' }, instituteName: 'Hartron Institute', isActive: true },
    { _id: 'd3', name: 'Mohit Verma', email: 'mohit@lms.edu', staffProfile: { designation: 'Peon', department: 'General' }, instituteName: 'LMS Academy', isActive: true },
    { _id: 'd4', name: 'Priya Singh', email: 'priya@lms.edu', staffProfile: { designation: 'Receptionist', department: 'Front Desk' }, instituteName: 'LMS Academy', isActive: false },
];

export default StaffList;
