import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Plus, Trash2, Edit, Filter, ChevronDown } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';

const AccountantsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [accountants, setAccountants] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isTrashOpen, setIsTrashOpen] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterInstitute]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [userRes, instsRes] = await Promise.all([
                axios.get('/api/users?role=Accountant'),
                axios.get('/api/setup/institutes')
            ]);
            setAccountants(userRes.data);
            setInstitutes(instsRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching accountants:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this accountant?')) {
            try {
                await axios.delete(`/api/users/${id}`);
                setAccountants(accountants.filter(e => e._id !== id));
                toast.success('Accountant deleted successfully');
            } catch (error) {
                toast.error('Error deleting accountant');
            }
        }
    };

    const filteredAccountants = accountants.filter(accountant =>
        (filterInstitute === 'All' || (accountant.institute?._id === filterInstitute || accountant.institute === filterInstitute)) &&
        (accountant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accountant._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accountant.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredAccountants.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAccountants = filteredAccountants.slice(startIndex, startIndex + itemsPerPage);

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Accountants Management</h1>
                    <p className="text-slate-500">Manage platform accountants and track their activity.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer"
                        title="Recycle Bin"
                    >
                        <Trash2 size={16} className="text-red-500" /> Recycle Bin
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Plus size={20} /> Add New Accountant
                    </button>
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
                            max={filteredAccountants.length}
                            value={itemsPerPage}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val)) {
                                    setItemsPerPage('');
                                } else {
                                    const maxVal = filteredAccountants.length > 5 ? filteredAccountants.length : 5;
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
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold whitespace-nowrap">Accountant Name</th>
                                <th className="p-4 font-semibold whitespace-nowrap">ID</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Institute</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Mobile</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Email</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading accountants...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedAccountants.length > 0 ? (
                                paginatedAccountants.map((accountant) => (
                                    <tr key={accountant._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold overflow-hidden shadow-sm cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                                                    onClick={() => openProfile(accountant._id)}
                                                >
                                                    {accountant.avatar ? (
                                                        <img src={accountant.avatar} alt={accountant.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        accountant.name[0]
                                                    )}
                                                </div>
                                                <span
                                                    className="font-medium text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => openProfile(accountant._id)}
                                                >
                                                    <TruncatedCell text={accountant.name} maxLength={20} />
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-sm whitespace-nowrap">{accountant._id.slice(-6)}</td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">
                                            <TruncatedCell text={accountant.institute?.name || accountant.institute || 'N/A'} maxLength={20} />
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">{accountant.mobileNumber || 'N/A'}</td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">
                                            <TruncatedCell text={accountant.email} maxLength={25} />
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${accountant.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {accountant.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(accountant);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2"
                                                title="Edit Accountant"
                                            >
                                                <Edit size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(accountant._id)}
                                                className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                title="Delete Accountant"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
                                        No accountants found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredAccountants.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                        <div className="text-sm font-semibold text-slate-500">
                            Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                            <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredAccountants.length)}</span> of{' '}
                            <span className="text-slate-700">{filteredAccountants.length}</span> entries
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
            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchData();
                }}
                role="Accountant"
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
                title="Accountants Recycle Bin"
                trashUrl="/api/users/trash?role=Accountant"
                onRestoreSuccess={fetchData}
                restoreUrlPattern={(id) => `/api/users/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/users/${id}/permanent`}
                renderItemDetail={(item) => `Email: ${item.email}`}
            />
        </DashboardLayout>
    );
};

export default AccountantsList;
