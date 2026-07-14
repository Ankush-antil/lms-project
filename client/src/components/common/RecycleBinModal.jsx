import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, RotateCcw, Trash2, Loader2, AlertTriangle, Search } from 'lucide-react';

const RecycleBinModal = ({
    isOpen,
    onClose,
    title = 'Recycle Bin',
    trashUrl,
    onRestoreSuccess,
    restoreUrlPattern, // (id) => `/api/.../${id}/restore`
    permanentDeleteUrlPattern, // (id) => `/api/.../${id}/permanent`
    renderItemDetail = (item) => item.email || item.code || ''
}) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState(null); // tracking loading state for restore/delete
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const fetchTrashItems = async () => {
        if (!trashUrl) return;
        try {
            setLoading(true);
            const res = await axios.get(trashUrl);
            setItems(res.data);
        } catch (error) {
            console.error('Error fetching trash items:', error);
            toast.error('Failed to load trash items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTrashItems();
            setSearchTerm('');
            setConfirmDeleteId(null);
        }
    }, [isOpen, trashUrl]);

    if (!isOpen) return null;

    const handleRestore = async (id) => {
        try {
            setActionId(id);
            const url = typeof restoreUrlPattern === 'function' ? restoreUrlPattern(id) : restoreUrlPattern.replace(':id', id);
            await axios.put(url);
            toast.success('Item restored successfully');
            setItems(prev => prev.filter(item => item._id !== id));
            if (onRestoreSuccess) onRestoreSuccess();
        } catch (error) {
            console.error('Error restoring item:', error);
            toast.error(error.response?.data?.message || 'Failed to restore item');
        } finally {
            setActionId(null);
        }
    };

    const handlePermanentDelete = async (id) => {
        try {
            setActionId(id);
            const url = typeof permanentDeleteUrlPattern === 'function' ? permanentDeleteUrlPattern(id) : permanentDeleteUrlPattern.replace(':id', id);
            await axios.delete(url);
            toast.success('Item permanently deleted');
            setItems(prev => prev.filter(item => item._id !== id));
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Error deleting item permanently:', error);
            toast.error(error.response?.data?.message || 'Failed to delete item permanently');
        } finally {
            setActionId(null);
        }
    };

    const filteredItems = items.filter(item => {
        const name = (item.name || item.title || '').toLowerCase();
        const detail = renderItemDetail(item).toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || detail.includes(term);
    });

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center sm:p-4 font-sans animate-fade-in">
            <div className="bg-white w-full h-full sm:h-auto max-w-2xl sm:max-h-[80vh] rounded-none sm:rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col animate-slide-up">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-150 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Trash2 size={20} className="text-red-500 animate-pulse" /> {title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Items here can be restored back to their original sections.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                {items.length > 0 && (
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search in Recycle Bin..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            <span className="text-sm font-semibold text-slate-400">Loading deleted items...</span>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
                                <Trash2 size={28} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700">Recycle Bin is empty</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                {searchTerm ? "No deleted items match your search term." : "Deleted items will appear here and can be restored at any time."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredItems.map(item => {
                                const isConfirming = confirmDeleteId === item._id;
                                const isActionRunning = actionId === item._id;

                                return (
                                    <div 
                                        key={item._id} 
                                        className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                                            isConfirming 
                                                ? 'bg-red-50/30 border-red-200 shadow-sm' 
                                                : 'bg-white hover:bg-slate-50/50 border-slate-150'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-800 truncate">
                                                {item.name || item.title || 'Untitled'}
                                            </h4>
                                            <p className="text-xs text-slate-450 truncate mt-0.5">
                                                {renderItemDetail(item)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                                            {isConfirming ? (
                                                <div className="flex items-center gap-1.5 animate-fade-in">
                                                    <span className="text-[11px] font-black text-red-650 flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Confirm delete?
                                                    </span>
                                                    <button
                                                        disabled={isActionRunning}
                                                        onClick={() => handlePermanentDelete(item._id)}
                                                        className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                                    >
                                                        {isActionRunning ? <Loader2 size={12} className="animate-spin" /> : 'Yes, Delete'}
                                                    </button>
                                                    <button
                                                        disabled={isActionRunning}
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        disabled={isActionRunning || actionId !== null}
                                                        onClick={() => handleRestore(item._id)}
                                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-1 text-xs font-bold border border-slate-150 bg-white cursor-pointer"
                                                        title="Restore Item"
                                                    >
                                                        {isActionRunning ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                                        Restore
                                                    </button>
                                                    <button
                                                        disabled={isActionRunning || actionId !== null}
                                                        onClick={() => setConfirmDeleteId(item._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-150 bg-white cursor-pointer"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <style>{`
                    .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                    .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                `}</style>
            </div>
        </div>,
        document.body
    );
};

export default RecycleBinModal;
