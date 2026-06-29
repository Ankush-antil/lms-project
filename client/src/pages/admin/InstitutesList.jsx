import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Plus, Trash2, Edit, Building, MapPin, Hash, Eye, BookOpen, ChevronRight } from 'lucide-react';
import AddInstituteModal from '../../components/AddInstituteModal';
import EditInstituteModal from '../../components/EditInstituteModal';
import InstituteDetailsModal from '../../components/InstituteDetailsModal';

const InstitutesList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'pending'
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);

    const fetchPendingRequests = async () => {
        try {
            setLoadingRequests(true);
            const { data } = await axios.get('/api/registration-requests/admin');
            setPendingRequests(data);
            setLoadingRequests(false);
        } catch (err) {
            console.error("Error fetching pending requests:", err);
            toast.error("Failed to load registration requests");
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPendingRequests();
        }
    }, [activeTab]);

    const handleResolveRequest = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this institute request?`)) return;
        try {
            setResolvingId(id);
            await axios.put(`/api/registration-requests/${id}/admin-resolve`, { status });
            toast.success(`Request ${status.toLowerCase()} successfully`);
            setPendingRequests(prev => prev.filter(r => r._id !== id));
            if (status === 'Approved') {
                fetchData();
            }
        } catch (err) {
            console.error("Error resolving request:", err);
            toast.error(err.response?.data?.message || "Failed to resolve request");
        } finally {
            setResolvingId(null);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchData = async () => {
        try {
            setLoading(true);

            
            // Controller now returns courseCount and a slice of courses via aggregate
            const { data } = await axios.get('/api/setup/institutes');
            setInstitutes(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching institutes:", error);
            toast.error("Failed to load institutes");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this institute? This may affect users and courses associated with it.')) {
            try {

                
                await axios.delete(`/api/setup/institutes/${id}`);
                setInstitutes(institutes.filter(i => i._id !== id));
                toast.success('Institute deleted successfully');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting institute');
            }
        }
    };

    const filteredInstitutes = institutes.filter(inst =>
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredInstitutes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInstitutes = filteredInstitutes.slice(startIndex, startIndex + itemsPerPage);

    return (
        <DashboardLayout role="Admin">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Institutes Management</h1>
                    <p className="text-slate-500">Manage partner institutions and campuses.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] shadow-xl shadow-[#0b1329]/15 transition-all active:scale-95"
                >
                    <Plus size={20} /> Add New Institute
                </button>
            </div>

            {/* Tabs switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit mb-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'active' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-650 hover:text-slate-900'}`}
                >
                    Active Institutes
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'pending' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-650 hover:text-slate-900'}`}
                >
                    Pending Approvals
                    {pendingRequests.length > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-extrabold h-4 px-1.5 rounded-full flex items-center justify-center">
                            {pendingRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'active' ? (
                <>
                    {/* Search */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by Name, Code or Location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-[#0b1329] rounded-lg">
                            <Building size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wider">{institutes.length} Institutes</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold whitespace-nowrap">Institution Name</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Code</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Courses</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Location</th>
                                        <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        [1, 2, 3].map(n => (
                                            <tr key={n} className="animate-pulse">
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                                                <td className="p-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                                            </tr>
                                        ))
                                    ) : paginatedInstitutes.length > 0 ? (
                                        paginatedInstitutes.map((inst) => (
                                            <tr key={inst._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0b1329] flex items-center justify-center font-bold flex-shrink-0 transition-all shadow-sm overflow-hidden">
                                                            {inst.imageUrl ? (
                                                                <img src={inst.imageUrl} alt={inst.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Building size={20} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-extrabold text-slate-800 text-sm">{inst.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{inst.contactEmail || 'No Email Listed'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold">
                                                        {inst.code}
                                                    </span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-indigo-650 font-black text-xs">
                                                        <BookOpen size={14} />
                                                        <span>{inst.courseCount || 0} courses</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                                                        <MapPin size={14} className="text-slate-400" />
                                                        <span>{inst.address || 'Not specified'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] z-10">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInstitute(inst);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-[#0b1329] hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInstitute(inst);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-[#0b1329] hover:bg-slate-100 rounded-lg transition-colors ml-2"
                                                        title="Edit Institute"
                                                    >
                                                        <Edit size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(inst._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                        title="Delete Institute"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-slate-500">
                                                No institutes found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredInstitutes.length > 0 && (
                            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                                <div className="text-sm font-semibold text-slate-500">
                                    Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                                    <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredInstitutes.length)}</span> of{' '}
                                    <span className="text-slate-700">{filteredInstitutes.length}</span> entries
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
                                                                : 'text-slate-650 hover:bg-slate-100 bg-transparent'
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
                </>
            ) : (
                /* Pending Approvals View */
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in text-left">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border border-slate-200 text-slate-505 text-xs font-bold uppercase tracking-wider">
                                    <th className="p-4 font-semibold whitespace-nowrap">Institution Name</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Requested Code</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Contact Email</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Phone</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Location/Address</th>
                                    <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                {loadingRequests ? (
                                    [1, 2, 3].map(n => (
                                        <tr key={n} className="animate-pulse">
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                                            <td className="p-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : pendingRequests.length > 0 ? (
                                    pendingRequests.map((req) => (
                                        <tr key={req._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 whitespace-nowrap font-extrabold text-slate-800">{req.name}</td>
                                            <td className="p-4 whitespace-nowrap font-mono text-xs">
                                                <span className="bg-indigo-50 text-indigo-705 px-2 py-0.5 rounded font-black">
                                                    {req.instituteDetails?.code || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 font-semibold">{req.email}</td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 font-semibold">{req.phone || 'N/A'}</td>
                                            <td className="p-4 whitespace-nowrap text-slate-500 font-semibold">{req.instituteDetails?.address || 'N/A'}</td>
                                            <td className="p-4 whitespace-nowrap text-right sticky right-0 bg-white border-l border-slate-200 z-10 space-x-2">
                                                <button
                                                    onClick={() => handleResolveRequest(req._id, 'Approved')}
                                                    disabled={resolvingId !== null}
                                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleResolveRequest(req._id, 'Rejected')}
                                                    disabled={resolvingId !== null}
                                                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-slate-400 font-bold text-sm">
                                            No pending institute registration requests.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AddInstituteModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                refreshData={fetchData}
            />

            <EditInstituteModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedInstitute(null);
                }}
                refreshData={fetchData}
                institute={selectedInstitute}
            />

            <InstituteDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedInstitute(null);
                }}
                instituteId={selectedInstitute?._id}
            />
        </DashboardLayout>
    );
};

export default InstitutesList;

