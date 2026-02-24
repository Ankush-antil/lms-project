import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Filter, Eye, Plus, GraduationCap, Trash2, Edit } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';

const TeachersList = () => {
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');

    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchData = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const [userRes, courseRes] = await Promise.all([
                axios.get('/api/users?role=Teacher', config),
                axios.get('/api/setup/courses', config)
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
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
                await axios.delete(`/api/users/${id}`, config);
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

    return (
        <DashboardLayout role="Admin">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Teachers Management</h1>
                    <p className="text-slate-500">Manage faculty and track their performance.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} /> Add New Teacher
                </button>
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
                            {filteredTeachers.length > 0 ? (
                                filteredTeachers.map((teacher) => (
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
                                            <button
                                                onClick={() => navigate(`/admin/teachers/${teacher._id}`)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            >
                                                <Eye size={20} />
                                            </button>
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
        </DashboardLayout >
    );
};

export default TeachersList;
