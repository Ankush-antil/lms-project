import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useRef,  useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Download,  Upload,  Search, Filter, Plus, Trash2, Edit, ChevronDown, Calendar, CheckCircle, XCircle, FileText, Sun, Save, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';
import StudentAttendanceDetailModal from '../../components/common/StudentAttendanceDetailModal';
import AdminFeePortal from './AdminFeePortal';

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

const StudentsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('directory'); // directory, attendance, fee
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [submittingAttendance, setSubmittingAttendance] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [instituteDetails, setInstituteDetails] = useState(null);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editRecord, setEditRecord] = useState({ status: '', checkInTime: '', checkOutTime: '' });
    const [activeSubjectPopoverStudentId, setActiveSubjectPopoverStudentId] = useState(null);

    useEffect(() => {
        setEditingId(null);
    }, [attendanceDate, activeTab]);

    useEffect(() => {
        if (!students.length) return;
        const init = {};
        students.forEach(s => {
            const existing = s.studentProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id] = {
                status: existing ? (existing.status || 'Present') : '',
                note: existing?.note || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
            };
        });
        setAttendanceRecords(init);
    }, [students, attendanceDate]);

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

    const handleStartEdit = (studentId, currentRecord) => {
        setEditingId(studentId);
        setEditRecord({
            status: currentRecord.status || 'Present',
            checkInTime: currentRecord.checkInTime || '',
            checkOutTime: currentRecord.checkOutTime || ''
        });
    };

    const handleSaveSingleAttendance = async (studentId) => {
        try {
            setSubmittingAttendance(true);
            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: [{
                    studentId,
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
            const recordsToSave = Object.entries(attendanceRecords).map(([studentId, data]) => ({
                studentId,
                status: data.status,
                note: data.note,
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || '',
            }));

            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: recordsToSave
            });
            
            toast.success(`Student attendance saved for ${attendanceDate}!`);
            await fetchData();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmittingAttendance(false);
        }
    };

    const handleAttendanceStatusChange = (studentId, status) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { note: '', checkInTime: '', checkOutTime: '' }),
                status
            }
        }));
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterClass, filterSubject, filterSection, activeTab]);

    const handleToggleFlag = async (flagName) => {
        try {
            const instId = instituteDetails?._id || userInfo?.institute?._id || userInfo?.institute;
            if (!instId) return;
            const { data } = await axios.patch(`/api/setup/institutes/${instId}/toggle`, { flag: flagName });
            setInstituteDetails(prev => ({
                ...prev,
                [flagName]: data.value
            }));
            toast.success(`Student Admissions status updated successfully`);
        } catch (error) {
            console.error("Error toggling admissions status:", error);
            toast.error(error.response?.data?.message || "Failed to update admissions status");
        }
    };

    const fetchData = async () => {
        try {
            const [userRes, courseRes, instsRes] = await Promise.all([
                axios.get('/api/users?role=Student'),
                axios.get('/api/setup/courses'),
                axios.get('/api/setup/institutes')
            ]);
            setStudents(userRes.data);
            setCourses(courseRes.data);
            setInstitutes(instsRes.data);

            const instId = userInfo?.institute?._id || userInfo?.institute;
            if (instId && userInfo?.role === 'Institute') {
                const { data } = await axios.get(`/api/setup/institutes/${instId}`);
                setInstituteDetails(data);
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching students:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this student?')) {
            try {


                await axios.delete(`/api/users/${id}`);
                setStudents(students.filter(s => s._id !== id));
                toast.success('Student deleted successfully');
            } catch (error) {
                toast.error('Error deleting student');
            }
        }
    };

    const handleToggleStatus = async (studentId, currentIsActive) => {
        try {
            const nextActive = currentIsActive === false ? true : false;
            await axios.put(`/api/users/${studentId}`, { isActive: nextActive });
            setStudents(prev => prev.map(s => s._id === studentId ? { ...s, isActive: nextActive } : s));
            toast.success(`Student account ${nextActive ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

    const filteredStudents = students.filter(student =>
        (filterClass === 'All' || (student.studentProfile?.course?.name === filterClass)) &&
        (filterSubject === 'All' || (student.studentProfile?.subject === filterSubject)) &&
        (filterSection === 'All' || (student.studentProfile?.section === filterSection)) &&
        (filterInstitute === 'All' || (student.institute?._id === filterInstitute || student.institute === filterInstitute)) &&
        (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student._id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const uniqueSections = [...new Set(students.map(s => s.studentProfile?.section).filter(Boolean))].sort();

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    const uniqueSubjects = [...new Set(students.map(s => s.studentProfile?.subject).filter(Boolean))];

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

                    role: 'Student',

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

        const list = students;

        if (list.length === 0) {

            toast.error('No users to export');

            return;

        }

        const rows = list.map(u => ({

            Name: u.name || '',

            Email: u.email || '',

            Role: u.role || 'Student',

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

            link.download = `students_list_${new Date().toISOString().split('T')[0]}.json`;

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

            link.download = `students_list_${new Date().toISOString().split('T')[0]}.csv`;

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

            link.download = `students_list_${new Date().toISOString().split('T')[0]}.xlsx`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${list.length} users to Excel`);

        }

    };


    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Students Management</h1>
                        <p className="text-slate-500">Manage student enrollment and details.</p>
                    </div>
                    {user?.role === 'Institute' && user?.institute?.controls?.student?.admissionOpen !== false && (
                        <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-100/80">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Admissions:</span>
                            <button
                                type="button"
                                onClick={() => handleToggleFlag('admissionOpen')}
                                className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${instituteDetails?.admissionOpen ? 'bg-indigo-650' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all duration-300 ${instituteDetails?.admissionOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${instituteDetails?.admissionOpen ? 'text-indigo-650' : 'text-slate-400'}`}>
                                {instituteDetails?.admissionOpen ? 'Open' : 'Closed'}
                            </span>
                        </div>
                    )}
                </div>
                {activeTab === 'directory' && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setIsTrashOpen(true)}
                            className="px-3 sm:px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                            title="Recycle Bin"
                        >
                            <Trash2 size={16} className="text-red-500" /> <span className="hidden sm:inline">Recycle Bin</span>
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
                            className="px-3 sm:px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                        >
                            <Upload size={16} /> <span className="hidden sm:inline">Import</span>
                        </button>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                className="px-3 sm:px-3.5 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                            >
                                <Download size={16} /> <span className="hidden sm:inline">Export</span>
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
                        {(user?.role === 'Admin' || user?.institute?.controls?.student?.addStudent !== false) && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="btn-primary flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm"
                            >
                                <Plus size={18} /> <span className="hidden xs:inline">Add Student</span><span className="xs:hidden">Add</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs Navigation — scrollable on mobile */}
            <div className="overflow-x-auto -mx-1 px-1 mb-6">
                <div className="flex border-b border-slate-200 gap-1 min-w-max">
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                            activeTab === 'directory' 
                                ? 'border-indigo-650 text-indigo-650' 
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <UserCheck size={15} /> Student Directory
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                            activeTab === 'attendance' 
                                ? 'border-indigo-650 text-indigo-650' 
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Calendar size={15} /> Daily Attendance Log
                    </button>
                    <button
                        onClick={() => setActiveTab('fee')}
                        className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                            activeTab === 'fee' 
                                ? 'border-indigo-650 text-indigo-650' 
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Plus size={15} /> Fee Management
                    </button>
                </div>
            </div>

            {activeTab === 'directory' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap w-full animate-fade-in">
                        <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by Name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                            />
                        </div>

                        <div className="flex flex-row items-center gap-2 flex-wrap">
                            {/* Entries selector */}
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                                <input
                                    type="number"
                                    min={5}
                                    max={filteredStudents.length}
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val)) {
                                            setItemsPerPage('');
                                        } else {
                                            const maxVal = filteredStudents.length > 5 ? filteredStudents.length : 5;
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
                                    value={filterClass}
                                    onChange={(e) => setFilterClass(e.target.value)}
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
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse" style={{ minWidth: '1400px' }}>
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold whitespace-nowrap">Student Name</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Course</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Section</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Subject</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Mobile</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                        <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedStudents.length > 0 ? (
                                        paginatedStudents.map((student) => (
                                            <tr key={student._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold overflow-hidden shadow-sm cursor-pointer hover:scale-110 transition-transform"
                                                            onClick={() => openProfile(student._id)}
                                                        >
                                                            {student.avatar ? (
                                                                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.name[0]
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span
                                                                className="font-medium text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => openProfile(student._id)}
                                                            >
                                                                {student.name}
                                                            </span>
                                                            <span className="text-slate-400 text-xs font-semibold">{student.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-slate-500 text-xs font-bold font-mono">{student._id ? `#${student._id.slice(-6)}` : 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-650 text-xs font-bold truncate max-w-[120px]">{student.institute?.name || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-650 text-xs font-bold truncate max-w-[120px]" title={student.studentProfile?.course?.name || 'N/A'}>{student.studentProfile?.course?.name || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-550 text-xs font-bold">Section {student.studentProfile?.section || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-550 text-xs font-bold relative">
                                                    {(() => {
                                                        const subjectStr = student.studentProfile?.subject || 'N/A';
                                                        if (subjectStr === 'N/A') return 'N/A';
                                                        const subjects = subjectStr.split(',').map(s => s.trim()).filter(Boolean);
                                                        if (subjects.length === 0) return 'N/A';
                                                        
                                                        const firstSubject = subjects[0];
                                                        const hasMore = subjects.length > 1;
                                                        const isPopoverOpen = activeSubjectPopoverStudentId === student._id;
                                                        
                                                        return (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => setActiveSubjectPopoverStudentId(isPopoverOpen ? null : student._id)}
                                                                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 hover:text-indigo-650 border border-slate-200/60 rounded-xl transition-all font-bold flex items-center gap-1 cursor-pointer select-none"
                                                                >
                                                                    <span>{firstSubject}</span>
                                                                    {hasMore && (
                                                                        <span className="text-[10px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-lg font-black">
                                                                            +{subjects.length - 1}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                                {isPopoverOpen && (
                                                                    <>
                                                                        <div 
                                                                            className="fixed inset-0 z-30" 
                                                                            onClick={() => setActiveSubjectPopoverStudentId(null)}
                                                                        />
                                                                        <div className="absolute left-4 top-full mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl p-3.5 z-40 min-w-[160px]">
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-100 pb-1">
                                                                                Assigned Subjects
                                                                            </p>
                                                                            <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                                                                                {subjects.map((sub, idx) => (
                                                                                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                                                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0" />
                                                                                        <span>{sub}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-slate-550 text-xs font-bold">{student.mobile || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(student._id, student.isActive)}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                            student.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                        }`}
                                                        title={student.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                                    >
                                                        <span className="sr-only">Toggle status</span>
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                student.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => openProfile(student._id)}
                                                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-indigo-650 transition-all cursor-pointer"
                                                            title="View Profile"
                                                        >
                                                            <UserCheck size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(student);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-550 hover:text-amber-650 transition-all cursor-pointer"
                                                            title="Edit Student"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(student._id)}
                                                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-red-650 transition-all cursor-pointer"
                                                            title="Delete Student"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="p-8 text-center text-slate-500">
                                                No students found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredStudents.length > 0 && (
                            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                                <div className="text-sm font-semibold text-slate-500">
                                    Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                                    <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of{' '}
                                    <span className="text-slate-700">{filteredStudents.length}</span> entries
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
                </div>
            )}

            {activeTab === 'fee' && (
                <div className="animate-fade-in">
                    <AdminFeePortal embedded={true} viewOnly={true} />
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Attendance Filter Row */}
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-row items-center gap-3 flex-wrap md:flex-nowrap w-full">
                        <div className="relative flex-1 min-w-[180px] max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by Name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                            />
                        </div>

                        <div className="flex flex-row items-center gap-2.5 flex-wrap md:flex-nowrap">
                            {/* Entries selector */}
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                                <input
                                    type="number"
                                    min={5}
                                    max={filteredStudents.length}
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val)) {
                                            setItemsPerPage('');
                                        } else {
                                            const maxVal = filteredStudents.length > 5 ? filteredStudents.length : 5;
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
                                    value={filterClass}
                                    onChange={(e) => setFilterClass(e.target.value)}
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

                    {/* Students list for attendance */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="w-full overflow-hidden">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-bold w-[22%] text-left">Student Name</th>
                                        <th className="p-4 font-bold text-center w-[10%]">ID</th>
                                        <th className="p-4 font-bold w-[22%] text-left">Course & Section</th>
                                        <th className="p-4 font-bold text-center w-[16%]">Attendance Status</th>
                                        <th className="p-4 font-bold text-center w-[16%]">Check-In / Out</th>
                                        <th className="p-4 font-bold text-center w-[8%]">Time</th>
                                        <th className="p-4 font-bold text-right w-[6%]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedStudents.length > 0 ? (
                                        paginatedStudents.map((student) => {
                                            const record = attendanceRecords[student._id] || { status: '', checkInTime: '', checkOutTime: '' };
                                            return (
                                                <tr key={student._id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {student.avatar ? (
                                                                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    student.name[0]
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-slate-800 text-xs truncate">{student.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-semibold truncate">{student.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center text-slate-500 text-[11px] font-bold" title={student._id}>
                                                        #{student._id.slice(-6)}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs font-bold text-slate-700 truncate" title={student.studentProfile?.course?.name || 'N/A'}>
                                                                {student.studentProfile?.course?.name || 'N/A'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Section {student.studentProfile?.section || 'A'}</span>
                                                        </div>
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
                                                                onClick={() => setSelectedStudentId(student._id)}
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
                                            <td colSpan="7" className="p-8 text-center text-slate-400 italic">No matching students found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredStudents.length > 0 && (
                            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                                <div className="text-sm font-semibold text-slate-500">
                                    Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                                    <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of{' '}
                                    <span className="text-slate-700">{filteredStudents.length}</span> entries
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
                                                    className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${
                                                        p === '...'
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
                </div>
            )}
            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                role="Student"
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
                title="Students Recycle Bin"
                trashUrl="/api/users/trash?role=Student"
                onRestoreSuccess={fetchData}
                restoreUrlPattern={(id) => `/api/users/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/users/${id}/permanent`}
                renderItemDetail={(item) => `Email: ${item.email} | Course: ${item.studentProfile?.course?.name || 'N/A'}`}
            />
            {selectedStudentId && (
                <StudentAttendanceDetailModal
                    studentId={selectedStudentId}
                    onClose={() => setSelectedStudentId(null)}
                />
            )}
        </DashboardLayout>
    );
};

export default StudentsList;
