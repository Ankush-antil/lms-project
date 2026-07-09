import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Plus, Trash2, Edit, Building, MapPin, Hash, Eye, BookOpen, ChevronRight, Shield, X, Check } from 'lucide-react';
import AddInstituteModal from '../../components/AddInstituteModal';
import EditInstituteModal from '../../components/EditInstituteModal';
import InstituteDetailsModal from '../../components/InstituteDetailsModal';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';

const InstitutesList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
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
    const [controlsPanel, setControlsPanel] = useState(null); // { inst } or null
    const [controlsData, setControlsData] = useState(null);
    const [savingControls, setSavingControls] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);

    const defaultControls = {
        dashboard: { show: true, application: true, staffRequest: true },
        student: { show: true, admissionOpen: true, addStudent: true, editStudent: true },
        teacher: { show: true, hiring: true, addTeacher: true, editTeacher: true },
        editor: { show: true, hiring: true, addEditor: true, editEditor: true },
        course: { show: true, addCourse: true, editCourse: true },
        tools: {
            show: true,
            elementsControl: true,
            inputElements: true,
            displayingElements: true,
            recordingElements: true,
            advanceElements: true,
            addons: true,
            theme: true,
            createWithAi: true,
            integrate: true,
            import: true,
            saveAsTemplate: true,
            decideActivity: true,
            templates: true,
            locationLocked: true,
            logicRules: true,
            monitoring: true,
            connectIt: true,
            profileUnderSettings: true,
            moreSettings: true,
            responses: true,
            collaborate: true,
            manageAccess: true,
            publicToWeb: true
        },
        chat: { show: true }
    };

    const openControlsPanel = (inst) => {
        const merged = {
            dashboard: { ...defaultControls.dashboard, ...inst.controls?.dashboard },
            student: { ...defaultControls.student, ...inst.controls?.student },
            teacher: { ...defaultControls.teacher, ...inst.controls?.teacher },
            editor: { ...defaultControls.editor, ...inst.controls?.editor },
            course: { ...defaultControls.course, ...inst.controls?.course },
            tools: { ...defaultControls.tools, ...inst.controls?.tools },
            chat: { ...defaultControls.chat, ...inst.controls?.chat },
        };
        setControlsData(merged);
        setControlsPanel(inst);
    };

    const handleControlChange = (section, field, value) => {
        setControlsData(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const handleSaveControls = async () => {
        if (!controlsPanel) return;
        setSavingControls(true);
        try {
            await axios.put(`/api/setup/institutes/${controlsPanel._id}`, { controls: controlsData });
            toast.success('Controls saved successfully!');
            setInstitutes(prev => prev.map(i => i._id === controlsPanel._id ? { ...i, controls: controlsData } : i));
            setControlsPanel(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save controls');
        } finally {
            setSavingControls(false);
        }
    };

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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer"
                        title="Recycle Bin"
                    >
                        <Trash2 size={16} className="text-red-500" /> Recycle Bin
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] shadow-xl shadow-[#0b1329]/15 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={20} /> Add New Institute
                    </button>
                </div>
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
                                                        <div 
                                                            className="w-10 h-10 rounded-lg bg-slate-100 text-[#0b1329] flex items-center justify-center font-bold flex-shrink-0 transition-all shadow-sm overflow-hidden cursor-pointer hover:scale-110"
                                                            onClick={() => {
                                                                setSelectedInstitute(inst);
                                                                setIsDetailsModalOpen(true);
                                                            }}
                                                        >
                                                            {inst.imageUrl ? (
                                                                <img src={inst.imageUrl} alt={inst.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Building size={20} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div 
                                                                className="font-extrabold text-slate-800 text-sm cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => {
                                                                    setSelectedInstitute(inst);
                                                                    setIsDetailsModalOpen(true);
                                                                }}
                                                            >
                                                                <TruncatedCell text={inst.name} maxLength={20} />
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                <TruncatedCell text={inst.contactEmail || 'No Email Listed'} maxLength={25} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold">
                                                        {inst.code}
                                                    </span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div 
                                                        className="flex items-center gap-1.5 text-indigo-650 font-black text-xs cursor-pointer hover:underline hover:text-indigo-850"
                                                        onClick={() => navigate(`/${user?.role?.toLowerCase()}/courses?institute=${inst._id}`)}
                                                    >
                                                        <BookOpen size={14} />
                                                        <span>{inst.courseCount || 0} courses</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                                                        <MapPin size={14} className="text-slate-400" />
                                                        <span><TruncatedCell text={inst.address || 'Not specified'} maxLength={20} /></span>
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
                                                        onClick={() => openControlsPanel(inst)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2"
                                                        title="Manage Controls"
                                                    >
                                                        <Shield size={20} />
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

            {/* Controls Panel Modal */}
            {controlsPanel && controlsData && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setControlsPanel(null)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setControlsPanel(null)} />
                    {/* Panel */}
                    <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-800 leading-none">{controlsPanel.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold mt-0.5">Manage Access Controls</p>
                                </div>
                            </div>
                            <button onClick={() => setControlsPanel(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - scrollable */}
                        <div className="overflow-y-auto p-7 space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-700 font-semibold flex items-center gap-2">
                                <Shield size={13} className="shrink-0" />
                                Uncheck items to hide them from this institute's admin panel.
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Dashboard */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-sm font-extrabold text-slate-800">Dashboard Page</span>
                                        <input type="checkbox" checked={controlsData.dashboard?.show !== false} onChange={e => handleControlChange('dashboard', 'show', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                                    </div>
                                    {controlsData.dashboard?.show !== false && (
                                        <div className="pl-1 space-y-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.dashboard?.application !== false} onChange={e => handleControlChange('dashboard', 'application', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Applications Tab
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.dashboard?.staffRequest !== false} onChange={e => handleControlChange('dashboard', 'staffRequest', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Staff Requests Tab
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Students */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-sm font-extrabold text-slate-800">Student Page</span>
                                        <input type="checkbox" checked={controlsData.student?.show !== false} onChange={e => handleControlChange('student', 'show', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                                    </div>
                                    {controlsData.student?.show !== false && (
                                        <div className="pl-1 space-y-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.student?.admissionOpen !== false} onChange={e => handleControlChange('student', 'admissionOpen', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Admission Toggle
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.student?.addStudent !== false} onChange={e => handleControlChange('student', 'addStudent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Add Student Button
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.student?.editStudent !== false} onChange={e => handleControlChange('student', 'editStudent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Edit Student Button
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Teachers */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-sm font-extrabold text-slate-800">Teacher Page</span>
                                        <input type="checkbox" checked={controlsData.teacher?.show !== false} onChange={e => handleControlChange('teacher', 'show', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                                    </div>
                                    {controlsData.teacher?.show !== false && (
                                        <div className="pl-1 space-y-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.teacher?.hiring !== false} onChange={e => handleControlChange('teacher', 'hiring', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Hiring Toggle
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.teacher?.addTeacher !== false} onChange={e => handleControlChange('teacher', 'addTeacher', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Add Teacher Button
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.teacher?.editTeacher !== false} onChange={e => handleControlChange('teacher', 'editTeacher', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Edit Teacher Button
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Editors */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-sm font-extrabold text-slate-800">Editor Page</span>
                                        <input type="checkbox" checked={controlsData.editor?.show !== false} onChange={e => handleControlChange('editor', 'show', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                                    </div>
                                    {controlsData.editor?.show !== false && (
                                        <div className="pl-1 space-y-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.editor?.hiring !== false} onChange={e => handleControlChange('editor', 'hiring', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Hiring Toggle
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.editor?.addEditor !== false} onChange={e => handleControlChange('editor', 'addEditor', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Add Editor Button
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.editor?.editEditor !== false} onChange={e => handleControlChange('editor', 'editEditor', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Edit Editor Button
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Courses */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-sm font-extrabold text-slate-800">Course Page</span>
                                        <input type="checkbox" checked={controlsData.course?.show !== false} onChange={e => handleControlChange('course', 'show', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                                    </div>
                                    {controlsData.course?.show !== false && (
                                        <div className="pl-1 space-y-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.course?.addCourse !== false} onChange={e => handleControlChange('course', 'addCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Add Course Button
                                            </label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={controlsData.course?.editCourse !== false} onChange={e => handleControlChange('course', 'editCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Edit Course Button
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Activities */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-sm font-extrabold text-slate-800">Tools Page</span>
                                        <input type="checkbox" checked={controlsData.tools?.show !== false} onChange={e => handleControlChange('tools', 'show', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                                    </div>
                                    {controlsData.tools?.show !== false && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-1 pt-1">
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.elementsControl !== false} onChange={e => handleControlChange('tools', 'elementsControl', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Elements Control
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.inputElements !== false} onChange={e => handleControlChange('tools', 'inputElements', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Input Elements
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.displayingElements !== false} onChange={e => handleControlChange('tools', 'displayingElements', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Displaying Elements
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.recordingElements !== false} onChange={e => handleControlChange('tools', 'recordingElements', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Recording Elements
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.advanceElements !== false} onChange={e => handleControlChange('tools', 'advanceElements', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Advance Elements
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.addons !== false} onChange={e => handleControlChange('tools', 'addons', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Addons
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.theme !== false} onChange={e => handleControlChange('tools', 'theme', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Theme
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.createWithAi !== false} onChange={e => handleControlChange('tools', 'createWithAi', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Create With AI
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.integrate !== false} onChange={e => handleControlChange('tools', 'integrate', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Integrate
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.import !== false} onChange={e => handleControlChange('tools', 'import', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Import
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.saveAsTemplate !== false} onChange={e => handleControlChange('tools', 'saveAsTemplate', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Save As Template
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.decideActivity !== false} onChange={e => handleControlChange('tools', 'decideActivity', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Decide Activity
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.templates !== false} onChange={e => handleControlChange('tools', 'templates', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Templates
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.locationLocked !== false} onChange={e => handleControlChange('tools', 'locationLocked', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Location Locked
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.logicRules !== false} onChange={e => handleControlChange('tools', 'logicRules', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Logic Rules
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.monitoring !== false} onChange={e => handleControlChange('tools', 'monitoring', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Monitoring
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.connectIt !== false} onChange={e => handleControlChange('tools', 'connectIt', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Connect It
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.profileUnderSettings !== false} onChange={e => handleControlChange('tools', 'profileUnderSettings', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Profile Under Settings
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.moreSettings !== false} onChange={e => handleControlChange('tools', 'moreSettings', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                More Settings
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.responses !== false} onChange={e => handleControlChange('tools', 'responses', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Responses
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.collaborate !== false} onChange={e => handleControlChange('tools', 'collaborate', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Collaborate
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.manageAccess !== false} onChange={e => handleControlChange('tools', 'manageAccess', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Manage Access
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer select-none">
                                                <input type="checkbox" checked={controlsData.tools?.publicToWeb !== false} onChange={e => handleControlChange('tools', 'publicToWeb', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                                                Public To Web
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Chat */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-extrabold text-slate-800">Chat Page</span>
                                        <input type="checkbox" checked={controlsData.chat?.show !== false} onChange={e => handleControlChange('chat', 'show', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 px-7 py-5 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setControlsPanel(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveControls}
                                disabled={savingControls}
                                className="flex-1 py-3 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {savingControls && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {savingControls ? 'Saving...' : <><Check size={16} /> Save Controls</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <RecycleBinModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title="Institutes Recycle Bin"
                trashUrl="/api/setup/institutes/trash"
                onRestoreSuccess={fetchData}
                restoreUrlPattern={(id) => `/api/setup/institutes/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/setup/institutes/${id}/permanent`}
                renderItemDetail={(item) => `Code: ${item.code} | Email: ${item.contactEmail}`}
            />
        </DashboardLayout>
    );
};

export default InstitutesList;

