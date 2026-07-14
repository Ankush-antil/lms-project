import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useRef,  useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Download,  Upload,  Search, Plus, Trash2, Edit, Filter, ChevronDown } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';

const EditorsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [editors, setEditors] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [instituteDetails, setInstituteDetails] = useState(null);
    const [isTrashOpen, setIsTrashOpen] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterInstitute, filterCourse, filterSubject]);

    const handleToggleFlag = async (flagName) => {
        try {
            const instId = instituteDetails?._id || userInfo?.institute?._id || userInfo?.institute;
            if (!instId) return;
            const { data } = await axios.patch(`/api/setup/institutes/${instId}/toggle`, { flag: flagName });
            setInstituteDetails(prev => ({
                ...prev,
                [flagName]: data.value
            }));
            toast.success(`Editor Recruitment status updated successfully`);
        } catch (error) {
            console.error("Error toggling recruitment status:", error);
            toast.error(error.response?.data?.message || "Failed to update recruitment status");
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [userRes, courseRes, instsRes] = await Promise.all([
                axios.get('/api/users?role=Editor'),
                axios.get('/api/setup/courses'),
                axios.get('/api/setup/institutes')
            ]);
            setEditors(userRes.data);
            setCourses(courseRes.data);
            setInstitutes(instsRes.data);

            const instId = userInfo?.institute?._id || userInfo?.institute;
            if (instId && userInfo?.role === 'Institute') {
                const { data } = await axios.get(`/api/setup/institutes/${instId}`);
                setInstituteDetails(data);
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching editors:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleStatus = async (editorId, currentIsActive) => {
        try {
            const nextActive = currentIsActive === false ? true : false;
            await axios.put(`/api/users/${editorId}`, { isActive: nextActive });
            setEditors(prev => prev.map(e => e._id === editorId ? { ...e, isActive: nextActive } : e));
            toast.success('Editor status updated successfully');
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this editor?')) {
            try {
                await axios.delete(`/api/users/${id}`);
                setEditors(editors.filter(e => e._id !== id));
                toast.success('Editor deleted successfully');
            } catch (error) {
                toast.error('Error deleting editor');
            }
        }
    };

    const filteredEditors = editors.filter(editor =>
        (filterCourse === 'All' || (editor.editorProfile?.assignedCourses?.some(c => c.name === filterCourse))) &&
        (filterInstitute === 'All' || (editor.institute?._id === filterInstitute || editor.institute === filterInstitute)) &&
        (filterSubject === 'All' || (editor.editorProfile?.subjects?.includes(filterSubject))) &&
        (editor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const uniqueSubjects = [...new Set(editors.flatMap(e => e.editorProfile?.subjects || []).filter(Boolean))].sort();

    const totalPages = Math.ceil(filteredEditors.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEditors = filteredEditors.slice(startIndex, startIndex + itemsPerPage);

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

                    role: 'Editor',

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

        const list = editors;

        if (list.length === 0) {

            toast.error('No users to export');

            return;

        }

        const rows = list.map(u => ({

            Name: u.name || '',

            Email: u.email || '',

            Role: u.role || 'Editor',

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

            link.download = `editors_list_${new Date().toISOString().split('T')[0]}.json`;

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

            link.download = `editors_list_${new Date().toISOString().split('T')[0]}.csv`;

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

            link.download = `editors_list_${new Date().toISOString().split('T')[0]}.xlsx`;

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
                        <h1 className="text-2xl font-bold text-slate-800">Editors Management</h1>
                        <p className="text-slate-500">Manage platform editors and track their activity.</p>
                    </div>
                    {user?.role === 'Institute' && user?.institute?.controls?.editor?.hiring !== false && (
                        <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-100/80">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hiring Status:</span>
                            <button
                                type="button"
                                onClick={() => handleToggleFlag('editorHiring')}
                                className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${instituteDetails?.editorHiring ? 'bg-amber-600' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all duration-300 ${instituteDetails?.editorHiring ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${instituteDetails?.editorHiring ? 'text-amber-600' : 'text-slate-400'}`}>
                                {instituteDetails?.editorHiring ? 'Active' : 'Inactive'}
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
                        className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                    >
                        <Upload size={16} /> Import
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-3.5 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
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
                    {(user?.role === 'Admin' || user?.institute?.controls?.editor?.addEditor !== false) && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Plus size={20} /> Add New Editor
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mt-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Name, Email or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-10 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    {/* Entries selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                        <input
                            type="number"
                            min={5}
                            max={filteredEditors.length}
                            value={itemsPerPage}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val)) {
                                    setItemsPerPage('');
                                } else {
                                    const maxVal = filteredEditors.length > 5 ? filteredEditors.length : 5;
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
                            {uniqueSubjects.map((sub, idx) => (
                                <option key={idx} value={sub}>{sub}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold whitespace-nowrap">Editor Name</th>
                                <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Assigned Course</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Assigned Subjects</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Mobile</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Email</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading editors...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedEditors.length > 0 ? (
                                paginatedEditors.map((editor) => (
                                    <tr key={editor._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold overflow-hidden shadow-sm cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                                                    onClick={() => openProfile(editor._id)}
                                                >
                                                    {editor.avatar ? (
                                                        <img src={editor.avatar} alt={editor.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        editor.name[0]
                                                    )}
                                                </div>
                                                <span
                                                    className="font-medium text-slate-800 cursor-pointer hover:text-indigo-650 transition-colors"
                                                    onClick={() => openProfile(editor._id)}
                                                >
                                                    <TruncatedCell text={editor.name} maxLength={20} />
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-sm whitespace-nowrap">{editor._id.slice(-6)}</td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">
                                            <TruncatedCell text={editor.institute?.name || editor.institute || 'N/A'} maxLength={20} />
                                        </td>
                                        <td className="p-4 text-slate-650 font-bold whitespace-nowrap" title={editor.editorProfile?.assignedCourses?.[0]?.name || 'N/A'}>
                                            <TruncatedCell text={editor.editorProfile?.assignedCourses?.[0]?.name || 'N/A'} maxLength={20} />
                                        </td>
                                        <td className="p-4 text-slate-600 text-xs font-semibold whitespace-nowrap" title={editor.editorProfile?.subjects?.join(', ') || 'N/A'}>
                                            <TruncatedCell text={editor.editorProfile?.subjects?.join(', ') || 'N/A'} maxLength={20} />
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">{editor.mobileNumber || 'N/A'}</td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">
                                            <TruncatedCell text={editor.email} maxLength={25} />
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(editor._id, editor.isActive)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                    editor.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                }`}
                                                title={editor.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                            >
                                                <span className="sr-only">Toggle status</span>
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                        editor.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                            {(user?.role === 'Admin' || user?.institute?.controls?.editor?.editEditor !== false) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(editor);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors ml-2 cursor-pointer"
                                                    title="Edit Editor"
                                                >
                                                    <Edit size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(editor._id)}
                                                className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors ml-2 cursor-pointer"
                                                title="Delete Editor"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500 font-semibold">
                                        No editors found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredEditors.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                        <div className="text-sm font-semibold text-slate-500">
                            Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                            <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredEditors.length)}</span> of{' '}
                            <span className="text-slate-700">{filteredEditors.length}</span> entries
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
                onClose={() => {
                    setIsModalOpen(false);
                    fetchData();
                }}
                role="Editor"
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
                title="Editors Recycle Bin"
                trashUrl="/api/users/trash?role=Editor"
                onRestoreSuccess={fetchData}
                restoreUrlPattern={(id) => `/api/users/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/users/${id}/permanent`}
                renderItemDetail={(item) => `Email: ${item.email}`}
            />
        </DashboardLayout>
    );
};

export default EditorsList;
