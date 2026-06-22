import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Filter, Plus, GraduationCap, Trash2, Edit } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';

const TeachersList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCourse]);

    const fetchData = async () => {
        try {



            const [userRes, courseRes] = await Promise.all([
                axios.get('/api/users?role=Teacher'),
                axios.get('/api/setup/courses')
            ]);
            setTeachers(userRes.data);
            setCourses(courseRes.data);
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

    const filteredTeachers = teachers.filter(teacher =>
        (filterCourse === 'All' || (teacher.teacherProfile?.assignedCourses?.some(c => c.name === filterCourse))) &&
        (teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher._id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTeachers = filteredTeachers.slice(startIndex, startIndex + itemsPerPage);

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Teachers Management</h1>
                    <p className="text-slate-500">Manage faculty and track their performance.</p>
                </div>
                {user?.role !== 'Admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} /> Add New Teacher
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative min-w-[150px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="input-field pl-10 appearance-none cursor-pointer"
                        >
                            <option value="All">All Courses</option>
                            {courses.map(course => (
                                <option key={course._id} value={course.name}>{course.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold whitespace-nowrap">Teacher Name</th>
                                <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Subjects</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Assigned Course</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Mobile</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Email</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {paginatedTeachers.length > 0 ? (
                                paginatedTeachers.map((teacher) => (
                                    <tr key={teacher._id} className="hover:bg-slate-50 transition-colors group">
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
                                                <span
                                                    className="font-medium text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => openProfile(teacher._id)}
                                                >
                                                    {teacher.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-sm whitespace-nowrap">{teacher._id.slice(-6)}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            {(() => {
                                                const subjects = teacher.teacherProfile?.subjects || [];
                                                return (
                                                    <div className="flex items-center gap-1">
                                                        {subjects.length > 0 ? (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                                {subjects[0]}
                                                            </span>
                                                        ) : <span className="text-slate-400 text-xs">N/A</span>}
                                                        {subjects.length > 1 && (
                                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded text-xs font-bold">
                                                                +{subjects.length - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">{teacher.institute?.name || teacher.institute || 'N/A'}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            {(() => {
                                                const courses = teacher.teacherProfile?.assignedCourses || [];
                                                const names = courses.map(c => c.name || c);
                                                return (
                                                    <div className="flex items-center gap-1">
                                                        {names.length > 0 ? (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                                {names[0]}
                                                            </span>
                                                        ) : <span className="text-slate-400 text-xs">N/A</span>}
                                                        {names.length > 1 && (
                                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded text-xs font-bold">
                                                                +{names.length - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">{teacher.mobileNumber || 'N/A'}</td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">{teacher.email}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${teacher.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {teacher.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-100">

                                            {user?.role !== 'Admin' && (
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
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
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
        </DashboardLayout>
    );
};

export default TeachersList;
