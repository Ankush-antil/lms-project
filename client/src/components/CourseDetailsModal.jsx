import { X, BookOpen, FileText, Link as LinkIcon } from 'lucide-react';
import { createPortal } from 'react-dom';

const CourseDetailsModal = ({ isOpen, onClose, course }) => {
    if (!isOpen || !course) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl md:max-h-[92vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-24 bg-[#0b1329] relative flex-shrink-0">
                    <div className="absolute inset-0 flex items-center px-8 gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                            <BookOpen size={20} className="text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">Course Details</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-5">
                    {/* Institute */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute</label>
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700">
                            {course.institute?.name || course.institute || 'N/A'}
                        </div>
                    </div>

                    {/* Course Name */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Name</label>
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700">
                            {course.name}
                        </div>
                    </div>

                    {/* Code + Subjects */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Code</label>
                            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700">
                                {course.code || 'N/A'}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Subjects</label>
                            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 truncate">
                                {Array.isArray(course.subjects) ? course.subjects.join(', ') : (course.subjects || 'N/A')}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course Description</label>
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm text-slate-650 min-h-[80px] whitespace-pre-wrap leading-relaxed">
                            {course.description || 'No description provided.'}
                        </div>
                    </div>

                    {/* Syllabus Section */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block flex items-center gap-1">
                            <FileText size={12} /> Syllabus
                        </label>
                        {course.syllabusUrl ? (
                            course.syllabusType === 'file' ? (
                                <div className="w-full border border-slate-100 bg-slate-50 rounded-2xl py-3 px-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText size={18} className="text-indigo-600 flex-shrink-0" />
                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[280px]">
                                            {course.syllabusUrl.split('/').pop()}
                                        </span>
                                    </div>
                                    <a
                                        href={course.syllabusUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] transition-all active:scale-95 text-center flex-shrink-0"
                                    >
                                        View Syllabus
                                    </a>
                                </div>
                            ) : (
                                <div className="w-full border border-slate-100 bg-slate-50 rounded-2xl py-3 px-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <LinkIcon size={18} className="text-indigo-600 flex-shrink-0" />
                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[280px]">
                                            {course.syllabusUrl}
                                        </span>
                                    </div>
                                    <a
                                        href={course.syllabusUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] transition-all active:scale-95 text-center flex-shrink-0"
                                    >
                                        Open Link
                                    </a>
                                </div>
                            )
                        ) : (
                            <div className="w-full border border-slate-100 bg-slate-50 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-400">
                                No syllabus uploaded for this course.
                            </div>
                        )}
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
