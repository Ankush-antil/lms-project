import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Download, Upload, Search, Plus, Trash2, Edit, Filter, ChevronDown, Calendar, UserCheck, Save, Eye } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import BulkEditModal from '../../components/common/BulkEditModal';
import { useUserProfile } from '../../components/common/UserProfileContext';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';
import TeacherAttendanceDetailModal from '../../components/common/TeacherAttendanceDetailModal';

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

const TeachersList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [activeTab, setActiveTab] = useState('directory'); // directory, attendance

    // Bulk action states
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    useEffect(() => {
        setSelectedIds(new Set());
        setBulkAction('');
    }, [activeTab]);

    const [selectedTeacherId, setSelectedTeacherId] = useState(null);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [submittingAttendance, setSubmittingAttendance] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editRecord, setEditRecord] = useState({ status: '', checkInTime: '', checkOutTime: '' });

    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [instituteDetails, setInstituteDetails] = useState(null);
    const [isTrashOpen, setIsTrashOpen] = useState(false);

    useEffect(() => {
        setEditingId(null);
    }, [attendanceDate, activeTab]);

    useEffect(() => {
        if (!teachers.length) return;
        const init = {};
        teachers.forEach(t => {
            const existing = t.teacherProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[t._id] = {
                status: existing ? (existing.status || 'Present') : '',
                note: existing?.teacherNote || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
            };
        });
        setAttendanceRecords(init);
    }, [teachers, attendanceDate]);

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'Present':
                return <span className="px-2.5 py-1 text-xs font-extrabold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-250 shadow-sm">Present</span>;
            case 'Absent':
                return <span className="px-2.5 py-1 text-xs font-extrabold rounded-xl bg-rose-50 text-rose-700 border border-rose-250 shadow-sm">Absent</span>;
            case 'Leave':
                return <span className="px-2.5 py-1 text-xs font-extrabold rounded-xl bg-amber-50 text-amber-700 border border-amber-250 shadow-sm">Leave</span>;
            case 'Holiday':
                return <span className="px-2.5 py-1 text-xs font-extrabold rounded-xl bg-blue-50 text-blue-700 border border-blue-250 shadow-sm">Holiday</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-extrabold rounded-xl bg-slate-100 text-slate-400 border border-slate-200">Not Marked</span>;
        }
    };

    const handleStartEdit = (teacherId, currentRecord) => {
        setEditingId(teacherId);
        setEditRecord({
            status: currentRecord.status || 'Present',
            checkInTime: currentRecord.checkInTime || '',
            checkOutTime: currentRecord.checkOutTime || ''
        });
    };

    const handleSaveSingleAttendance = async (teacherId) => {
        try {
            setSubmittingAttendance(true);
            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: [{
                    studentId: teacherId,
                    status: editRecord.status,
                    checkInTime: editRecord.checkInTime || '',
                    checkOutTime: editRecord.checkOutTime || '',
                    note: ''
                }]
            });
            toast.success('Attendance updated successfully!');
            setEditingId(null);
            await fetchData();
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
            const recordsToSave = Object.entries(attendanceRecords).map(([teacherId, data]) => ({
                studentId: teacherId, // Backend uses 'studentId' key for any user ID
                status: data.status,
                note: data.note || '',
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || '',
            }));

            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: recordsToSave
            });

            toast.success(`Teacher attendance saved for ${attendanceDate}!`);
            await fetchData();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmittingAttendance(false);
        }
    };

    const handleAttendanceStatusChange = (teacherId, status) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [teacherId]: {
                ...(prev[teacherId] || { note: '', checkInTime: '', checkOutTime: '' }),
                status
            }
        }));
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCourse, filterInstitute, filterSubject, filterSection, activeTab]);

    const handleToggleFlag = async (flagName) => {
        try {
            const instId = instituteDetails?._id || userInfo?.institute?._id || userInfo?.institute;
            if (!instId) return;
            const { data } = await axios.patch(`/api/setup/institutes/${instId}/toggle`, { flag: flagName });
            setInstituteDetails(prev => ({
                ...prev,
                [flagName]: data.value
            }));
            toast.success(`Teacher Recruitment status updated successfully`);
        } catch (error) {
            console.error("Error toggling recruitment status:", error);
            toast.error(error.response?.data?.message || "Failed to update recruitment status");
        }
    };

    const fetchData = async () => {
        try {
            const [userRes, courseRes, instsRes] = await Promise.all([
                axios.get('/api/users?role=Teacher'),
                axios.get('/api/setup/courses'),
                axios.get('/api/setup/institutes')
            ]);
            setTeachers(userRes.data);
            setCourses(courseRes.data);
            setInstitutes(instsRes.data);

            const instId = userInfo?.institute?._id || userInfo?.institute;
            if (instId && userInfo?.role === 'Institute') {
                const { data } = await axios.get(`/api/setup/institutes/${instId}`);
                setInstituteDetails(data);
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching teachers:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this teacher?')) {
            try {


                await axios.delete(`/api/users/${id}`);
                setTeachers(teachers.filter(t => t._id !== id));
                toast.success('Teacher deleted successfully');
            } catch (error) {
                toast.error('Error deleting teacher');
            }
        }
    };

    const handleApplyBulkAction = async () => {
        if (selectedIds.size === 0 || !bulkAction) return;

        if (bulkAction === 'edit') {
            if (activeTab === 'directory') {
                setIsBulkEditOpen(true);
            }
            return;
        }

        if (bulkAction === 'delete') {
            const confirmMsg = activeTab === 'attendance'
                ? `Are you sure you want to delete attendance logs for the ${selectedIds.size} selected teachers on ${attendanceDate}?`
                : `Are you sure you want to delete the ${selectedIds.size} selected teachers?`;

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
                    fetchData();
                } catch (err) {
                    console.error("Bulk delete error:", err);
                    toast.error('Failed to complete some actions');
                }
            }
        }
    };

    const handleToggleStatus = async (teacherId, currentIsActive) => {
        try {
            const nextActive = currentIsActive === false ? true : false;
            await axios.put(`/api/users/${teacherId}`, { isActive: nextActive });
            setTeachers(prev => prev.map(t => t._id === teacherId ? { ...t, isActive: nextActive } : t));
            toast.success(`Teacher account ${nextActive ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

    const filteredTeachers = teachers.filter(teacher =>
        (filterCourse === 'All' || (teacher.teacherProfile?.assignedCourses?.some(c => c.name === filterCourse))) &&
        (filterInstitute === 'All' || (teacher.institute?._id === filterInstitute || teacher.institute === filterInstitute)) &&
        (filterSubject === 'All' || (teacher.teacherProfile?.subjects?.includes(filterSubject))) &&
        (filterSection === 'All' || (teacher.teacherProfile?.assignedSections?.includes(filterSection))) &&
        (teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher._id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const uniqueSubjects = [...new Set(teachers.flatMap(t => t.teacherProfile?.subjects || []).filter(Boolean))].sort();
    const uniqueSections = [...new Set(teachers.flatMap(t => t.teacherProfile?.assignedSections || []).filter(Boolean))].sort();

    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTeachers = filteredTeachers.slice(startIndex, startIndex + itemsPerPage);

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
                    role: 'Teacher',
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
        const list = teachers;
        if (list.length === 0) {
            toast.error('No users to export');
            return;
        }
        const rows = list.map(u => ({
            Name: u.name || '',
            Email: u.email || '',
            Role: u.role || 'Teacher',
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
            link.download = `teachers_list_${new Date().toISOString().split('T')[0]}.json`;
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
            link.download = `teachers_list_${new Date().toISOString().split('T')[0]}.csv`;
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
            link.download = `teachers_list_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} users to Excel`);
        }
    };

    const editorControls = user?.editorProfile?.controls;
    if (user?.role === 'Editor' && editorControls?.teachers?.enabled === false) {
        return (
            <DashboardLayout role="Editor">
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-550 rounded-2xl flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800">Section Deactivated</h3>
                    <p className="text-slate-500 font-medium max-w-sm mt-2">
                        {editorControls.teachers.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Teachers Management</h1>
                        <p className="text-slate-500">Manage faculty and track their performance.</p>
                    </div>
                    {user?.role === 'Institute' && user?.institute?.controls?.teacher?.hiring !== false && (
                        <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-100/80">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hiring Status:</span>
                            <button
                                type="button"
                                onClick={() => handleToggleFlag('teacherHiring')}
                                className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${instituteDetails?.teacherHiring ? 'bg-emerald-600' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all duration-300 ${instituteDetails?.teacherHiring ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${instituteDetails?.teacherHiring ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {instituteDetails?.teacherHiring ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer"
                        title="Recycle Bin"
                    >
                        <Trash2 size={16} className="text-red-500" /> Recycle Bin
                    </button>
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
                        className="px-3.5 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-md shadow-[#0b1329]/10 cursor-pointer whitespace-nowrap"
                    >
                        <Upload size={16} /> Import
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-3.5 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-md shadow-[#0b1329]/10 cursor-pointer whitespace-nowrap"
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
                    {(user?.role !== 'Editor' && user?.institute?.controls?.teacher?.addTeacher !== false || user?.role === 'Admin') && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Teacher
                        </button>
                    )}
                    {user?.role === 'Editor' && editorControls?.teachers?.addNewTeacher !== false && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={20} /> Add New Teacher
                        </button>
                    )}
                </div>
            </div>



            {activeTab === 'directory' && (
                <>
                    {/* Filters */}
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap w-full animate-fade-in">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:flex-1 sm:max-w-md">
                            <div className="relative w-full sm:flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by Name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer h-[38px] min-w-[120px]"
                                >
                                    <option value="">Bulk Action</option>
                                    <option value="edit">Edit Selected</option>
                                    <option value="delete">Delete Selected</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleApplyBulkAction}
                                    disabled={selectedIds.size === 0 || !bulkAction}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer whitespace-nowrap h-[38px] active:scale-95 flex items-center justify-center border border-transparent disabled:border-slate-100"
                                >
                                    Apply to All ({selectedIds.size})
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-row items-center gap-2 flex-wrap">
                            {user?.role === 'Admin' && (
                                <div className="relative w-[180px]">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <select
                                        value={filterInstitute}
                                        onChange={(e) => setFilterInstitute(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                                    >
                                        <option value="All">All Institutes</option>
                                        {institutes.map(inst => (
                                            <option key={inst._id} value={inst._id}>{inst.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                </div>
                            )}

                            <div className="relative w-[150px]">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select
                                    value={filterCourse}
                                    onChange={(e) => setFilterCourse(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                                >
                                    <option value="All">All Courses</option>
                                    {courses.map(course => (
                                        <option key={course._id} value={course.name}>{course.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>

                            <div className="relative w-[150px]">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select
                                    value={filterSubject}
                                    onChange={(e) => setFilterSubject(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                                >
                                    <option value="All">All Subjects</option>
                                    {uniqueSubjects.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>

                            <div className="relative w-[155px]">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select
                                    value={filterSection}
                                    onChange={(e) => setFilterSection(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                                >
                                    <option value="All">All Sections</option>
                                    {uniqueSections.map(sec => (
                                        <option key={sec} value={sec}>Section {sec}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>

                            {/* Entries selector */}
                            <div className="flex items-center gap-2 ml-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                                <input
                                    type="number"
                                    min={5}
                                    max={filteredTeachers.length}
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val)) {
                                            setItemsPerPage('');
                                        } else {
                                            const maxVal = filteredTeachers.length > 5 ? filteredTeachers.length : 5;
                                            setItemsPerPage(Math.min(val, maxVal));
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val) || val < 5) {
                                            setItemsPerPage(10);
                                        }
                                    }}
                                    className="w-16 bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">entries</span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedTeachers.length > 0 && selectedIds.size === paginatedTeachers.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedTeachers.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedTeachers.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Teacher Name</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Subjects</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Assigned Course</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Mobile</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                        <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTeachers.length > 0 ? (
                                        paginatedTeachers.map((teacher) => (
                                            <tr key={teacher._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(teacher._id)}
                                                        onChange={() => {
                                                            setSelectedIds(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(teacher._id)) {
                                                                    next.delete(teacher._id);
                                                                } else {
                                                                    next.add(teacher._id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                    />
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold overflow-hidden shadow-sm cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                                                            onClick={() => openProfile(teacher._id)}
                                                        >
                                                            {teacher.avatar ? (
                                                                <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                teacher.name[0]
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span
                                                                className="font-medium text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => openProfile(teacher._id)}
                                                            >
                                                                <TruncatedCell text={teacher.name} maxLength={20} />
                                                            </span>
                                                            <span className="text-slate-400 text-xs font-semibold">{teacher.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-600 font-mono text-sm whitespace-nowrap">{teacher._id.slice(-6)}</td>
                                                <td className="p-4 whitespace-nowrap text-sm text-slate-650 font-medium">
                                                    {teacher.teacherProfile?.subjects?.length > 0 ? (
                                                        <TruncatedCell text={teacher.teacherProfile.subjects.join(', ')} maxLength={20} />
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">N/A</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-slate-600 whitespace-nowrap">
                                                    <TruncatedCell text={teacher.institute?.name || teacher.institute || 'N/A'} maxLength={20} />
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-sm text-slate-650 font-medium">
                                                    {teacher.teacherProfile?.assignedCourses?.length > 0 ? (
                                                        <TruncatedCell text={teacher.teacherProfile.assignedCourses.map(c => c.name || c).join(', ')} maxLength={20} />
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">N/A</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-slate-600 text-sm whitespace-nowrap">{teacher.mobileNumber || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleToggleStatus(teacher._id, teacher.isActive)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${teacher.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                            }`}
                                                        title={teacher.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${teacher.isActive !== false ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => openProfile(teacher._id)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                        title="View Profile"
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                    {(user?.role === 'Admin' || user?.institute?.controls?.teacher?.editTeacher !== false) && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(teacher);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2"
                                                            title="Edit Teacher"
                                                        >
                                                            <Edit size={20} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(teacher._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                        title="Delete Teacher"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="p-8 text-center text-slate-500">
                                                No teachers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredTeachers.length > 0 && (
                            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                                <div className="text-sm font-semibold text-slate-500">
                                    Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                                    <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredTeachers.length)}</span> of{' '}
                                    <span className="text-slate-700">{filteredTeachers.length}</span> entries
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex gap-1">
                                        {(() => {
                                            const pages = [];
                                            const maxVisible = 5;
                                            if (totalPages <= maxVisible) {
                                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                                            } else {
                                                pages.push(1);
                                                let start = Math.max(2, currentPage - 1);
                                                let end = Math.min(totalPages - 1, currentPage + 1);
                                                if (currentPage <= 2) {
                                                    end = 4;
                                                } else if (currentPage >= totalPages - 1) {
                                                    start = totalPages - 3;
                                                }
                                                if (start > 2) pages.push('...');
                                                for (let i = start; i <= end; i++) pages.push(i);
                                                if (end < totalPages - 1) pages.push('...');
                                                pages.push(totalPages);
                                            }
                                            return pages.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    disabled={p === '...'}
                                                    onClick={() => p !== '...' && setCurrentPage(p)}
                                                    className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${p === '...'
                                                            ? 'text-slate-400 cursor-default bg-transparent'
                                                            : currentPage === p
                                                                ? 'bg-[#0b1329] text-white shadow-md'
                                                                : 'text-slate-600 hover:bg-slate-100 bg-transparent'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {false && (
                <div className="space-y-6 animate-fade-in">
                    {/* Attendance Filter Row */}
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-row items-center gap-3 flex-wrap md:flex-nowrap w-full">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:flex-1 sm:max-w-md animate-fade-in">
                            <div className="relative w-full sm:flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by Name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer h-[38px] min-w-[120px]"
                                >
                                    <option value="">Bulk Action</option>
                                    <option value="delete">Delete Selected</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleApplyBulkAction}
                                    disabled={selectedIds.size === 0 || !bulkAction}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer whitespace-nowrap h-[38px] active:scale-95 flex items-center justify-center border border-transparent disabled:border-slate-100"
                                >
                                    Apply to All ({selectedIds.size})
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-row items-center gap-2.5 flex-wrap md:flex-nowrap">
                            {user?.role === 'Admin' && (
                                <div className="relative w-[180px]">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <select
                                        value={filterInstitute}
                                        onChange={(e) => setFilterInstitute(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                                    >
                                        <option value="All">All Institutes</option>
                                        {institutes.map(inst => (
                                            <option key={inst._id} value={inst._id}>{inst.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                </div>
                            )}

                            <div className="relative w-[150px]">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select
                                    value={filterCourse}
                                    onChange={(e) => setFilterCourse(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                                >
                                    <option value="All">All Courses</option>
                                    {courses.map(course => (
                                        <option key={course._id} value={course.name}>{course.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Date:</span>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="date"
                                    value={attendanceDate}
                                    onChange={(e) => setAttendanceDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Teachers list for attendance */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="w-full overflow-hidden">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                        <th className="p-4 w-[5%] text-left">
                                            <input
                                                type="checkbox"
                                                checked={paginatedTeachers.length > 0 && selectedIds.size === paginatedTeachers.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedTeachers.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedTeachers.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 w-[22%] text-left">Teacher Name</th>
                                        <th className="p-4 w-[10%] text-center">ID</th>
                                        <th className="p-4 w-[20%] text-left">Institute</th>
                                        <th className="p-4 w-[15%] text-center">Attendance Status</th>
                                        <th className="p-4 w-[15%] text-center">Check-In / Out</th>
                                        <th className="p-4 w-[7%] text-center">Time</th>
                                        <th className="p-4 w-[6%] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTeachers.length > 0 ? (
                                        paginatedTeachers.map((teacher) => {
                                            const record = attendanceRecords[teacher._id] || { status: '', checkInTime: '', checkOutTime: '' };
                                            return (
                                                <tr key={teacher._id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-4 w-[5%]">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(teacher._id)}
                                                            onChange={() => {
                                                                setSelectedIds(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(teacher._id)) {
                                                                        next.delete(teacher._id);
                                                                    } else {
                                                                        next.add(teacher._id);
                                                                    }
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-4 h-4 rounded text-indigo-655 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {teacher.avatar ? (
                                                                    <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    teacher.name[0]
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-slate-800 text-xs truncate">{teacher.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-semibold truncate">{teacher.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center text-slate-500 text-[11px] font-bold" title={teacher._id}>
                                                        #{teacher._id.slice(-6)}
                                                    </td>
                                                    <td className="p-4 text-left text-slate-500 text-xs font-semibold truncate" title={teacher.institute?.name || 'N/A'}>
                                                        {teacher.institute?.name || 'N/A'}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {renderStatusBadge(record.status)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="text-xs font-bold text-slate-650">
                                                            {record.checkInTime || record.checkOutTime ? (
                                                                `${record.checkInTime || '—'} to ${record.checkOutTime || '—'}`
                                                            ) : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center text-xs font-bold text-slate-500">
                                                        {calculateSpendingTime(record.checkInTime, record.checkOutTime)}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedTeacherId(teacher._id)}
                                                                className="px-2.5 py-1.5 text-xs font-bold text-indigo-650 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition cursor-pointer"
                                                            >
                                                                Logs
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="p-8 text-center text-slate-500 font-bold">
                                                No teachers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredTeachers.length > 0 && (
                            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                                <div className="text-sm font-semibold text-slate-500">
                                    Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                                    <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredTeachers.length)}</span> of{' '}
                                    <span className="text-slate-700">{filteredTeachers.length}</span> entries
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        className="px-3.5 py-1.5 text-xs font-bold text-slate-650 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex gap-1">
                                        {(() => {
                                            const pages = [];
                                            const maxVisible = 5;
                                            if (totalPages <= maxVisible) {
                                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                                            } else {
                                                pages.push(1);
                                                let start = Math.max(2, currentPage - 1);
                                                let end = Math.min(totalPages - 1, currentPage + 1);
                                                if (currentPage <= 2) {
                                                    end = 4;
                                                } else if (currentPage >= totalPages - 1) {
                                                    start = totalPages - 3;
                                                }
                                                if (start > 2) pages.push('...');
                                                for (let i = start; i <= end; i++) pages.push(i);
                                                if (end < totalPages - 1) pages.push('...');
                                                pages.push(totalPages);
                                            }
                                            return pages.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    disabled={p === '...'}
                                                    onClick={() => p !== '...' && setCurrentPage(p)}
                                                    className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${p === '...'
                                                            ? 'text-slate-400 cursor-default bg-transparent'
                                                            : currentPage === p
                                                                ? 'bg-[#0b1329] text-white shadow-md'
                                                                : 'text-slate-650 hover:bg-slate-100 bg-transparent'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        className="px-3.5 py-1.5 text-xs font-bold text-slate-650 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                role="Teacher"
                onSuccess={fetchData}
            />
            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                onSuccess={fetchData}
            />
            <RecycleBinModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title="Teachers Recycle Bin"
                trashUrl="/api/users/trash?role=Teacher"
                onRestoreSuccess={fetchData}
                restoreUrlPattern={(id) => `/api/users/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/users/${id}/permanent`}
                renderItemDetail={(item) => `Email: ${item.email} | Courses: ${item.teacherProfile?.assignedCourses?.map(c => c.name).join(', ') || 'N/A'}`}
            />
            {selectedTeacherId && (
                <TeacherAttendanceDetailModal
                    teacherId={selectedTeacherId}
                    onClose={() => setSelectedTeacherId(null)}
                />
            )}
            <BulkEditModal
                isOpen={isBulkEditOpen}
                onClose={() => setIsBulkEditOpen(false)}
                type="teacher"
                selectedIds={Array.from(selectedIds)}
                onSuccess={fetchData}
            />
        </DashboardLayout>
    );
};

export default TeachersList;
