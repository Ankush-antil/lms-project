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
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState(null);

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

    return (
        <DashboardLayout role="Admin">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
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

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
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
                            ) : filteredInstitutes.length > 0 ? (
                                filteredInstitutes.map((inst) => (
                                    <tr key={inst._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0b1329] flex items-center justify-center font-bold flex-shrink-0 transition-all shadow-sm">
                                                    <Building size={20} />
                                                </div>
                                                <span className="font-medium text-slate-800">{inst.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600">{inst.code}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold ${inst.courseCount > 0 ? 'text-[#0b1329]' : 'text-slate-400'}`}>
                                                    {inst.courseCount} Courses
                                                </span>
                                                {inst.courses?.length > 0 && (
                                                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                        {inst.courses.map(c => c.name).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-slate-600 truncate max-w-[200px] block">{inst.address || 'N/A'}</span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-100">
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
            </div>

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

