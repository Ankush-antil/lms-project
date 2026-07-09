import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    Plus, FolderPlus, FileUp, FolderUp, List, Grid, Check,
    ChevronRight, Folder, File, Trash2, Download, ExternalLink,
    Search, ArrowLeft, Loader2, RefreshCw, MoreVertical, HardDrive, X
} from 'lucide-react';

import GoogleDriveModal from '../../components/common/GoogleDriveModal';

const VIEW_MODE_OPTIONS = [
    { value: 'extra-large', label: 'Giant Gallery', icon: Grid },
    { value: 'large', label: 'Spacious Gallery', icon: Grid },
    { value: 'medium', label: 'Balanced Grid', icon: Grid },
    { value: 'small', label: 'Compact Grid', icon: Grid },
    { value: 'list', label: 'Simple List', icon: List },
    { value: 'details', label: 'Detailed Sheet', icon: List },
    { value: 'tiles', label: 'Landscape Cards', icon: Grid },
    { value: 'content', label: 'Descriptive List', icon: List }
];

const AdminDrive = () => {
    const { user } = useAuth();

    const canPerform = (feature, subAction) => {
        if (user?.role !== 'Accountant') return true;
        const ctrl = user.accountantProfile?.controls?.[feature];
        if (!ctrl) return true;
        if (ctrl.enabled === false) return false;
        return ctrl[subAction] !== false;
    };

    const [items, setItems] = useState([]);
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const [currentParentId, setCurrentParentId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('details'); // default 'details'
    const [viewMenuOpen, setViewMenuOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
    
    // Search
    const [searchTerm, setSearchTerm] = useState('');

    // Dropdown & Modal states
    const [newMenuOpen, setNewMenuOpen] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [showGDriveModal, setShowGDriveModal] = useState(false);
    
    // File/Folder upload progress states
    const [uploadProgress, setUploadProgress] = useState({ uploading: false, current: 0, total: 0 });

    // Refs for clicks outside
    const newMenuRef = useRef(null);
    const viewMenuRef = useRef(null);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    // Fetch items
    const fetchItems = async () => {
        try {
            setLoading(true);
            const parentQuery = currentParentId ? `?parentId=${currentParentId}` : '';
            const { data } = await axios.get(`/api/drive${parentQuery}`);
            setItems(data.items);
            setBreadcrumbs(data.breadcrumbs || []);
            setLoading(false);
        } catch (error) {
            console.error("Error loading drive items:", error);
            toast.error("Failed to load drive items");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [currentParentId]);

    // Close "+ New" and "View" dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
                setNewMenuOpen(false);
            }
            if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) {
                setViewMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleContextMenu = (e) => {
        // If the right click target is an input, textarea, button, or link, use standard browser menu
        if (e.target.closest('input, textarea, button, a')) {
            return;
        }
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY
        });
    };

    useEffect(() => {
        const handleCloseContextMenu = () => {
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
        };
        document.addEventListener('click', handleCloseContextMenu);
        document.addEventListener('keydown', handleCloseContextMenu);
        return () => {
            document.removeEventListener('click', handleCloseContextMenu);
            document.removeEventListener('keydown', handleCloseContextMenu);
        };
    }, []);

    // Create New Folder
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!canPerform('drive', 'uploadFiles')) {
            return toast.error("You do not have permission to create folders / upload files");
        }
        if (!folderName.trim()) return;

        try {
            await axios.post('/api/drive/folder', {
                name: folderName,
                parentId: currentParentId
            });
            toast.success("Folder created successfully");
            setFolderName('');
            setShowFolderModal(false);
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create folder");
        }
    };

    // Trigger File Input Click
    const handleFileSelect = () => {
        setNewMenuOpen(false);
        fileInputRef.current.click();
    };

    // Trigger Folder Input Click
    const handleFolderSelect = () => {
        setNewMenuOpen(false);
        folderInputRef.current.click();
    };

    // File Upload Handler
    const handleFileUpload = async (e) => {
        if (!canPerform('drive', 'uploadFiles')) {
            e.target.value = '';
            return toast.error("You do not have permission to upload files");
        }
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadProgress({ uploading: true, current: 0, total: files.length });

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            if (currentParentId) {
                formData.append('parentId', currentParentId);
            }

            try {
                await axios.post('/api/drive/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
            }

            setUploadProgress(prev => ({ ...prev, current: i + 1 }));
        }

        toast.success(`Uploaded ${successCount} of ${files.length} file(s)`);
        setUploadProgress({ uploading: false, current: 0, total: 0 });
        e.target.value = ''; // Reset input
        fetchItems();
    };

    // Folder Upload Handler
    const handleFolderUpload = async (e) => {
        if (!canPerform('drive', 'uploadFiles')) {
            e.target.value = '';
            return toast.error("You do not have permission to upload folders / files");
        }
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadProgress({ uploading: true, current: 0, total: files.length });

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            
            // Get relative path (e.g. folder/subfolder/file.txt)
            const relativePath = file.webkitRelativePath || file.name;
            formData.append('relativePath', relativePath);

            if (currentParentId) {
                formData.append('parentId', currentParentId);
            }

            try {
                await axios.post('/api/drive/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
            }

            setUploadProgress(prev => ({ ...prev, current: i + 1 }));
        }

        toast.success(`Uploaded ${successCount} file(s) into folder structure`);
        setUploadProgress({ uploading: false, current: 0, total: 0 });
        e.target.value = ''; // Reset input
        fetchItems();
    };

    // Delete item
    const handleDelete = async (id, name) => {
        if (!canPerform('drive', 'deleteFiles')) {
            return toast.error("You do not have permission to delete files / folders");
        }
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                await axios.delete(`/api/drive/${id}`);
                toast.success('Deleted successfully');
                fetchItems();
            } catch (error) {
                toast.error('Failed to delete item');
            }
        }
    };

    // Helper for formatting file size
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderItems = () => {
        if (filteredItems.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <Folder size={48} className="text-slate-350 mb-3" />
                    <p className="text-sm font-bold text-slate-500">This folder is empty</p>
                    <p className="text-xs text-slate-400 mt-1">Use the "+ New" button to upload files or create folders.</p>
                </div>
            );
        }

        switch (viewMode) {
            case 'details':
                return (
                    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        <th className="p-4 pl-6 font-bold">Name</th>
                                        <th className="p-4 font-bold">Uploaded By</th>
                                        <th className="p-4 font-bold">Uploaded At</th>
                                        <th className="p-4 font-bold">Size</th>
                                        <th className="p-4 text-right pr-6 font-bold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                    {filteredItems.map((item) => (
                                        <tr key={item._id} className="hover:bg-slate-50/50 group transition-colors">
                                            <td className="p-4 pl-6">
                                                {item.type === 'folder' ? (
                                                    <button
                                                        onClick={() => setCurrentParentId(item._id)}
                                                        className="flex items-center gap-3 text-left font-bold text-slate-800 hover:text-indigo-650"
                                                    >
                                                        <Folder size={18} className="text-amber-500 fill-amber-500/10 shrink-0" />
                                                        <span className="truncate max-w-[240px]">{item.name}</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <File size={18} className="text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[240px]">{item.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs font-bold">
                                                {item.uploadedBy?.name || 'Admin'}
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs">
                                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs">
                                                {item.type === 'folder' ? '—' : formatBytes(item.fileSize)}
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    {item.type === 'file' && (
                                                        <>
                                                            <a
                                                                href={item.fileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                                                title="View / Open File"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </a>
                                                            <a
                                                                href={`${item.fileUrl}?download=true`}
                                                                download={item.name}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                                                title="Download"
                                                            >
                                                                <Download size={16} />
                                                            </a>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(item._id, item.name)}
                                                        className="p-1.5 text-slate-400 hover:text-red-655 hover:bg-slate-100 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'list':
                return (
                    <div className="bg-white border border-slate-100 rounded-3xl p-3 shadow-sm divide-y divide-slate-100">
                        {filteredItems.map((item) => (
                            <div key={item._id} className="flex items-center justify-between py-2.5 px-4 hover:bg-slate-50/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    {item.type === 'folder' ? (
                                        <button
                                            onClick={() => setCurrentParentId(item._id)}
                                            className="flex items-center gap-2.5 text-left font-bold text-slate-800 hover:text-indigo-650"
                                        >
                                            <Folder size={16} className="text-amber-500 fill-amber-500/10 shrink-0" />
                                            <span>{item.name}</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2.5">
                                            <File size={16} className="text-slate-400 shrink-0" />
                                            <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.type === 'file' && (
                                        <a
                                            href={`${item.fileUrl}?download=true`}
                                            download={item.name}
                                            className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-650 rounded-lg transition-all"
                                        >
                                            <Download size={14} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleDelete(item._id, item.name)}
                                        className="p-1.5 hover:bg-red-50 text-slate-455 hover:text-red-600 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'tiles':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredItems.map((item) => (
                            <div key={item._id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow transition-all group">
                                <div className="flex items-center gap-3 min-w-0">
                                    {item.type === 'folder' ? (
                                        <button
                                            onClick={() => setCurrentParentId(item._id)}
                                            className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0"
                                        >
                                            <Folder size={18} className="fill-amber-500/10" />
                                        </button>
                                    ) : (
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-450 shrink-0">
                                            <File size={18} />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h5 
                                            className={`text-sm font-bold text-slate-800 truncate ${item.type === 'folder' ? 'cursor-pointer hover:text-indigo-650' : ''}`}
                                            onClick={() => item.type === 'folder' && setCurrentParentId(item._id)}
                                        >
                                            {item.name}
                                        </h5>
                                        <p className="text-[10px] text-slate-400 font-bold">{item.type === 'folder' ? 'Folder' : formatBytes(item.fileSize)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.type === 'file' && (
                                        <a
                                            href={`${item.fileUrl}?download=true`}
                                            download={item.name}
                                            className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-800 rounded-lg transition-all"
                                        >
                                            <Download size={14} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleDelete(item._id, item.name)}
                                        className="p-1.5 hover:bg-red-50 text-slate-455 hover:text-red-600 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'content':
                return (
                    <div className="flex flex-col gap-3">
                        {filteredItems.map((item) => (
                            <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow transition-all group gap-2">
                                <div className="flex items-center gap-3">
                                    {item.type === 'folder' ? (
                                        <button
                                            onClick={() => setCurrentParentId(item._id)}
                                            className="flex items-center gap-3 text-left font-bold text-slate-800 hover:text-indigo-655"
                                        >
                                            <Folder size={20} className="text-amber-500 fill-amber-500/10 shrink-0" />
                                            <span>{item.name}</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <File size={20} className="text-slate-400 shrink-0" />
                                            <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-450 font-bold sm:justify-end">
                                    <span>Type: {item.type === 'folder' ? 'Folder' : 'File'}</span>
                                    <span>Size: {item.type === 'folder' ? '—' : formatBytes(item.fileSize)}</span>
                                    <span>Owner: {item.uploadedBy?.name || 'Admin'}</span>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                        {item.type === 'file' && (
                                            <a
                                                href={`${item.fileUrl}?download=true`}
                                                download={item.name}
                                                className="p-1 hover:bg-indigo-50 text-indigo-650 rounded"
                                            >
                                                <Download size={14} />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleDelete(item._id, item.name)}
                                            className="p-1 hover:bg-red-50 text-red-655 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'extra-large':
            case 'large':
            case 'medium':
            case 'small':
            default:
                let gridClass = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6";
                let cardClass = "p-5 min-h-[160px]";
                let iconSize = 48;
                if (viewMode === 'extra-large') {
                    gridClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8";
                    cardClass = "p-7 min-h-[200px]";
                    iconSize = 64;
                } else if (viewMode === 'medium') {
                    gridClass = "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4";
                    cardClass = "p-4 min-h-[130px]";
                    iconSize = 36;
                } else if (viewMode === 'small') {
                    gridClass = "grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3";
                    cardClass = "p-3 min-h-[100px]";
                    iconSize = 24;
                }

                return (
                    <div className={gridClass}>
                        {filteredItems.map((item) => (
                            <div 
                                key={item._id} 
                                className={`bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative ${cardClass}`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    {item.type === 'folder' ? (
                                        <button
                                            onClick={() => setCurrentParentId(item._id)}
                                            className="bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 hover:scale-105 transition-transform"
                                            style={{ width: iconSize + 16, height: iconSize + 16 }}
                                        >
                                            <Folder size={iconSize} className="fill-amber-500/10" />
                                        </button>
                                    ) : (
                                        <div 
                                            className="bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"
                                            style={{ width: iconSize + 16, height: iconSize + 16 }}
                                        >
                                            <File size={iconSize} />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.type === 'file' && (
                                            <a
                                                href={`${item.fileUrl}?download=true`}
                                                download={item.name}
                                                className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-650 rounded-xl transition-all"
                                            >
                                                <Download size={13} />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleDelete(item._id, item.name)}
                                            className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded-xl transition-all"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <h4 
                                        className={`text-sm font-bold text-slate-800 truncate mb-1 ${item.type === 'folder' ? 'cursor-pointer hover:text-indigo-650' : ''}`}
                                        onClick={() => item.type === 'folder' && setCurrentParentId(item._id)}
                                    >
                                        {item.name}
                                    </h4>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                        <span>{item.type === 'folder' ? 'Folder' : formatBytes(item.fileSize)}</span>
                                        <span>
                                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <>
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="flex flex-col gap-6 min-h-[75vh]" onContextMenu={handleContextMenu}>
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Drive Storage</h1>
                        <p className="text-slate-500 text-sm">Manage files, folders, and resources.</p>
                    </div>

                    {/* View mode toggle pill dropdown (Windows Explorer style) */}
                    <div className="flex items-center gap-3">
                        <div className="relative" ref={viewMenuRef}>
                            <button
                                onClick={() => setViewMenuOpen(!viewMenuOpen)}
                                className="flex items-center bg-slate-100/80 hover:bg-slate-200/80 p-2.5 px-4 rounded-full border border-slate-200/80 text-xs font-bold text-slate-700 transition-all gap-2 cursor-pointer select-none active:scale-95 shadow-sm"
                            >
                                {['details', 'list', 'content'].includes(viewMode) ? (
                                    <List size={16} />
                                ) : (
                                    <Grid size={16} />
                                )}
                                <span>View Options</span>
                            </button>

                            {viewMenuOpen && (
                                <div className="absolute right-0 mt-2.5 w-52 bg-[#f6f6f6] border border-slate-350 rounded-2xl shadow-xl z-[90] p-1.5 flex flex-col animate-fade-in">
                                    {VIEW_MODE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setViewMode(opt.value);
                                                setViewMenuOpen(false);
                                            }}
                                            className="flex items-center w-full px-3 py-2 hover:bg-slate-200/60 text-left text-xs font-bold text-slate-800 transition-all relative pl-7 rounded-xl"
                                        >
                                            {viewMode === opt.value && (
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-800 font-extrabold text-base leading-none">•</span>
                                            )}
                                            <div className="flex items-center gap-2.5">
                                                <opt.icon size={15} className="text-slate-500" />
                                                <span>{opt.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Operations bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        {/* "+ New" Dropdown Wrapper */}
                        {canPerform('drive', 'uploadFiles') && (
                            <div className="relative" ref={newMenuRef}>
                                <button
                                    onClick={() => setNewMenuOpen(!newMenuOpen)}
                                    className="flex items-center gap-2.5 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 shadow-sm hover:shadow font-bold text-sm transition-all cursor-pointer active:scale-95"
                                >
                                    <Plus size={18} className="text-indigo-600" strokeWidth={2.5} />
                                    <span>New</span>
                                </button>

                                {newMenuOpen && (
                                    <div className="absolute left-0 mt-2.5 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-[90] p-2 animate-fade-in">
                                        <button
                                            onClick={() => {
                                                setNewMenuOpen(false);
                                                setShowFolderModal(true);
                                            }}
                                            className="flex items-center gap-3.5 w-full p-3 hover:bg-slate-50 rounded-xl text-left text-sm font-semibold text-slate-700 transition-colors"
                                        >
                                            <FolderPlus size={18} className="text-slate-500" />
                                            <span>New folder</span>
                                        </button>
                                        <button
                                            onClick={handleFileSelect}
                                            className="flex items-center gap-3.5 w-full p-3 hover:bg-slate-50 rounded-xl text-left text-sm font-semibold text-slate-700 transition-colors border-t border-slate-100 mt-1 pt-3"
                                        >
                                            <FileUp size={18} className="text-slate-500" />
                                            <span>File upload</span>
                                        </button>
                                        <button
                                            onClick={handleFolderSelect}
                                            className="flex items-center gap-3.5 w-full p-3 hover:bg-slate-50 rounded-xl text-left text-sm font-semibold text-slate-700 transition-colors"
                                        >
                                            <FolderUp size={18} className="text-slate-500" />
                                            <span>Folder upload</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Integrate Button */}
                        <button
                            onClick={() => toast('Coming Soon', { icon: '⏳' })}
                            className="flex items-center gap-2.5 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 shadow-sm hover:shadow font-bold text-sm transition-all cursor-pointer active:scale-95"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Google Drive" className="w-5 h-5 shrink-0" />
                            <span>Integrate</span>
                        </button>
                    </div>

                    {/* Hidden Inputs for upload */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        className="hidden"
                    />
                    <input
                        type="file"
                        ref={folderInputRef}
                        onChange={handleFolderUpload}
                        webkitdirectory="true"
                        directory="true"
                        multiple
                        className="hidden"
                    />

                    {/* Search inside current folder */}
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search in this folder..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-full py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Navigation / Breadcrumbs Bar */}
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 select-none overflow-x-auto py-1">
                    <button
                        onClick={() => setCurrentParentId(null)}
                        className={`hover:text-indigo-650 flex items-center gap-1 ${!currentParentId ? 'text-indigo-600 font-bold' : ''}`}
                    >
                        <HardDrive size={16} />
                        <span>My Drive</span>
                    </button>

                    {breadcrumbs.map((crumb) => (
                        <div key={crumb._id} className="flex items-center gap-2 shrink-0">
                            <ChevronRight size={14} className="text-slate-400" />
                            <button
                                onClick={() => setCurrentParentId(crumb._id)}
                                className={`hover:text-indigo-650 ${currentParentId === crumb._id ? 'text-indigo-600 font-bold' : ''}`}
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Upload Progress Alert */}
                {uploadProgress.uploading && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md flex items-center justify-between gap-4 animate-pulse">
                        <div className="flex items-center gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">Uploading folder/files...</h4>
                                <p className="text-xs text-slate-500">Processing {uploadProgress.current} of {uploadProgress.total} items</p>
                            </div>
                        </div>
                        <div className="w-40 bg-slate-100 rounded-full h-2">
                            <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Items Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                        <span className="text-sm font-bold text-slate-500">Loading drive items...</span>
                    </div>
                ) : (
                    renderItems()
                )}
            </div>

            {/* Folder creation Modal */}
            {showFolderModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-800">New Folder</h3>
                            <button
                                onClick={() => {
                                    setShowFolderModal(false);
                                    setFolderName('');
                                }}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder} className="space-y-4">
                            <input
                                required
                                autoFocus
                                type="text"
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                                placeholder="Folder Name"
                            />
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFolderModal(false);
                                        setFolderName('');
                                    }}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl transition-all shadow-md"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>

        {/* Custom Context Menu on Right Click */}
        {contextMenu.visible && (
            <div 
                className="fixed bg-white border border-slate-100 rounded-2xl shadow-xl z-[9999] p-2 flex flex-col min-w-[200px] animate-fade-in border-slate-200/50"
                style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            >
                <button
                    onClick={() => {
                        setContextMenu({ ...contextMenu, visible: false });
                        setShowFolderModal(true);
                    }}
                    className="flex items-center gap-3.5 w-full p-3 hover:bg-slate-50 rounded-xl text-left text-sm font-bold text-slate-700 transition-colors"
                >
                    <FolderPlus size={18} className="text-slate-500" />
                    <span>New folder</span>
                </button>
                <button
                    onClick={() => {
                        setContextMenu({ ...contextMenu, visible: false });
                        handleFileSelect();
                    }}
                    className="flex items-center gap-3.5 w-full p-3 hover:bg-slate-50 rounded-xl text-left text-sm font-bold text-slate-700 transition-colors border-t border-slate-100 mt-1 pt-3"
                >
                    <FileUp size={18} className="text-slate-500" />
                    <span>File upload</span>
                </button>
                <button
                    onClick={() => {
                        setContextMenu({ ...contextMenu, visible: false });
                        handleFolderSelect();
                    }}
                    className="flex items-center gap-3.5 w-full p-3 hover:bg-slate-50 rounded-xl text-left text-sm font-bold text-slate-700 transition-colors"
                >
                    <FolderUp size={18} className="text-slate-500" />
                    <span>Folder upload</span>
                </button>
            </div>
        )}

        {/* Google Drive Integration Modal */}
        <GoogleDriveModal
            isOpen={showGDriveModal}
            onClose={() => setShowGDriveModal(false)}
        />
        </>
    );
};

export default AdminDrive;
