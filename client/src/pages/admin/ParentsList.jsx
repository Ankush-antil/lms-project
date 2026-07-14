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

const ParentsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [parents, setParents] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterInstitute]);

    const fetchData = async () => {
        try {
            const [userRes, instsRes] = await Promise.all([
                axios.get('/api/users?role=Parent'),
                axios.get('/api/setup/institutes')
            ]);
            setParents(userRes.data);
            setInstitutes(instsRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching parents:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this parent?')) {
            try {
                await axios.delete(`/api/users/${id}`);
                setParents(parents.filter(p => p._id !== id));
                toast.success('Parent deleted successfully');
            } catch (error) {
                toast.error('Error deleting parent');
            }
        }
    };

    const handleToggleStatus = async (parentId, currentIsActive) => {
        try {
            const nextActive = currentIsActive === false ? true : false;
            await axios.put(`/api/users/${parentId}`, { isActive: nextActive });
            setParents(prev => prev.map(p => p._id === parentId ? { ...p, isActive: nextActive } : p));
            toast.success(`Parent account ${nextActive ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

    const filteredParents = parents.filter(parent =>
        (filterInstitute === 'All' || (parent.institute?._id === filterInstitute || parent.institute === filterInstitute)) &&
        (parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (parent.parentProfile?.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredParents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedParents = filteredParents.slice(startIndex, startIndex + itemsPerPage);

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

                    role: 'Parent',

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

        const list = parents;

        if (list.length === 0) {

            toast.error('No users to export');

            return;

        }

        const rows = list.map(u => ({

            Name: u.name || '',

            Email: u.email || '',

            Role: u.role || 'Parent',

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

            link.download = `parents_list_${new Date().toISOString().split('T')[0]}.json`;

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

            link.download = `parents_list_${new Date().toISOString().split('T')[0]}.csv`;

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

            link.download = `parents_list_${new Date().toISOString().split('T')[0]}.xlsx`;

            link.click();

            URL.revokeObjectURL(url);

            toast.success(`Exported ${list.length} users to Excel`);

        }

    };


    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Parents Management</h1>
                    <p className="text-slate-500">Manage parents profiles and link them to students.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-indigo-650/10 cursor-pointer whitespace-nowrap"
                    >
                        <Upload size={14} /> Import Parents
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-4 py-2.5 bg-[#0b1329] text-white hover:bg-slate-800 font-bold rounded-2xl text-xs flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-[#0b1329]/10 cursor-pointer whitespace-nowrap"
                        >
                            <Download size={14} /> Export Parents
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
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl transition-all flex items-center gap-2 hover:bg-[#3E3ADD] text-sm font-bold shadow-lg shadow-slate-900/10 cursor-pointer"
                    >
                        <Plus size={18} />
                        <span>Add Parent</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-150 rounded-3xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, student..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                        />
                    </div>
                    {user?.role === 'Admin' && (
                        <div className="relative w-full md:w-[220px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <select
                                value={filterInstitute}
                                onChange={(e) => setFilterInstitute(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm font-semibold text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 transition-all truncate"
                            >
                                <option value="All">All Institutes</option>
                                {institutes.map(inst => (
                                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
                    <span>Total Parents: {filteredParents.length}</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-150 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-150 text-[11px] font-black text-slate-450 uppercase tracking-wider">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Linked Student</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-slate-400 font-bold">
                                        Loading Parents...
                                    </td>
                                </tr>
                            ) : paginatedParents.length > 0 ? (
                                paginatedParents.map((parent) => (
                                    <tr key={parent._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">{parent.name}</td>
                                        <td className="px-6 py-4">{parent.email}</td>
                                        <td className="px-6 py-4">{parent.mobileNumber || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            {parent.parentProfile?.student ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{parent.parentProfile.student.name}</span>
                                                    <span className="text-xs text-slate-400">{parent.parentProfile.student.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-red-500 font-semibold italic text-xs">No student linked</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                             <button
                                                 type="button"
                                                 onClick={() => handleToggleStatus(parent._id, parent.isActive)}
                                                 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                     parent.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                 }`}
                                                 title={parent.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                             >
                                                 <span className="sr-only">Toggle status</span>
                                                 <span
                                                     className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                         parent.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                                     }`}
                                                 />
                                             </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(parent);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-indigo-650 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(parent._id)}
                                                    className="p-2 text-slate-500 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-slate-400 font-bold">
                                        No parents found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredParents.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-slate-150 bg-slate-50/20 text-xs font-bold text-slate-500">
                        <span>
                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredParents.length)} of {filteredParents.length} parents
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-650 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-650 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                role="Parent"
                onSuccess={fetchData}
            />

            {isEditModalOpen && (
                <EditUserModal
                    user={selectedUser}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={fetchData}
                />
            )}
        </DashboardLayout>
    );
};

export default ParentsList;
