import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Plus, Trash2, Edit } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';

const ParentsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/api/users?role=Parent');
            setParents(data);
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
        parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (parent.parentProfile?.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredParents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedParents = filteredParents.slice(startIndex, startIndex + itemsPerPage);

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Parents Management</h1>
                    <p className="text-slate-500">Manage parents profiles and link them to students.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl transition-all flex items-center gap-2 hover:bg-[#3E3ADD] text-sm font-bold shadow-lg shadow-slate-900/10 cursor-pointer"
                >
                    <Plus size={18} />
                    <span>Add Parent</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-slate-150 rounded-3xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
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
                                                onClick={() => handleToggleStatus(parent._id, parent.isActive)}
                                                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                    parent.isActive !== false
                                                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                                }`}
                                            >
                                                {parent.isActive !== false ? 'Active' : 'Inactive'}
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
