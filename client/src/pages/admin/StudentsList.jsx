import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Filter, Plus, Trash2, Edit, ChevronDown, Calendar, CheckCircle, XCircle, FileText, Sun, Save, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';
import StudentAttendanceDetailModal from '../../components/common/StudentAttendanceDetailModal';
import AdminFeePortal from './AdminFeePortal';

const StudentsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
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

    useEffect(() => {
        if (!students.length) return;
        const init = {};
        students.forEach(s => {
            const existing = s.studentProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id] = {
                status: existing ? (existing.status || 'Present') : 'Absent',
                note: existing?.note || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
            };
        });
        setAttendanceRecords(init);
    }, [students, attendanceDate]);

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
    }, [searchTerm, filterClass, filterSubject, filterSection]);

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
            const [userRes, courseRes] = await Promise.all([
                axios.get('/api/users?role=Student'),
                axios.get('/api/setup/courses')
            ]);
            setStudents(userRes.data);
            setCourses(courseRes.data);

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
        (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student._id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const uniqueSections = [...new Set(students.map(s => s.studentProfile?.section).filter(Boolean))].sort();

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    const uniqueSubjects = [...new Set(students.map(s => s.studentProfile?.subject).filter(Boolean))];

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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsTrashOpen(true)}
                            className="px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer"
                            title="Recycle Bin"
                        >
                            <Trash2 size={16} className="text-red-500" /> Recycle Bin
                        </button>
                        {user?.role !== 'Admin' && user?.institute?.controls?.student?.addStudent !== false && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus size={20} /> Add New Student
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 mb-6 gap-2">
                <button
                    onClick={() => setActiveTab('directory')}
                    className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        activeTab === 'directory' 
                            ? 'border-indigo-650 text-indigo-650' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <UserCheck size={16} /> Student Directory
                </button>
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        activeTab === 'attendance' 
                            ? 'border-indigo-650 text-indigo-650' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <Calendar size={16} /> Daily Attendance Log
                </button>
                <button
                    onClick={() => setActiveTab('fee')}
                    className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        activeTab === 'fee' 
                            ? 'border-indigo-650 text-indigo-650' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <Plus size={16} /> Fee Management
                </button>
            </div>

            {activeTab === 'directory' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-row items-center gap-3 flex-wrap md:flex-nowrap w-full animate-fade-in">
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
                                                <td className="p-4 whitespace-nowrap text-slate-500 text-xs font-bold">{student._id}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-650 text-xs font-bold truncate max-w-[120px]">{student.institute?.name || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-650 text-xs font-bold">{student.studentProfile?.course?.name || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-550 text-xs font-bold">Section {student.studentProfile?.section || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-550 text-xs font-bold">{student.studentProfile?.subject || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-550 text-xs font-bold">{student.mobile || 'N/A'}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleToggleStatus(student._id, student.isActive)}
                                                        className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border flex items-center gap-1.5 ${student.isActive === false
                                                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                                                            : 'bg-emerald-50 border-emerald-250 text-emerald-600 hover:bg-emerald-100'
                                                            }`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${student.isActive === false ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                        {student.isActive === false ? 'Inactive' : 'Active'}
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
                    <AdminFeePortal embedded={true} />
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
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => {
                                    const bulk = { ...attendanceRecords };
                                    filteredStudents.forEach(s => {
                                        bulk[s._id] = { ...(bulk[s._id] || {}), status: 'Present' };
                                    });
                                    setAttendanceRecords(bulk);
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                            >
                                Mark All Present
                            </button>
                            <button
                                onClick={() => {
                                    const bulk = { ...attendanceRecords };
                                    filteredStudents.forEach(s => {
                                        bulk[s._id] = { ...(bulk[s._id] || {}), status: 'Absent' };
                                    });
                                    setAttendanceRecords(bulk);
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition cursor-pointer"
                            >
                                Mark All Absent
                            </button>
                            <button
                                onClick={handleSaveAttendance}
                                disabled={submittingAttendance}
                                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition ml-auto md:ml-0 cursor-pointer"
                            >
                                <Save size={14} /> {submittingAttendance ? 'Saving...' : 'Save Attendance Register'}
                            </button>
                        </div>
                    </div>

                    {/* Students list for attendance */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse" style={{ minWidth: '1000px' }}>
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold whitespace-nowrap">Student Name</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Course & Section</th>
                                        <th className="p-4 font-semibold whitespace-nowrap text-center">Attendance Status</th>
                                        <th className="p-4 font-semibold whitespace-nowrap text-center">Check-In / Check-Out</th>
                                        <th className="p-4 font-semibold whitespace-nowrap text-center">History</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => {
                                            const record = attendanceRecords[student._id] || { status: 'Absent', checkInTime: '', checkOutTime: '' };
                                            return (
                                                <tr key={student._id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                                                {student.avatar ? (
                                                                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    student.name[0]
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800">{student.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-semibold">{student.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-slate-500 text-xs font-bold">{student._id}</td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700">{student.studentProfile?.course?.name || 'N/A'}</span>
                                                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Section {student.studentProfile?.section || 'A'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-center">
                                                        <div className="inline-flex rounded-xl bg-slate-100/80 p-1 gap-1 border border-slate-200/40">
                                                            {[
                                                                { key: 'Present', color: 'text-emerald-700 bg-emerald-50 border-emerald-250 shadow-sm' },
                                                                { key: 'Absent', color: 'text-rose-700 bg-rose-50 border-rose-250 shadow-sm' },
                                                                { key: 'Leave', color: 'text-amber-700 bg-amber-50 border-amber-250 shadow-sm' },
                                                                { key: 'Holiday', color: 'text-blue-700 bg-blue-50 border-blue-250 shadow-sm' }
                                                            ].map(item => {
                                                                const active = record.status === item.key;
                                                                return (
                                                                    <button
                                                                        key={item.key}
                                                                        type="button"
                                                                        onClick={() => handleAttendanceStatusChange(student._id, item.key)}
                                                                        className={`px-3 py-1.5 text-xs font-black rounded-lg border border-transparent transition-all cursor-pointer ${
                                                                            active ? item.color : 'text-slate-400 hover:text-slate-600'
                                                                        }`}
                                                                    >
                                                                        {item.key}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-center">
                                                        <div className="flex items-center justify-center gap-1.5 text-xs">
                                                            <input
                                                                type="text"
                                                                placeholder="In Time"
                                                                value={record.checkInTime || ''}
                                                                onChange={(e) => {
                                                                    setAttendanceRecords(prev => ({
                                                                        ...prev,
                                                                        [student._id]: {
                                                                            ...(prev[student._id] || { status: 'Absent', note: '' }),
                                                                            checkInTime: e.target.value
                                                                        }
                                                                    }));
                                                                }}
                                                                className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                                            />
                                                            <span className="text-slate-400 font-bold">:</span>
                                                            <input
                                                                type="text"
                                                                placeholder="Out Time"
                                                                value={record.checkOutTime || ''}
                                                                onChange={(e) => {
                                                                    setAttendanceRecords(prev => ({
                                                                        ...prev,
                                                                        [student._id]: {
                                                                            ...(prev[student._id] || { status: 'Absent', note: '' }),
                                                                            checkOutTime: e.target.value
                                                                        }
                                                                    }));
                                                                }}
                                                                className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedStudentId(student._id)}
                                                            className="px-2.5 py-1 text-xs font-bold text-indigo-650 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-105 rounded-lg border border-indigo-100 transition cursor-pointer"
                                                        >
                                                            Logs
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">No matching students found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
