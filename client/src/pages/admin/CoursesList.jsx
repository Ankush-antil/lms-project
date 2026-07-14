import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Plus, Trash2, Edit, BookOpen, Building, Hash, GraduationCap, Eye, Filter, ChevronDown, Upload, Download } from 'lucide-react';
import AddCourseModal from '../../components/AddCourseModal';
import CourseDetailsModal from '../../components/CourseDetailsModal';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';

const CoursesList = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [filterCourseName, setFilterCourseName] = useState('All');
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isDemoPreset, setIsDemoPreset] = useState(false);
    const [activeSection, setActiveSection] = useState('lms'); // 'lms' or 'demo'
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const importCoursesRef = useRef(null);

    const uniqueInstitutes = [
        ...new Map(
            courses
                .map(c => c.institute)
                .filter(inst => inst && inst.name)
                .map(inst => [inst._id, inst])
        ).values()
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/setup/courses?status=active');
            setCourses(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching courses:", error);
            toast.error("Failed to load courses");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(window.location.search);
        const instId = params.get('institute');
        if (instId) {
            setFilterInstitute(instId);
        }
    }, []);

    const exportCourses = (format) => {
        const list = filteredCourses;
        if (list.length === 0) {
            toast.error('No courses to export');
            return;
        }
        const rows = list.map(c => ({
            Name: c.name || '',
            Code: c.code || '',
            Description: c.description || '',
            Subjects: Array.isArray(c.subjects) ? c.subjects.join(', ') : (c.subjects || ''),
            Duration: c.duration || 0,
            Fee: c.fee || 0,
            'Max Students per Section': c.maxStudentsPerSection || 30,
            'Sections Count': c.sectionsCount || 1,
            'Is Demo': c.isDemo ? 'Yes' : 'No',
            'Institute Name': c.institute?.name || '',
            'Created By': c.createdBy?.name || ''
        }));

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `courses_list_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} courses to JSON`);
        } else if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `courses_list_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} courses to CSV`);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `courses_list_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} courses to Excel`);
        }
    };

    const handleImportCourses = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const filename = file.name;
        const reader = new FileReader();

        const processImportedCourses = async (dataArray) => {
            const loadingToast = toast.loading('Importing courses...');
            let successCount = 0;
            const errors = [];

            for (const row of dataArray) {
                const name = row.Name || row.name;
                const code = row.Code || row.code;
                const description = row.Description || row.description || '';
                const subjects = row.Subjects || row.subjects || '';
                const duration = Number(row.Duration || row.duration) || 5;
                const fee = Number(row.Fee || row.fee) || 0;
                const maxStudentsPerSection = Number(row['Max Students per Section'] || row.maxStudentsPerSection) || 30;
                const sectionsCount = Number(row['Sections Count'] || row.sectionsCount) || 1;
                const isDemo = String(row['Is Demo'] || row.isDemo || 'No').toLowerCase() === 'yes' || row.isDemo === true;

                if (!name || !code) {
                    errors.push(`Row with missing Name/Code ignored`);
                    continue;
                }

                try {
                    const payload = {
                        name, code, description, subjects, duration, fee,
                        maxStudentsPerSection, sectionsCount, isDemo,
                        instituteId: user?.institute?._id || user?.institute || ''
                    };
                    await axios.post('/api/setup/courses', payload);
                    successCount++;
                } catch (err) {
                    errors.push(`Course ${name}: ${err.response?.data?.message || err.message}`);
                }
            }

            toast.dismiss(loadingToast);
            if (errors.length > 0) {
                toast.success(`Imported ${successCount} courses. ${errors.length} rows failed.`);
                console.error("Import errors:", errors);
            } else {
                toast.success(`Successfully imported ${successCount} courses!`);
            }
            fetchData();
        };

        if (filename.endsWith('.json')) {
            reader.onload = async (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    processImportedCourses(Array.isArray(parsed) ? parsed : [parsed]);
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
                    processImportedCourses(parsed);
                } catch (err) {
                    toast.error('Failed to parse file');
                }
            };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = '';
    };

    const uniqueCourseNames = useMemo(() => {
        const names = new Set();
        // Only get active courses matching the active tab section (LMS vs Demo)
        courses
            .filter(c => activeSection === 'demo' ? c.isDemo === true : !c.isDemo)
            .forEach(c => {
                if (c.name) names.add(c.name);
            });
        return Array.from(names).sort();
    }, [courses, activeSection]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterInstitute, filterCourseName, activeSection]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this course? This will affect students and teachers enrolled in it.')) {
            try {
                await axios.delete(`/api/setup/courses/${id}`);
                setCourses(courses.filter(c => c._id !== id));
                toast.success('Course deleted successfully');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting course');
            }
        }
    };

    const filteredCourses = courses.filter(course => {
        const matchesSearch = 
            course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.institute?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            
        const matchesInstitute = 
            filterInstitute === 'All' || 
            (course.institute && (course.institute._id === filterInstitute || course.institute === filterInstitute));
            
        const matchesCourseName = 
            filterCourseName === 'All' || 
            course.name === filterCourseName;

        const matchesSection = activeSection === 'demo' ? course.isDemo === true : !course.isDemo;

        return matchesSearch && matchesInstitute && matchesCourseName && matchesSection;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCourses = filteredCourses.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

    const editorControls = user?.editorProfile?.controls;
    if (user?.role === 'Editor' && editorControls?.courses?.enabled === false) {
        return (
            <DashboardLayout role="Editor">
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-550 rounded-2xl flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800">Section Deactivated</h3>
                    <p className="text-slate-500 font-medium max-w-sm mt-2">
                        {editorControls.courses.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Courses Management</h1>
                    <p className="text-slate-500">Organize curriculum and academic programs.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="file"
                        ref={importCoursesRef}
                        onChange={handleImportCourses}
                        accept=".json,.csv,.xlsx,.xls"
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => importCoursesRef.current?.click()}
                        className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                    >
                        <Upload size={16} /> Import
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                        >
                            <Download size={16} /> Export
                        </button>
                        {isExportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={() => { exportCourses('excel'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    Excel (.xlsx)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportCourses('csv'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    CSV (.csv)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportCourses('json'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    JSON (.json)
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer"
                        title="Recycle Bin"
                    >
                        <Trash2 size={16} className="text-red-500" /> Recycle Bin
                    </button>
                    {user?.role !== 'Admin' && user?.role !== 'Editor' && (
                        <>
                            {user?.institute?.controls?.course?.addNewCourse !== false && (
                                <button
                                    onClick={() => {
                                        setSelectedCourse(null);
                                        setIsDemoPreset(false);
                                        setIsModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] shadow-xl shadow-[#0b1329]/15 transition-all active:scale-95 cursor-pointer text-sm"
                                >
                                    <Plus size={18} /> Add New Course
                                </button>
                            )}
                            {user?.institute?.controls?.course?.addNewDemoCourse !== false && (
                                <button
                                    onClick={() => {
                                        setSelectedCourse(null);
                                        setIsDemoPreset(true);
                                        setIsModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-2xl shadow-xl shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer text-sm"
                                >
                                    <Plus size={18} /> Add New Demo Course
                                </button>
                            )}
                        </>
                    )}
                    {user?.role === 'Editor' && editorControls?.courses?.addNewCourses !== false && (
                        <>
                            <button
                                onClick={() => {
                                    setSelectedCourse(null);
                                    setIsDemoPreset(false);
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] shadow-xl shadow-[#0b1329]/15 transition-all active:scale-95 cursor-pointer text-sm"
                            >
                                <Plus size={18} /> Add New Course
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedCourse(null);
                                    setIsDemoPreset(true);
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-2xl shadow-xl shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer text-sm"
                            >
                                <Plus size={18} /> Add New Demo Course
                            </button>
                        </>
                    )}
                    {user?.role === 'Admin' && (
                        <>
                            <button
                                onClick={() => {
                                    setSelectedCourse(null);
                                    setIsDemoPreset(false);
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] shadow-xl shadow-[#0b1329]/15 transition-all active:scale-95 cursor-pointer text-sm"
                            >
                                <Plus size={18} /> Add New Course
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedCourse(null);
                                    setIsDemoPreset(true);
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-2xl shadow-xl shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer text-sm"
                            >
                                <Plus size={18} /> Add New Demo Course
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Sections Tabs */}
            <div className="overflow-x-auto -mx-1 px-1 mb-6">
                <div className="flex border-b border-slate-250 gap-6 min-w-max">
                    <button
                        onClick={() => setActiveSection('lms')}
                        className={`pb-3 text-sm font-black transition-all relative cursor-pointer ${
                            activeSection === 'lms' ? 'text-[#0b1329]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        LMS Courses
                        {activeSection === 'lms' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0b1329] rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveSection('demo')}
                        className={`pb-3 text-sm font-black transition-all relative cursor-pointer ${
                            activeSection === 'demo' ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
                        }`}
                    >
                        Demo Courses
                        {activeSection === 'demo' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap w-full mb-6">
                <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search courses, codes or institutes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                    />
                </div>

                {/* Course Name Filter */}
                <div className="relative w-[190px]">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                        value={filterCourseName}
                        onChange={(e) => setFilterCourseName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                    >
                        <option value="All">All Courses</option>
                        {uniqueCourseNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>

                <div className="flex flex-row items-center gap-2.5 flex-wrap">
                    {/* Entries selector */}
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                        <input
                            type="number"
                            min={5}
                            max={filteredCourses.length}
                            value={itemsPerPage}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val)) {
                                    setItemsPerPage('');
                                } else {
                                    const maxVal = filteredCourses.length > 5 ? filteredCourses.length : 5;
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

                    {/* Institute Filter */}
                    {user?.role === 'Admin' && uniqueInstitutes.length > 0 && (
                        <div className="relative w-[190px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <select
                                value={filterInstitute}
                                onChange={(e) => setFilterInstitute(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-8 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all truncate"
                            >
                                <option value="All">All Institutes</option>
                                {uniqueInstitutes.map(inst => (
                                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                    )}
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold whitespace-nowrap">Course Name</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Code</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Subjects</th>
                                {user?.role === 'Admin' && (
                                    <>
                                        <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Created By</th>
                                    </>
                                )}
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={user?.role === 'Admin' ? 6 : 4} className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-[#0b1329] border-t-transparent rounded-full animate-spin"></div>
                                            Loading courses...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedCourses.length > 0 ? (
                                paginatedCourses.map((course) => (
                                    <tr key={course._id} className="hover:bg-slate-50/80 transition-colors group">
                                        {/* Course Name */}
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#0b1329] flex items-center justify-center font-bold flex-shrink-0">
                                                    <BookOpen size={18} />
                                                </div>
                                                <span className="font-bold text-slate-800 text-sm">
                                                    <TruncatedCell text={course.name} maxLength={20} />
                                                </span>
                                            </div>
                                        </td>

                                        {/* Code */}
                                        <td className="p-4 whitespace-nowrap text-sm text-slate-500 font-bold uppercase tracking-wider">
                                            {course.code || 'N/A'}
                                        </td>

                                        {/* Subjects */}
                                        <td className="p-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                            {course.subjects && course.subjects.length > 0 ? (
                                                <TruncatedCell text={course.subjects.join(', ')} maxLength={25} />
                                            ) : (
                                                <span className="text-slate-400 italic">No subjects</span>
                                            )}
                                        </td>

                                        {/* Admin specific columns */}
                                        {user?.role === 'Admin' && (
                                            <>
                                                <td className="p-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                                    <TruncatedCell text={course.institute?.name || 'N/A'} maxLength={20} />
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                                                    {course.createdBy ? (
                                                        <div>
                                                            <span className="font-semibold text-slate-700">
                                                                <TruncatedCell text={course.createdBy.name} maxLength={20} />
                                                            </span>
                                                            <span className="text-[10px] ml-1 px-1 bg-slate-100 rounded text-slate-500 capitalize">{course.createdBy.role}</span>
                                                        </div>
                                                    ) : 'N/A'}
                                                </td>
                                            </>
                                        )}

                                        {/* Actions */}
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)]">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCourse(course);
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {((user?.role === 'Admin') || (user?.institute?.controls?.course?.editCourse !== false)) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCourse(course);
                                                            setIsDemoPreset(course.isDemo || false);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-[#0b1329] hover:bg-slate-100 rounded-lg transition-all"
                                                        title="Edit Course"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(course._id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Course"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={user?.role === 'Admin' ? 6 : 4} className="p-8 text-center text-slate-500 font-bold">
                                        No courses found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredCourses.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white select-none">
                        <div className="text-sm font-semibold text-slate-500 font-medium font-sans">
                            Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                            <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredCourses.length)}</span> of{' '}
                            <span className="text-slate-700">{filteredCourses.length}</span> entries
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
                                                        ? 'bg-[#0b1329] text-white'
                                                        : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200'
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

            <AddCourseModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedCourse(null);
                }}
                refreshData={fetchData}
                course={selectedCourse}
                isDemoPreset={isDemoPreset}
            />

            <CourseDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedCourse(null);
                }}
                course={selectedCourse}
            />

            <RecycleBinModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title="Courses Recycle Bin"
                trashUrl="/api/setup/courses/trash"
                onRestoreSuccess={fetchData}
                restoreUrlPattern={(id) => `/api/setup/courses/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/setup/courses/${id}/permanent`}
                renderItemDetail={(item) => `Code: ${item.code} | Subjects: ${item.subjects?.join(', ') || 'N/A'}`}
            />
        </DashboardLayout>
    );
};

export default CoursesList;
