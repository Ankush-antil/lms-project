import { useState } from 'react';
import { X, BookOpen, Building, Hash, FileText, Calendar, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

const CourseDetailsModal = ({ isOpen, onClose, course }) => {
    if (!isOpen || !course) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-white/40 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl md:max-h-[85vh] rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-32 bg-gradient-to-br from-[#0b1329] to-[#1e293b] relative flex-shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute inset-0 flex items-center px-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white">
                                <BookOpen size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">{course.name}</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Course Curriculum Overview</p>
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

                {/* Modal Body */}
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                <Hash size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Course Code</p>
                                <p className="font-bold text-slate-700">{course.code || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                <Building size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Institute</p>
                                <p className="font-bold text-slate-700 truncate">{course.institute?.name || course.institute || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {course.description && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</h4>
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 text-sm text-slate-650 leading-relaxed">
                                {course.description}
                            </div>
                        </div>
                    )}

                    {/* Subjects List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subjects Included</h4>
                            <span className="px-3 py-1 bg-slate-100 text-[#0b1329] rounded-full text-xs font-black">
                                {course.subjects?.length || 0} TOTAL
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {course.subjects && course.subjects.length > 0 ? (
                                course.subjects.map((sub, idx) => (
                                    <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 shadow-sm hover:border-slate-200 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                            <FileText size={16} />
                                        </div>
                                        <span className="font-semibold text-slate-750 text-sm">{sub}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-400 font-bold">No subjects defined for this course.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Details Info */}
                    <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-505 flex items-center justify-center">
                                <CheckCircle size={16} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                                <p className="text-xs font-bold text-emerald-600 capitalize">{course.status || 'Active'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                                <Calendar size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Created On</p>
                                <p className="text-xs font-bold text-slate-700">
                                    {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer buttons */}
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

export default CourseDetailsModal;
