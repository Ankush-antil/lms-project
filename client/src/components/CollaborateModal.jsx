import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Users, CheckSquare, Square } from 'lucide-react';

const CollaborateModal = ({ isOpen, onClose, test, onSuccess }) => {
    const [editors, setEditors] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (isOpen && test) {
            // Set initial state from test collaborators
            const initialIds = test.collaborators ? test.collaborators.map(c => typeof c === 'object' ? c._id : c) : [];
            setSelectedIds(initialIds);

            const fetchEditors = async () => {
                setFetching(true);
                try {
                    const { data } = await axios.get('/api/tests/editors');
                    setEditors(data);
                } catch (error) {
                    console.error('Error fetching editors:', error);
                    toast.error('Failed to load institute editors');
                } finally {
                    setFetching(false);
                }
            };
            fetchEditors();
        }
    }, [isOpen, test]);

    const handleToggle = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put(`/api/tests/${test._id}/collaborate`, {
                collaboratorIds: selectedIds
            });
            toast.success('Collaboration settings updated!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating collaboration:', error);
            toast.error(error.response?.data?.message || 'Failed to update collaboration');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !test) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md md:rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col max-h-[85vh]">
                {/* Header Banner */}
                <div className="h-20 bg-[#0b1329] relative flex-shrink-0 flex items-center px-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl text-white">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-white tracking-tight leading-none">Share Assessment</h3>
                            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">Collaborate on: {test.title}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden p-6">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
                        <p className="text-xs text-slate-500 font-semibold mb-4">
                            Select other editors from your institute to give them permission to view and edit this test.
                        </p>

                        {fetching ? (
                            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-slate-400 font-bold">Loading editors...</span>
                            </div>
                        ) : editors.length > 0 ? (
                            <div className="space-y-2">
                                {editors.map(editor => {
                                    const isSelected = selectedIds.includes(editor._id);
                                    return (
                                        <div
                                            key={editor._id}
                                            onClick={() => handleToggle(editor._id)}
                                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                                                isSelected 
                                                    ? 'border-purple-600/30 bg-purple-50/40 text-purple-950 font-bold' 
                                                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/50 text-slate-700'
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">{editor.name}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{editor.email}</span>
                                            </div>
                                            <div className={isSelected ? 'text-purple-600' : 'text-slate-300'}>
                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-xs font-bold">
                                No other editors found in your institute.
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || fetching}
                        className="w-full py-3.5 bg-[#0b1329] hover:bg-[#152244] text-white font-bold rounded-2xl shadow-xl shadow-[#0b1329]/10 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? 'Saving Settings...' : 'Save Settings'}
                    </button>
                </form>
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

export default CollaborateModal;
