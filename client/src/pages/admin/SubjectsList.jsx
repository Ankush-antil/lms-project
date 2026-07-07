import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Filter, Eye, X, BookOpen, Calendar, HelpCircle, FileText, CheckCircle, AlertCircle, Plus, Edit2 } from 'lucide-react';
import TruncatedCell from '../../components/common/TruncatedCell';

const SubjectsList = () => {
    const { user: currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // Details Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSubjectName, setEditSubjectName] = useState('');
    const [editSubjectDuration, setEditSubjectDuration] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [courses, setCourses] = useState([]);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [newSubjectDuration, setNewSubjectDuration] = useState('');
    const [savingAdd, setSavingAdd] = useState(false);

    // Selective Student Assignment State
    const [assignToAll, setAssignToAll] = useState(true);
    const [courseStudents, setCourseStudents] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        if (selectedCourseId && isAddModalOpen) {
            const fetchCourseStudents = async () => {
                try {
                    setLoadingStudents(true);
                    const res = await axios.get(`/api/setup/courses/${selectedCourseId}/students`);
                    setCourseStudents(res.data || []);
                    setSelectedStudentIds([]);
                } catch (error) {
                    console.error("Error fetching course students:", error);
                    setCourseStudents([]);
                } finally {
                    setLoadingStudents(false);
                }
            };
            fetchCourseStudents();
        } else {
            setCourseStudents([]);
            setSelectedStudentIds([]);
        }
    }, [selectedCourseId, isAddModalOpen]);

    const openEditModal = (subject) => {
        setSelectedSubject(subject);
        setEditSubjectName(subject.name);
        setEditSubjectDuration(subject.duration || 0);
        setIsEditModalOpen(true);
    };

    const openAddModal = async () => {
        setIsAddModalOpen(true);
        setNewSubjectName('');
        setSelectedCourseId('');
        setNewSubjectDuration('');
        setAssignToAll(true);
        setSelectedStudentIds([]);
        try {
            const res = await axios.get('/api/setup/courses');
            setCourses(res.data || []);
            if (res.data && res.data.length > 0) {
                setSelectedCourseId(res.data[0]._id);
            }
        } catch (error) {
            console.error("Error fetching courses for select:", error);
        }
    };

    const handleSaveSubjectDetails = async () => {
        if (!editSubjectName.trim()) {
            toast.error("Subject name cannot be empty");
            return;
        }
        try {
            setSavingEdit(true);
            const res = await axios.put('/api/setup/subjects/update', {
                courseId: selectedSubject.course?._id,
                oldSubjectName: selectedSubject.name,
                newSubjectName: editSubjectName.trim(),
                duration: Number(editSubjectDuration) || 0
            });
            if (res.data.success) {
                toast.success("Subject details updated successfully!");
                setIsEditModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error("Error updating subject details:", err);
            toast.error(err.response?.data?.message || "Failed to update subject details");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleCreateSubject = async () => {
        if (!newSubjectName.trim()) {
            toast.error("Subject name is required");
            return;
        }
        if (!selectedCourseId) {
            toast.error("Please select a course");
            return;
        }
        if (!assignToAll && selectedStudentIds.length === 0) {
            toast.error("Please select at least one student or check 'All Enrolled Students'");
            return;
        }
        try {
            setSavingAdd(true);
            const res = await axios.post('/api/setup/subjects', {
                courseId: selectedCourseId,
                subjectName: newSubjectName.trim(),
                duration: Number(newSubjectDuration) || 0,
                assignToAll: assignToAll,
                assignedStudentIds: selectedStudentIds
            });
            if (res.data.success) {
                toast.success("Subject added successfully!");
                setIsAddModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error("Error creating subject:", err);
            toast.error(err.response?.data?.message || "Failed to add subject");
        } finally {
            setSavingAdd(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCourse]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/setup/subjects');
            setSubjects(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching subjects:", error);
            toast.error("Failed to load subjects");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Get unique courses for filter dropdown
    const uniqueCourses = [...new Set(subjects.map(s => s.course?.name).filter(Boolean))];

    const filteredSubjects = subjects.filter(subject => {
        const matchesCourse = filterCourse === 'All' || subject.course?.name === filterCourse;
        
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
            subject.name.toLowerCase().includes(term) ||
            (subject.course?.name && subject.course.name.toLowerCase().includes(term)) ||
            (subject.institute?.name && subject.institute.name.toLowerCase().includes(term)) ||
            (subject.teachers && subject.teachers.some(t => t.name.toLowerCase().includes(term)));
            
        return matchesCourse && matchesSearch;
    });

    const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSubjects = filteredSubjects.slice(startIndex, startIndex + itemsPerPage);

    const openDetailsModal = (subject) => {
        setSelectedSubject(subject);
        setIsModalOpen(true);
    };

    return (
        <DashboardLayout role={currentUser?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Subjects Directory</h1>
                    <p className="text-slate-500">Manage all subjects, courses, institutes, and check assigned teachers and tests details.</p>
                </div>
                {(currentUser?.role === 'Admin' || currentUser?.role === 'Institute' || currentUser?.role === 'Editor') && (
                    <button
                        onClick={openAddModal}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-650/15 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Add Subject</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Subject, Course, Institute or Teacher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-10 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                    />
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative min-w-[180px] w-full md:w-auto">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-8 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="All">All Courses</option>
                            {uniqueCourses.map(courseName => (
                                <option key={courseName} value={courseName}>{courseName}</option>
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
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold whitespace-nowrap">Subject Name</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Course</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Assigned Teachers</th>
                                <th className="p-4 font-semibold whitespace-nowrap text-center">Tests</th>
                                <th className="p-4 font-semibold whitespace-nowrap text-center">Assignments</th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading subjects...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedSubjects.length > 0 ? (
                                paginatedSubjects.map((s, index) => (
                                    <tr key={`${s.name}-${index}`} className="hover:bg-slate-50 transition-colors group">
                                        {/* Subject Name */}
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                                    <BookOpen size={16} />
                                                </div>
                                                <span className="font-semibold text-slate-850">
                                                    <TruncatedCell text={s.name} maxLength={20} />
                                                </span>
                                            </div>
                                        </td>

                                        {/* Course */}
                                        <td className="p-4 whitespace-nowrap text-sm text-slate-700">
                                            <span className="px-3 py-1 bg-slate-50 text-slate-700 rounded-full text-xs font-semibold border border-slate-100">
                                                <TruncatedCell text={s.course?.name || 'N/A'} maxLength={20} />
                                            </span>
                                        </td>

                                        {/* Institute */}
                                        <td className="p-4 whitespace-nowrap text-sm text-slate-700">
                                            <TruncatedCell text={s.institute?.name || 'N/A'} maxLength={20} />
                                        </td>

                                        {/* Teachers */}
                                        <td className="p-4 whitespace-nowrap text-sm text-slate-600">
                                            {s.teachers && s.teachers.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                    {s.teachers.map(t => (
                                                        <span key={t._id} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[11px] font-bold">
                                                            {t.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">No teacher assigned</span>
                                            )}
                                        </td>

                                        {/* Tests Count */}
                                        <td className="p-4 whitespace-nowrap text-center font-bold text-slate-800 text-sm">
                                            {s.testCount || 0}
                                        </td>

                                        {/* Assignments Count */}
                                        <td className="p-4 whitespace-nowrap text-center font-bold text-slate-800 text-sm">
                                            {s.assignmentCount || 0}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => openDetailsModal(s)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                title="View Detailed Info"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {(currentUser?.role === 'Admin' || currentUser?.role === 'Institute' || currentUser?.role === 'Editor') && (
                                                <button
                                                    onClick={() => openEditModal(s)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Edit Subject & Duration"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
                                        No subjects found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredSubjects.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                        <div className="text-sm font-semibold text-slate-500 font-medium">
                            Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                            <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredSubjects.length)}</span> of{' '}
                            <span className="text-slate-700">{filteredSubjects.length}</span> entries
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
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
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Subject Details Modal */}
            {isModalOpen && selectedSubject && createPortal(
                <div className="fixed inset-0 z-[100] bg-white/40 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-2xl md:max-h-[85vh] rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col animate-slide-up">
                        {/* Header Banner */}
                        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white relative">
                            <h3 className="text-xl font-bold tracking-tight">
                                Subject: {selectedSubject.name}
                            </h3>
                            <p className="text-indigo-100 text-xs mt-1 font-medium">
                                Course: {selectedSubject.course?.name} | Institute: {selectedSubject.institute?.name || 'N/A'}
                            </p>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {/* Stats boxes */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                        <HelpCircle size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Total Tests</span>
                                        <span className="text-base font-black text-slate-800">{selectedSubject.testCount || 0}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Assignments</span>
                                        <span className="text-base font-black text-slate-800">{selectedSubject.assignmentCount || 0}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Allocated Time</span>
                                        <span className="text-base font-black text-slate-800">
                                            {selectedSubject.duration || 0} <span className="text-[10px] text-slate-400 font-medium">/ {selectedSubject.course?.duration || 0} days</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Teachers list in Modal */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Assigned Teachers</h4>
                                {selectedSubject.teachers && selectedSubject.teachers.length > 0 ? (
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-wrap gap-2">
                                        {selectedSubject.teachers.map(t => (
                                            <div key={t._id} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                                <span>{t.name} ({t.email})</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-450 italic bg-slate-50 border border-dashed border-slate-200 p-3 rounded-2xl">
                                        No teachers are currently assigned to teach this subject under this course.
                                    </p>
                                )}
                            </div>

                            {/* Tests Details List */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-2.5 uppercase tracking-wide">Tests Created ({selectedSubject.tests?.length || 0})</h4>
                                {selectedSubject.tests && selectedSubject.tests.length > 0 ? (
                                    <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl overflow-hidden bg-white">
                                        {selectedSubject.tests.map(t => (
                                            <div key={t._id} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-800">{t.title}</span>
                                                    <span className="text-xs text-slate-400 font-medium">Questions: {t.questionsCount}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${t.publishMode === 'public' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                        {t.publishMode || 'connected'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-650'}`}>
                                                        {t.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-450 italic bg-slate-50 border border-dashed border-slate-200 p-3 rounded-2xl">
                                        No tests or assignments have been created for this subject yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors active:scale-95 shadow-md"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Subject Edit Modal */}
            {isEditModalOpen && selectedSubject && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col animate-slide-up">
                        <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white relative">
                            <h3 className="text-lg font-bold tracking-tight">
                                Edit Subject Details
                            </h3>
                            <p className="text-emerald-50 text-xs mt-0.5">
                                Course: {selectedSubject.course?.name}
                            </p>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Subject Name</label>
                                <input
                                    type="text"
                                    value={editSubjectName}
                                    onChange={(e) => setEditSubjectName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Allocated Duration (Days)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editSubjectDuration}
                                    onChange={(e) => setEditSubjectDuration(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    placeholder="Enter number of days"
                                />
                                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                                    Total Course Duration: {selectedSubject.course?.duration || 0} days
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-2.5">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSubjectDetails}
                                disabled={savingEdit}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                                {savingEdit && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Subject Modal */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col animate-slide-up">
                        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-650 text-white relative">
                            <h3 className="text-lg font-bold tracking-tight">
                                Add New Subject
                            </h3>
                            <p className="text-indigo-50 text-xs mt-0.5">
                                Add a new subject to a specific course timeline
                            </p>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Course</label>
                                <select
                                    value={selectedCourseId}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-750 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                                >
                                    <option value="" disabled>Select a Course</option>
                                    {courses.map(c => (
                                        <option key={c._id} value={c._id}>
                                            {c.name} ({c.duration ? `${c.duration} days` : 'No duration set'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Subject Name</label>
                                <input
                                    type="text"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="e.g. Computer Fundamentals"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Allocated Duration (Days)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newSubjectDuration}
                                    onChange={(e) => setNewSubjectDuration(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="e.g. 30"
                                />
                            </div>

                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assign to Students</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-500 font-bold">All Enrolled Students</span>
                                        <input
                                            type="checkbox"
                                            checked={assignToAll}
                                            onChange={(e) => setAssignToAll(e.target.checked)}
                                            className="w-4 h-4 text-indigo-650 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {!assignToAll && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-[160px] overflow-y-auto space-y-2 custom-scrollbar">
                                        {loadingStudents ? (
                                            <div className="text-xs text-slate-400 italic text-center py-2 flex items-center justify-center gap-1.5">
                                                <div className="w-3.5 h-3.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                                                <span>Loading course students...</span>
                                            </div>
                                        ) : courseStudents.length > 0 ? (
                                            courseStudents.map(student => {
                                                const isSelected = selectedStudentIds.includes(student._id);
                                                return (
                                                    <label key={student._id} className="flex items-center justify-between p-2 bg-white border border-slate-100 hover:border-slate-200 rounded-xl cursor-pointer transition-all select-none">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-slate-750">{student.name}</span>
                                                            <span className="text-[10px] text-slate-400">{student.email}</span>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                if (isSelected) {
                                                                    setSelectedStudentIds(prev => prev.filter(id => id !== student._id));
                                                                } else {
                                                                    setSelectedStudentIds(prev => [...prev, student._id]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-indigo-650 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </label>
                                                );
                                            })
                                        ) : (
                                            <p className="text-xs text-slate-400 italic text-center py-2">
                                                No students are enrolled in this course yet.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-2.5">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSubject}
                                disabled={savingAdd}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                                {savingAdd && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                <span>Add Subject</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </DashboardLayout>
    );
};

export default SubjectsList;
