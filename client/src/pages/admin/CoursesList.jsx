import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Plus, Trash2, Edit, BookOpen, Building, Hash, GraduationCap } from 'lucide-react';
import AddCourseModal from '../../components/AddCourseModal';

const CoursesList = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'pending'
    const [activeCourses, setActiveCourses] = useState([]);
    const [pendingCourses, setPendingCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [activeRes, pendingRes] = await Promise.all([
                axios.get('/api/setup/courses?status=active'),
                axios.get('/api/setup/courses?status=pending')
            ]);
            setActiveCourses(activeRes.data);
            setPendingCourses(pendingRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching courses:", error);
            toast.error("Failed to load courses");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this course? This will affect students and teachers enrolled in it.')) {
            try {
                await axios.delete(`/api/setup/courses/${id}`);
                setActiveCourses(activeCourses.filter(c => c._id !== id));
                toast.success('Course deleted successfully');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting course');
            }
        }
    };

    const handleApprove = async (id) => {
        try {
            await axios.put(`/api/setup/courses/${id}/approve`);
            toast.success('Course approved successfully!');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error approving course');
        }
    };

    const handleDecline = async (id) => {
        if (window.confirm('Are you sure you want to decline this course submission? It will be permanently removed.')) {
            try {
                await axios.put(`/api/setup/courses/${id}/decline`);
                toast.success('Course declined and removed.');
                fetchData();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error declining course');
            }
        }
    };

    const currentCourses = activeTab === 'active' ? activeCourses : pendingCourses;

    const filteredCourses = currentCourses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.institute?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Courses Management</h1>
                    <p className="text-slate-500">Organize curriculum and academic programs.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] shadow-xl shadow-[#0b1329]/15 transition-all active:scale-95"
                >
                    <Plus size={20} /> Add New Course
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mt-6 mb-2 gap-4">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === 'active'
                            ? 'border-[#0b1329] text-[#0b1329]'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Active Courses ({activeCourses.length})
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === 'pending'
                            ? 'border-[#0b1329] text-[#0b1329]'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Pending Approvals ({pendingCourses.length})
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search courses, codes or institutes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-305 transition-all"
                    />
                </div>
            </div>

            {/* Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map(n => (
                        <div key={n} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 animate-pulse space-y-4">
                            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                            <div className="h-8 bg-slate-100 rounded w-full"></div>
                        </div>
                    ))
                ) : filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => (
                        <div key={course._id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative flex flex-col">
                            {activeTab === 'active' && (
                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDelete(course._id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col h-full space-y-4 flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-[#0b1329] flex items-center justify-center font-bold flex-shrink-0">
                                        <BookOpen size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-[#0b1329] transition-colors">
                                            {course.name}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{course.code}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 flex-1">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Building size={14} />
                                        <span className="text-sm font-medium">{course.institute?.name || 'N/A'}</span>
                                    </div>

                                    {course.createdBy && (
                                        <div className="text-xs text-slate-400 font-medium">
                                            Created by: <span className="font-bold text-slate-600">{course.createdBy.name}</span> ({course.createdBy.role})
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-1.5">
                                        {course.subjects?.slice(0, 3).map((sub, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                {sub}
                                            </span>
                                        ))}
                                        {course.subjects?.length > 3 && (
                                            <span className="px-2 py-0.5 bg-slate-100 text-[#0b1329] rounded-lg text-[10px] font-bold">
                                                +{course.subjects.length - 3} More
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {activeTab === 'pending' ? (
                                    <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-slate-50">
                                        <button
                                            onClick={() => handleDecline(course._id)}
                                            className="flex-1 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition-all text-center active:scale-95"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            onClick={() => handleApprove(course._id)}
                                            className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all text-center shadow-md shadow-emerald-600/10 active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <GraduationCap size={14} />
                                            <span className="text-xs font-bold">LMS Core</span>
                                        </div>
                                        <button className="text-xs font-bold text-[#0b1329] hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-all">
                                            View Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-12 text-center bg-white rounded-[2.5rem] border border-slate-100">
                        <div className="max-w-xs mx-auto space-y-3">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <BookOpen size={32} />
                            </div>
                            <p className="text-slate-500 font-bold">No courses found</p>
                            {activeTab === 'active' && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-[#0b1329] font-bold hover:underline"
                                >
                                    Create your first course
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <AddCourseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                refreshData={fetchData}
            />
        </DashboardLayout>
    );
};

export default CoursesList;
