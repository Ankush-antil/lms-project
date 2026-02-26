import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const EditInstituteModal = ({ isOpen, onClose, refreshData, institute }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (institute) {
            setName(institute.name || '');
            setCode(institute.code || '');
            setAddress(institute.address || '');
        }
    }, [institute]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {

            

            await axios.put(`/api/setup/institutes/${institute._id}`, { name, code, address });

            setLoading(false);
            onClose();
            if (refreshData) refreshData();
            toast.success('Institute Updated!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating institute');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 relative flex-shrink-0">
                    <div className="absolute inset-0 flex items-center px-8">
                        <h3 className="text-xl font-black text-white tracking-tight">Edit Institute</h3>
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
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Global Tech University"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute Code</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                    required
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    placeholder="e.g. GTU-01"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Campus Address</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all min-h-[100px] resize-none"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="Enter full address..."
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Updating Institute...' : 'Save Changes'}
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

export default EditInstituteModal;
