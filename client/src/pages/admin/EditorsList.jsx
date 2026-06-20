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

const EditorsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');

    const [editors, setEditors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/users?role=Editor');
            setEditors(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching editors:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
        editor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Editors Management</h1>
                    <p className="text-slate-500">Manage platform editors and track their activity.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Add New Editor
                </button>
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
                                            Loading editors...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEditors.length > 0 ? (
                                filteredEditors.map((editor) => (
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
                                                    className="font-medium text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => openProfile(editor._id)}
                                                >
                                                    {editor.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-sm whitespace-nowrap">{editor._id.slice(-6)}</td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">{editor.institute?.name || editor.institute || 'N/A'}</td>
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">{editor.mobileNumber || 'N/A'}</td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">{editor.email}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${editor.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {editor.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(editor);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2"
                                                title="Edit Editor"
                                            >
                                                <Edit size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(editor._id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                title="Delete Editor"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
                                        No editors found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
        </DashboardLayout>
    );
};

export default EditorsList;
