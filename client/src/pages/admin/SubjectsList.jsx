import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import * as XLSX from 'xlsx';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Filter, Eye, X, BookOpen, Calendar, HelpCircle, FileText, CheckCircle, AlertCircle, Plus, Edit2, Upload, Download, Trash2 } from 'lucide-react';
import TruncatedCell from '../../components/common/TruncatedCell';

const SubjectsList = () => {
    const { user: currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Bulk actions
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');

    useEffect(() => {
        setSelectedIds(new Set());
        setBulkAction('');
    }, [filterCourse]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const importSubjectsRef = useRef(null);
    
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

    // Teachers and Multiple Courses/Teachers Assignment State
    const [teachersList, setTeachersList] = useState([]);
    const [editSubjectTeachers, setEditSubjectTeachers] = useState([]);
    const [editSubjectCourses, setEditSubjectCourses] = useState([]);
    const [newSubjectTeachers, setNewSubjectTeachers] = useState([]);
    const [newSubjectCourses, setNewSubjectCourses] = useState([]);

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

        // Pre-fill assigned teachers
        const initialTeachers = subject.teachers ? subject.teachers.map(t => t._id) : [];
        setEditSubjectTeachers(initialTeachers);

        // Pre-fill assigned courses: find all courses in subjects array that have the same subject name
        const initialCourses = subjects
            .filter(s => s.name.toLowerCase() === subject.name.toLowerCase())
            .map(s => s.course?._id)
            .filter(Boolean);
        setEditSubjectCourses([...new Set(initialCourses)]);

        setIsEditModalOpen(true);
    };

    const openAddModal = () => {
        setIsAddModalOpen(true);
        setNewSubjectName('');
        setNewSubjectDuration('');
        setAssignToAll(true);
        setSelectedStudentIds([]);
        setNewSubjectTeachers([]);
        if (courses.length > 0) {
            setSelectedCourseId(courses[0]._id);
            setNewSubjectCourses([courses[0]._id]);
        } else {
            setSelectedCourseId('');
            setNewSubjectCourses([]);
        }
    };

    const handleSaveSubjectDetails = async () => {
        if (!editSubjectName.trim()) {
            toast.error("Subject name cannot be empty");
            return;
        }
        if (editSubjectCourses.length === 0) {
            toast.error("Please select at least one course");
            return;
        }
        try {
            setSavingEdit(true);
            const res = await axios.put('/api/setup/subjects/update', {
                courseId: selectedSubject.course?._id,
                oldSubjectName: selectedSubject.name,
                newSubjectName: editSubjectName.trim(),
                duration: Number(editSubjectDuration) || 0,
                teacherIds: editSubjectTeachers,
                courseIds: editSubjectCourses
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
        if (newSubjectCourses.length === 0) {
            toast.error("Please select at least one course");
            return;
        }
        if (!assignToAll && selectedStudentIds.length === 0) {
            toast.error("Please select at least one student or check 'All Enrolled Students'");
            return;
        }
        try {
            setSavingAdd(true);
            const res = await axios.post('/api/setup/subjects', {
                courseIds: newSubjectCourses,
                subjectName: newSubjectName.trim(),
                duration: Number(newSubjectDuration) || 0,
                assignToAll: assignToAll,
                assignedStudentIds: selectedStudentIds,
                teacherIds: newSubjectTeachers
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
            const [subRes, courseRes, teacherRes] = await Promise.all([
                axios.get('/api/setup/subjects'),
                axios.get('/api/setup/courses'),
                axios.get('/api/users?role=Teacher')
            ]);
            setSubjects(subRes.data || []);
            setCourses(courseRes.data || []);
            setTeachersList(teacherRes.data || []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching setup data:", error);
            toast.error("Failed to load subjects, courses, or teachers");
            setLoading(false);
        }
    };

    const handleApplyBulkAction = async () => {
        if (selectedIds.size === 0 || !bulkAction) return;

        if (bulkAction === 'delete') {
            if (window.confirm(`Are you sure you want to delete the ${selectedIds.size} selected subjects? This will clear them from their respective courses.`)) {
                try {
                    const promises = Array.from(selectedIds).map(item => {
                        const [courseId, subjectName] = item.split(':::');
                        return axios.delete('/api/setup/subjects', {
                            data: {
                                courseId: courseId === 'none' ? undefined : courseId,
                                subjectName
                            }
                        });
                    });
                    await Promise.all(promises);
                    toast.success('Successfully deleted selected subjects');
                    setSelectedIds(new Set());
                    setBulkAction('');
                    fetchData();
                } catch (err) {
                    console.error("Bulk delete error:", err);
                    toast.error('Failed to delete some subjects');
                }
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const exportSubjects = (format) => {
        const list = filteredSubjects;
        if (list.length === 0) {
            toast.error('No subjects to export');
            return;
        }
        const rows = list.map(s => ({
            Name: s.name || '',
            Course: s.course?.name || '',
            'Course Code': s.course?.code || '',
            Duration: s.duration || 0,
            Teachers: Array.isArray(s.teachers) ? s.teachers.map(t => t.name).join(', ') : '',
            'Institute Name': s.institute?.name || ''
        }));

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `subjects_list_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} subjects to JSON`);
        } else if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `subjects_list_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} subjects to CSV`);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `subjects_list_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} subjects to Excel`);
        }
    };

    const handleImportSubjects = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const filename = file.name;
        const reader = new FileReader();

        const processImportedSubjects = async (dataArray) => {
            const loadingToast = toast.loading('Importing subjects...');
            let successCount = 0;
            const errors = [];

            for (const row of dataArray) {
                const subjectName = row.Name || row.name || row.Subject || row.subject;
                const courseNameOrCode = row.Course || row.course || row['Course Code'] || row.courseCode;
                const duration = Number(row.Duration || row.duration) || 0;

                if (!subjectName) {
                    errors.push(`Row with missing Subject Name ignored`);
                    continue;
                }

                let matchedCourse = null;
                if (courseNameOrCode) {
                    matchedCourse = courses.find(c => 
                        c.name?.toLowerCase() === String(courseNameOrCode).toLowerCase() ||
                        c.code?.toLowerCase() === String(courseNameOrCode).toLowerCase()
                    );
                }

                if (!matchedCourse && courses.length > 0) {
                    matchedCourse = courses[0];
                }

                if (!matchedCourse) {
                    errors.push(`Subject ${subjectName}: No courses available in database`);
                    continue;
                }

                try {
                    await axios.post('/api/setup/subjects', {
                        courseIds: [matchedCourse._id],
                        subjectName: subjectName.trim(),
                        duration,
                        assignToAll: true,
                        assignedStudentIds: [],
                        teacherIds: []
                    });
                    successCount++;
                } catch (err) {
                    errors.push(`Subject ${subjectName}: ${err.response?.data?.message || err.message}`);
                }
            }

            toast.dismiss(loadingToast);
            if (errors.length > 0) {
                toast.success(`Imported ${successCount} subjects. ${errors.length} rows failed.`);
                console.error("Import errors:", errors);
            } else {
                toast.success(`Successfully imported ${successCount} subjects!`);
            }
            fetchData();
        };

        if (filename.endsWith('.json')) {
            reader.onload = async (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    processImportedSubjects(Array.isArray(parsed) ? parsed : [parsed]);
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
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const parsed = XLSX.utils.sheet_to_json(sheet);
                    processImportedSubjects(parsed);
                } catch (err) {
                    toast.error('Failed to parse file');
                }
            };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = '';
    };

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

    const editorControls = currentUser?.editorProfile?.controls;
    if (currentUser?.role === 'Editor' && editorControls?.subjects?.enabled === false) {
        return (
            <DashboardLayout role="Editor">
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-550 rounded-2xl flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800">Section Deactivated</h3>
                    <p className="text-slate-500 font-medium max-w-sm mt-2">
                        {editorControls.subjects.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role={currentUser?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Subjects Directory</h1>
                    <p className="text-slate-500">Manage all subjects, courses, institutes, and check assigned teachers and tests details.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="file"
                        ref={importSubjectsRef}
                        onChange={handleImportSubjects}
                        accept=".json,.csv,.xlsx,.xls"
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => importSubjectsRef.current?.click()}
                        className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap"
                    >
                        <Upload size={16} /> Import
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap"
                        >
                            <Download size={16} /> Export
                        </button>
                        {isExportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={() => { exportSubjects('excel'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    Excel (.xlsx)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportSubjects('csv'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    CSV (.csv)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportSubjects('json'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    JSON (.json)
                                </button>
                            </div>
                        )}
                    </div>
                    {((currentUser?.role === 'Admin') || (currentUser?.role === 'Institute' && currentUser?.institute?.controls?.subject?.addSubject !== false) || (currentUser?.role === 'Editor' && editorControls?.subjects?.addSubject !== false)) && (
                        <button
                            onClick={openAddModal}
                            className="px-5 py-2.5 bg-[#0b1329] hover:bg-[#152244] text-white rounded-2xl text-xs font-bold shadow-lg shadow-[#0b1329]/15 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>Add Subject</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-[480px]">
                    <div className="relative w-full sm:flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Subject, Course, Institute or Teacher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-10 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
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

                <div className="flex flex-row items-center gap-2.5 flex-wrap md:flex-nowrap w-full md:w-auto justify-between md:justify-end">
                    {/* Entries selector */}
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                        <input
                            type="number"
                            min={5}
                            max={filteredSubjects.length}
                            value={itemsPerPage}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val)) {
                                    setItemsPerPage('');
                                } else {
                                    const maxVal = filteredSubjects.length > 5 ? filteredSubjects.length : 5;
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
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={paginatedSubjects.length > 0 && selectedIds.size === paginatedSubjects.length}
                                        onChange={() => {
                                            if (selectedIds.size === paginatedSubjects.length) {
                                                setSelectedIds(new Set());
                                            } else {
                                                setSelectedIds(new Set(paginatedSubjects.map(item => `${item.course?._id || 'none'}:::${item.name}`)));
                                            }
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                    />
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">Subject Name</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Course</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Assigned Teachers</th>
                                <th className="p-4 font-semibold whitespace-nowrap text-center">Tests</th>
                                <th className="p-4 font-semibold whitespace-nowrap text-center">Days</th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading subjects...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedSubjects.length > 0 ? (
                                paginatedSubjects.map((s, index) => (
                                    <tr key={`${s.name}-${index}`} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(`${s.course?._id || 'none'}:::${s.name}`)}
                                                onChange={() => {
                                                    setSelectedIds(prev => {
                                                        const next = new Set(prev);
                                                        const key = `${s.course?._id || 'none'}:::${s.name}`;
                                                        if (next.has(key)) {
                                                            next.delete(key);
                                                        } else {
                                                            next.add(key);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </td>
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
 
                                        {/* Days Duration */}
                                        <td className="p-4 whitespace-nowrap text-center font-bold text-slate-800 text-sm">
                                            {s.duration || 0}
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
                                            {(currentUser?.role === 'Admin' || (currentUser?.role === 'Institute' && currentUser?.institute?.controls?.subject?.editSubject !== false) || currentUser?.role === 'Editor') && (
                                                <button
                                                    onClick={() => openEditModal(s)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Edit Subject & Duration"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {(currentUser?.role === 'Admin' || currentUser?.role === 'Editor') && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`Are you sure you want to delete "${s.name}"?`)) {
                                                            try {
                                                                await axios.delete('/api/setup/subjects', {
                                                                    data: {
                                                                        courseId: s.course?._id,
                                                                        subjectName: s.name
                                                                    }
                                                                });
                                                                toast.success('Subject deleted successfully');
                                                                fetchData();
                                                            } catch (err) {
                                                                toast.error(err.response?.data?.message || 'Error deleting subject');
                                                            }
                                                        }
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Delete Subject"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
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

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
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

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assigned Course(s)</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                    {courses.map(c => {
                                        const isSelected = editSubjectCourses.includes(c._id);
                                        return (
                                            <label key={c._id} className="flex items-center justify-between p-2 bg-white border border-slate-100 hover:border-slate-200 rounded-lg cursor-pointer transition-all select-none">
                                                <span className="text-xs font-semibold text-slate-700">{c.name}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        if (isSelected) {
                                                            setEditSubjectCourses(prev => prev.filter(id => id !== c._id));
                                                        } else {
                                                            setEditSubjectCourses(prev => [...prev, c._id]);
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assigned Teacher(s)</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                    {teachersList.length > 0 ? (
                                        teachersList.map(t => {
                                            const isSelected = editSubjectTeachers.includes(t._id);
                                            return (
                                                <label key={t._id} className="flex items-center justify-between p-2 bg-white border border-slate-100 hover:border-slate-200 rounded-lg cursor-pointer transition-all select-none">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-700">{t.name}</span>
                                                        <span className="text-[10px] text-slate-400">{t.email}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            if (isSelected) {
                                                                setEditSubjectTeachers(prev => prev.filter(id => id !== t._id));
                                                            } else {
                                                                setEditSubjectTeachers(prev => [...prev, t._id]);
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                </label>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-slate-450 italic text-center py-2">No teachers found in institute</p>
                                    )}
                                </div>
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

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Primary Course (For Student Assignment)</label>
                                <select
                                    value={selectedCourseId}
                                    onChange={(e) => {
                                        const cId = e.target.value;
                                        setSelectedCourseId(cId);
                                        setNewSubjectCourses(prev => {
                                            if (!prev.includes(cId)) {
                                                return [...prev, cId];
                                            }
                                            return prev;
                                        });
                                    }}
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
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Course(s)</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                    {courses.map(c => {
                                        const isSelected = newSubjectCourses.includes(c._id);
                                        return (
                                            <label key={c._id} className="flex items-center justify-between p-2 bg-white border border-slate-100 hover:border-slate-200 rounded-lg cursor-pointer transition-all select-none">
                                                <span className="text-xs font-semibold text-slate-700">{c.name}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        if (isSelected) {
                                                            // Keep selectedCourseId if it is the only one left, or don't allow unchecking if it's the primary course
                                                            if (c._id === selectedCourseId) {
                                                                toast.error("Cannot uncheck the primary course");
                                                                return;
                                                            }
                                                            setNewSubjectCourses(prev => prev.filter(id => id !== c._id));
                                                        } else {
                                                            setNewSubjectCourses(prev => [...prev, c._id]);
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-indigo-650 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
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

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assigned Teacher(s)</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                    {teachersList.length > 0 ? (
                                        teachersList.map(t => {
                                            const isSelected = newSubjectTeachers.includes(t._id);
                                            return (
                                                <label key={t._id} className="flex items-center justify-between p-2 bg-white border border-slate-100 hover:border-slate-200 rounded-lg cursor-pointer transition-all select-none">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-700">{t.name}</span>
                                                        <span className="text-[10px] text-slate-400">{t.email}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            if (isSelected) {
                                                                setNewSubjectTeachers(prev => prev.filter(id => id !== t._id));
                                                            } else {
                                                                setNewSubjectTeachers(prev => [...prev, t._id]);
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-indigo-650 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </label>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-slate-450 italic text-center py-2">No teachers found in institute</p>
                                    )}
                                </div>
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
