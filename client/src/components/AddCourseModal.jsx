import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const AddCourseModal = ({ isOpen, onClose, refreshData }) => {
    const { user } = useAuth();
    const [institutes, setInstitutes] = useState([]);
    const [formData, setFormData] = useState({
        name: '', code: '', description: '', instituteId: '', subjects: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchInstitutes = async () => {
                const { data } = await axios.get('/api/setup/institutes');
                setInstitutes(data);
            };
            fetchInstitutes();

            setFormData({
                name: '',
                code: '',
                description: '',
                instituteId: user && user.institute 
                    ? (typeof user.institute === 'object' ? user.institute._id : user.institute) 
                    : '',
                subjects: ''
            });
        }
    }, [isOpen, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {

            

            await axios.post('/api/setup/courses', formData);

            setLoading(false);
            onClose();
            if (refreshData) refreshData();
            
            if (user?.role === 'Editor') {
                toast.success('Course submitted for Admin approval!');
            } else {
                toast.success('Course Added!');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating course');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-24 bg-[#0b1329] relative flex-shrink-0">
                    <div className="absolute inset-0 flex items-center px-8">
                        <h3 className="text-xl font-black text-white tracking-tight">Add New Course</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {user?.role !== 'Institute' && user?.role !== 'Editor' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Select Institute</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all appearance-none cursor-pointer"
                                        required
                                        value={formData.instituteId}
                                        onChange={e => setFormData({ ...formData, instituteId: e.target.value })}
                                    >
                                        <option value="">Select Institute</option>
                                        {institutes.map(inst => (
                                            <option key={inst._id} value={inst._id}>{inst.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. B.Tech Computer Science"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Code</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="CSE-2024"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Batch/Year</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all"
                                        placeholder="2024"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Subjects (comma separated)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all"
                                    required
                                    value={formData.subjects}
                                    onChange={e => setFormData({ ...formData, subjects: e.target.value })}
                                    placeholder="Physics, Maths, C++"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#0b1329] text-white font-bold rounded-2xl shadow-xl shadow-[#0b1329]/10 hover:bg-[#152244] transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Adding Course...' : 'Create Course'}
                        </button>
                    </form>
                </div>
            </div>
            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>,
        document.body
    );
};

export default AddCourseModal;
