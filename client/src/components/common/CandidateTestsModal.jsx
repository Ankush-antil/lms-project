import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Eye, Trash2, ShieldCheck, Award, Clock } from 'lucide-react';

const CandidateTestsModal = ({ isOpen, onClose, candidate, onViewResponse, onDeleteSubmission }) => {
    if (!isOpen || !candidate) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = async (e, submissionId, testTitle) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete the submission for "${testTitle}"?`)) {
            await onDeleteSubmission(submissionId);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
            <div className="bg-white w-full max-w-3xl rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col animate-slide-up max-h-[85vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-150 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Tests Submitted by {candidate.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 font-mono">{candidate.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Table of Submissions */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                    {candidate.submissions?.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-150 p-6">
                            No submissions found for this user.
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-555 text-xs uppercase tracking-wider font-bold">
                                            <th className="p-4 font-semibold">Test Title</th>
                                            <th className="p-4 font-semibold">Submitted Date</th>
                                            <th className="p-4 font-semibold">Status</th>
                                            <th className="p-4 font-semibold">Score</th>
                                            <th className="p-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {candidate.submissions.map((sub) => {
                                            const isCompleted = sub.completedStatus === 'Completed' || !sub.completedStatus;
                                            return (
                                                <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="p-4 font-bold text-slate-800">
                                                        {sub.test?.title || 'Public Test'}
                                                    </td>
                                                    <td className="p-4 text-slate-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={13} className="text-slate-400" />
                                                            <span>{formatDate(sub.submittedAt)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                            isCompleted
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            {sub.completedStatus || 'Completed'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono font-bold text-indigo-600">
                                                        {sub.score || 0} pts
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => onViewResponse(sub)}
                                                                className="p-1.5 text-slate-450 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                                title="View Response Details"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDelete(e, sub._id, sub.test?.title || 'Public Test')}
                                                                className="p-1.5 text-slate-455 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Delete Submission"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-150 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                        Close
                    </button>
                </div>

                <style>{`
                    .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                    .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                `}</style>
            </div>
        </div>,
        document.body
    );
};

export default CandidateTestsModal;
