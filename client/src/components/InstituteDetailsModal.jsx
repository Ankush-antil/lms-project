import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Building, MapPin, Hash, BookOpen, Clock, Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';

const InstituteDetailsModal = ({ isOpen, onClose, instituteId }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!isOpen || !instituteId) return;

            try {
                setLoading(true);

                

                const { data } = await axios.get(`/api/setup/institutes/${instituteId}`);
                setDetails(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching institute details:", err);
                setError(err.response?.data?.message || "Failed to load details");
                setLoading(false);
            }
        };

        fetchDetails();
    }, [isOpen, instituteId]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Section */}
                <div className="h-32 bg-gradient-to-br from-[#0b1329] to-[#1e293b] relative flex-shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute inset-0 flex items-center px-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white">
                                <Building size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">{loading ? 'Loading...' : details?.name}</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Institutional Overview</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-24 bg-slate-50 rounded-3xl"></div>
                            <div className="space-y-3">
                                <div className="h-4 bg-slate-50 rounded w-1/4"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-20 bg-slate-50 rounded-2xl"></div>
                                    <div className="h-20 bg-slate-50 rounded-2xl"></div>
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-500 font-bold">{error}</p>
                        </div>
                    ) : (
                        <>
                            {/* Basic Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                        <Hash size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Unique Code</p>
                                        <p className="font-bold text-slate-700">{details?.code}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Campus Location</p>
                                        <p className="font-bold text-slate-700 truncate">{details?.address || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Courses Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={18} className="text-[#0b1329]" />
                                        <h4 className="font-bold text-slate-800">Assigned Courses</h4>
                                    </div>
                                    <span className="px-3 py-1 bg-slate-100 text-[#0b1329] rounded-full text-xs font-black">
                                        {details?.courses?.length || 0} TOTAL
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {details?.courses?.length > 0 ? (
                                        details.courses.map((course) => (
                                            <div key={course._id} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/5 transition-all flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-[#0b1329] flex items-center justify-center font-bold transition-colors">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 group-hover:text-[#0b1329] transition-colors">{course.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{course.code}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Status</p>
                                                        <p className="text-xs font-bold text-emerald-500">Live</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400 font-bold">No courses assigned to this institute yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Stats */}
                            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Registration</p>
                                        <p className="text-xs font-bold text-slate-700">Permanent</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Added On</p>
                                        <p className="text-xs font-bold text-slate-700">
                                            {details?.createdAt ? new Date(details.createdAt).toLocaleDateString() : 'Dec 2023'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] transition-all active:scale-95 text-sm"
                    >
                        Dismiss Details
                    </button>
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

export default InstituteDetailsModal;
