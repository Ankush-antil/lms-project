import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, FileText, Cloud, Database, Download, Trash, ArrowLeft, Loader2, AlertCircle, Info, Folder, RefreshCw, Save, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import { saveLocalBlob, getLocalBlob, deleteLocalBlob } from '../../../utils/indexedDB';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';

const FileUploadPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    // Parse selected date and inbox param
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    const inboxParam = searchParams.get('inbox');
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    const getSessionTimestamp = () => {
        const activeDate = dateParam || todayDdMmYyyy;
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        return `${activeDate}, ${timeStr}`;
    };

    // States
    const [drafts, setDrafts] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Local History Modal State
    const [localHistoryModalOpen, setLocalHistoryModalOpen] = useState(false);

    // Active Gallery View: 'local' | 'cloud'
    const [galleryTab, setGalleryTab] = useState('local');

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [cloudLoading, setCloudLoading] = useState(false);

    // Local files state
    const [localFiles, setLocalFiles] = useState([]);

    // Hydrate offline files from IndexedDB and LocalStorage
    const loadLocalFiles = async () => {
        const saved = localStorage.getItem('practice_file_uploads');
        if (saved) {
            try {
                const list = JSON.parse(saved);
                const hydrated = await Promise.all(list.map(async (f) => {
                    const blob = await getLocalBlob(f.id);
                    if (blob) {
                        return { ...f, url: URL.createObjectURL(blob) };
                    }
                    return f;
                }));
                setLocalFiles(hydrated);
            } catch (e) {
                console.error("Failed to load local file uploads:", e);
                setLocalFiles([]);
            }
        } else {
            setLocalFiles([]);
        }
    };

    useEffect(() => {
        loadLocalFiles();
    }, []);

    // Filter local files only by inbox param (no date filter for local files)
    const filteredLocalFiles = useMemo(() => {
        let filtered = localFiles;
        if (inboxParam) {
            filtered = filtered.filter(f => f.inbox === inboxParam);
        }
        return filtered;
    }, [localFiles, inboxParam]);

    // Filter cloud files by selected date and inbox param
    const filteredCloudFiles = useMemo(() => {
        let filtered = cloudFiles;
        if (dateParam) {
            filtered = filtered.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
        }
        if (inboxParam) {
            filtered = filtered.filter(c => c.inbox === inboxParam);
        }
        return filtered;
    }, [cloudFiles, dateParam, inboxParam]);

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setCloudLoading(true);
            const url = inboxParam ? `/api/practice-files?inbox=${encodeURIComponent(inboxParam)}` : '/api/practice-files';
            const res = await axios.get(url);
            // Filter files by toolType
            const toolFiles = res.data.files.filter(f => f.toolType === 'file-uploader');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes,
                limit: res.data.limitBytes
            });
        } catch (err) {
            console.error("Failed to fetch cloud files:", err);
        } finally {
            setCloudLoading(false);
        }
    };

    // Load cloud files on mount
    useEffect(() => {
        fetchCloudFiles();
    }, []);

    // Drag handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (isReadOnly) {
            toast.error("Saving files is disabled in Read-Only archive.");
            return;
        }
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            addFileToDrafts(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            addFileToDrafts(e.target.files[0]);
        }
    };

    const addFileToDrafts = (file) => {
        if (isReadOnly) {
            toast.error("Saving files is disabled in Read-Only archive.");
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            toast.error("File exceeds the 100MB size limit.");
            return;
        }
        const draftId = 'draft_' + Date.now();
        const newDraft = {
            id: draftId,
            name: file.name,
            blob: file,
            size: formatBytes(file.size),
            mimeType: file.type || 'application/octet-stream',
            timestamp: getSessionTimestamp(),
            inbox: inboxParam || ''
        };
        setDrafts(prev => [newDraft, ...prev]);
        toast.success("File added to drafts!");
    };

    // Save Selected Draft File to Local DB
    const handleSaveDraft = async (draft) => {
        if (isReadOnly) {
            toast.error("Saving files is disabled in Read-Only archive.");
            return;
        }
        
        try {
            setUploading(true);
            const fileId = 'file_' + Date.now();
            
            // Save to IndexedDB
            const success = await saveLocalBlob(fileId, draft.blob);
            if (!success) {
                throw new Error("Failed to write to local storage.");
            }

            // Save metadata to localStorage
            const newLocalFile = {
                id: fileId,
                name: draft.name,
                timestamp: getSessionTimestamp(),
                size: draft.size,
                mimeType: draft.mimeType,
                synced: false,
                inbox: inboxParam || ''
            };

            const updatedList = [newLocalFile, ...localFiles];
            setLocalFiles(updatedList);
            localStorage.setItem('practice_file_uploads', JSON.stringify(updatedList.map(f => ({ ...f, url: '' }))));

            setDrafts(prev => prev.filter(d => d.id !== draft.id));
            toast.success("File saved locally to workspace!");
            
            // Reload files
            loadLocalFiles();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save file locally.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDraft = (id) => {
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success("Draft discarded.");
    };

    // Sync local unsynced files with cloud
    const handleSyncWithCloud = async () => {
        if (isReadOnly) {
            toast.error("Syncing files is disabled in Read-Only archive.");
            return;
        }
        const unsynced = filteredLocalFiles.filter(f => !f.synced);
        if (unsynced.length === 0) {
            toast.success("All local files are synced!");
            return;
        }

        const toastId = toast.loading(`Syncing ${unsynced.length} files...`);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const blob = await getLocalBlob(item.id);
                if (!blob) continue;

                // Overall storage limit check
                if (cloudSpace.used + blob.size > cloudSpace.limit) {
                    toast.error(`Sync aborted: cloud space limit exceeded.`, { id: toastId });
                    break;
                }

                const formData = new FormData();
                formData.append('file', blob, item.name);
                formData.append('toolType', 'file-uploader');
                if (item.inbox) {
                    formData.append('inbox', item.inbox);
                }

                await axios.post('/api/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Sync error for item:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    toast.error(`Sync aborted: ${errMsg}`, { id: toastId });
                    localStorage.setItem('practice_file_uploads', JSON.stringify(localFiles.map(f => ({ ...f, url: '' }))));
                    fetchCloudFiles();
                    return;
                }
            }
        }

        localStorage.setItem('practice_file_uploads', JSON.stringify(localFiles.map(f => ({ ...f, url: '' }))));
        await fetchCloudFiles();
        await loadLocalFiles();
        
        if (successCount > 0) {
            toast.success(`Successfully synced ${successCount} files!`, { id: toastId });
        } else {
            toast.error("Failed to sync files.", { id: toastId });
        }
    };

    const handleSyncSingleWithCloud = async (item) => {
        if (isReadOnly) {
            toast.error("Syncing files is disabled in Read-Only archive.");
            return;
        }
        const toastId = toast.loading(`Syncing ${item.name}...`);
        try {
            const blob = await getLocalBlob(item.id);
            if (!blob) {
                throw new Error("File not found locally.");
            }

            if (cloudSpace.used + blob.size > cloudSpace.limit) {
                throw new Error("Cloud space limit exceeded.");
            }

            const formData = new FormData();
            formData.append('file', blob, item.name);
            formData.append('toolType', 'file-uploader');
            if (item.inbox) {
                formData.append('inbox', item.inbox);
            }

            await axios.post('/api/practice-files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Mark as synced
            setLocalFiles(prev => {
                const updated = prev.map(f => f.id === item.id ? { ...f, synced: true } : f);
                localStorage.setItem('practice_file_uploads', JSON.stringify(updated.map(f => ({ ...f, url: '' }))));
                return updated;
            });

            toast.success("File synced to cloud successfully!", { id: toastId });
            await fetchCloudFiles();
            loadLocalFiles();
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.message || err.message || "Sync failed.";
            toast.error(`Sync failed: ${errMsg}`, { id: toastId });
        }
    };

    const handleSyncSingleWithDrive = async (item) => {
        if (isReadOnly) {
            toast.error("Google Drive upload is disabled in Read-Only archive.");
            return;
        }
        const blob = await getLocalBlob(item.id);
        if (!blob) {
            toast.error("Local file not found.");
            return;
        }
        setDriveFileMeta({
            name: item.name,
            blob: blob,
            itemId: item.id
        });
        setDriveModalOpen(true);
    };

    // Save to Google Drive Click
    const handleSaveToDriveClick = async (file) => {
        if (isReadOnly) {
            toast.error("Google Drive upload is disabled in Read-Only archive.");
            return;
        }

        // If specific cloud file passed
        if (file && file.fileUrl) {
            try {
                const res = await axios.get(file.fileUrl, { responseType: 'blob' });
                setDriveFileMeta({
                    name: file.filename,
                    blob: res.data
                });
                setDriveModalOpen(true);
            } catch (err) {
                console.error("Failed to retrieve file blob for drive upload:", err);
                toast.error("Could not fetch file for Google Drive upload.");
            }
            return;
        }

        // Otherwise save the latest local file
        if (filteredLocalFiles.length === 0) {
            toast.error("No local files to save. Save a file locally first.");
            return;
        }
        const latest = filteredLocalFiles[0];
        const blob = await getLocalBlob(latest.id);
        if (!blob) {
            toast.error("Local file not found.");
            return;
        }
        setDriveFileMeta({
            name: latest.name,
            blob: blob
        });
        setDriveModalOpen(true);
    };

    // Delete local file
    const handleDeleteLocalFile = async (id) => {
        if (isReadOnly) {
            toast.error("Cannot delete files in Read-Only archive.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this file from local storage?")) {
            try {
                const updated = localFiles.filter(f => f.id !== id);
                setLocalFiles(updated);
                localStorage.setItem('practice_file_uploads', JSON.stringify(updated.map(f => ({ ...f, url: '' }))));
                await deleteLocalBlob(id);
                toast.success("File deleted from local storage!");
                loadLocalFiles();
            } catch (err) {
                console.error("Delete error:", err);
                toast.error("Failed to delete local file.");
            }
        }
    };

    // Delete cloud file
    const handleDeleteCloudFile = async (id) => {
        if (isReadOnly) {
            toast.error("Cannot delete files in Read-Only archive.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this file from cloud?")) {
            try {
                await axios.delete(`/api/practice-files/${id}`);
                toast.success("File deleted successfully!");
                fetchCloudFiles();
            } catch (err) {
                console.error(err);
                toast.error("Failed to delete file.");
            }
        }
    };

    // Helper to format bytes
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const getFileIcon = (mimeType) => {
        return FileText;
    };

    return (
        <DashboardLayout role={user?.role || 'Student'} fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-2 text-left">
                {/* Back Link & Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Cloud className="text-indigo-605" size={20} />
                            File Uploader {isReadOnly && <span className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-md font-bold uppercase tracking-wider">Preview Only</span>}
                        </h1>
                    </div>

                    {/* Center: Data Settings Quick Access */}
                    <div className="flex items-center gap-3 flex-wrap border rounded-xl p-3 bg-gray-100 h-15 w-[800px] justify-center">
                        {/* Local Data */}
                        <button
                            onClick={() => setLocalHistoryModalOpen(true)}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Go to Local Data"
                        >
                            <Folder size={13} className="text-indigo-500 shrink-0" />
                            <span className="hidden sm:inline">Data on Local Cloud</span>
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredLocalFiles.length}</span>
                        </button>

                        {/* Cloud Data */}
                        <button
                            onClick={async () => {
                                setGalleryTab('cloud');
                                await fetchCloudFiles();
                                setCloudGalleryModalOpen(true);
                            }}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Go to Cloud Data"
                        >
                            <Database size={13} className="text-indigo-500 shrink-0" />
                            <span className="hidden sm:inline">Data on DS Cloud</span>
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredCloudFiles.length}</span>
                        </button>

                        {/* Drive History */}
                        <button
                            onClick={() => {
                                setDriveFileMeta({ name: '', blob: null });
                                setDriveModalOpen(true);
                            }}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-600 hover:text-amber-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Go to Drive History"
                        >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                            </svg>
                            <span className="hidden sm:inline">Data On Google Drive</span>
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            if (user?.role && user.role !== 'Student') {
                                navigate(`/${user.role.toLowerCase()}/tools`);
                            } else {
                                navigate(inboxParam ? `/student/tests?tab=practice` : `/student/practice-tools?date=${dateParam || todayDdMmYyyy}`);
                            }
                        }}
                        className="h-[65px] w-45 flex items-center gap-1.5 text-slate-550 hover:text-slate-800 transition-colors font-bold text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto shadow-sm cursor-pointer"
                    >
                        <ArrowLeft size={14} />
                        Back to Practice Tools
                    </button>
                </div>

                {isReadOnly && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-2.5 text-xs font-semibold leading-relaxed">
                        <AlertCircle className="text-amber-600 shrink-0" size={16} />
                        <div>
                            <p className="font-bold">Past Workspace Preview (Read-Only)</p>
                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are viewing files captured on {dateParam}. Saving new files, deleting, or syncing files is disabled for this day.</p>
                        </div>
                    </div>
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column: Upload Interface & Lists */}
                    <div className="lg:col-span-9 space-y-6">
                                              {/* Compact Upload Action Bar */}
                        <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`bg-white px-5 py-4 rounded-3xl border shadow-sm flex items-center justify-between gap-4 flex-wrap transition-all duration-200 ${
                                dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                    <Upload className="text-indigo-650" size={18} />
                                </div>
                                <div className="text-left font-sans">
                                    <p className="font-extrabold text-slate-800 text-sm leading-tight">File Uploader</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        Select or drop any file to save locally as draft
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input 
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={isReadOnly}
                                />
                                <button
                                    disabled={isReadOnly}
                                    onClick={() => !isReadOnly && fileInputRef.current?.click()}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer ${
                                        isReadOnly
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                            : 'bg-indigo-600 hover:bg-indigo-750 text-white shadow-indigo-200'
                                    }`}
                                >
                                    <Upload size={14} />
                                    <span>{isReadOnly ? 'Read-Only' : 'Choose File'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Draft Content Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Draft Content</span>
                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 font-bold rounded-full">
                                    {drafts.length} Drafts
                                </span>
                            </h3>
                            {drafts.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    No draft files. Choose or drag a file to see drafts here.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                    {drafts.map((draft) => (
                                        <div key={draft.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150 hover:border-slate-350 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                                    <FileText className="text-amber-600" size={18} />
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className="text-xs font-bold text-slate-700 truncate" title={draft.name}>
                                                        {draft.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                        Size: {draft.size} • {draft.mimeType}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Save Button */}
                                                <button
                                                    onClick={() => handleSaveDraft(draft)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-750 transition-all active:scale-95 shadow-sm cursor-pointer"
                                                    title="Save to Local Storage"
                                                >
                                                    <Save size={14} />
                                                    <span>Save</span>
                                                </button>
                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.id)}
                                                    className="px-3 py-1.5 bg-white text-slate-800 border-2 border-slate-800 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all cursor-pointer"
                                                    title="Delete Draft"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Saved Content Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Saved Content</span>
                                <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-805 font-bold rounded-full">
                                    {filteredLocalFiles.length} Saved
                                </span>
                            </h3>
                            {filteredLocalFiles.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    No saved files found for this date.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {filteredLocalFiles.map((item, index) => {
                                        const FileIcon = getFileIcon(item.mimeType);
                                        return (
                                            <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150 hover:border-slate-350 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider shrink-0 font-sans">
                                                        File {filteredLocalFiles.length - index}
                                                    </span>
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                                        <FileIcon className="text-indigo-650" size={18} />
                                                    </div>
                                                    <div className="min-w-0 text-left">
                                                        <span className="text-xs font-bold text-slate-700 block truncate" title={item.name}>
                                                            {item.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                                                            Size: {item.size} • {item.mimeType} • {item.timestamp}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* Sync with Cloud Indicator / Sync Button */}
                                                    {item.synced ? (
                                                        <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold font-sans">
                                                            <CheckCircle size={14} className="text-emerald-600" />
                                                            <span>Synced</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSyncSingleWithCloud(item)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-extrabold hover:bg-indigo-100 transition-all cursor-pointer font-sans"
                                                            title="Sync with Cloud"
                                                        >
                                                            <Cloud size={14} />
                                                            <span className="text-[9px] leading-none text-left">Not Sync<br />Click to Sync</span>
                                                        </button>
                                                    )}

                                                    {/* Google Drive Sync Indicator / Sync Button */}
                                                    {item.driveSynced ? (
                                                        <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold font-sans">
                                                            <CheckCircle size={14} className="text-amber-600" />
                                                            <span>Drive Synced</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSyncSingleWithDrive(item)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[10px] font-extrabold hover:bg-amber-100 transition-all cursor-pointer font-sans"
                                                            title="Sync with Google Drive"
                                                        >
                                                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                                                                <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                                                <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                                                <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                                            </svg>
                                                            <span className="text-[9px] leading-none text-left">Not Sync<br />Click to Sync</span>
                                                        </button>
                                                    )}

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleDeleteLocalFile(item.id)}
                                                        className="p-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                                                        title="Delete Local File"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Settings Panel */}
                    <div className="lg:col-span-3 space-y-3 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Settings</h3>

                            {/* Storage Status */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Storage Used</label>
                                <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                                    <span>{(cloudSpace.used / (1024 * 1024)).toFixed(1)}MB</span>
                                    <span>300MB</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                                    <div 
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Storage Limit Notice */}
                            <div className="p-3.5 bg-indigo-50/20 rounded-xl border border-indigo-50 text-[10px] text-indigo-700/80 font-bold leading-normal font-sans text-left">
                                Files uploaded to the cloud count towards your 300MB student account storage limit. You can access these files from this screen anytime.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Google Drive Modal */}
            <GoogleDriveModal 
                isOpen={driveModalOpen}
                onClose={() => {
                    setDriveModalOpen(false);
                    setDriveFileMeta({ name: '', blob: null });
                }}
                fileName={driveFileMeta.name}
                fileBlob={driveFileMeta.blob}
                onSaveSuccess={(driveData) => {
                    toast.success("Saved to Google Drive!");
                    if (driveFileMeta.itemId) {
                        const driveFileViewUrl = driveData?.id
                            ? `https://drive.google.com/file/d/${driveData.id}/view`
                            : driveData?.webViewLink || null;

                        setLocalFiles(prev => {
                            const updated = prev.map(f =>
                                f.id === driveFileMeta.itemId
                                    ? { ...f, driveSynced: true, driveUrl: driveFileViewUrl }
                                    : f
                            );
                            localStorage.setItem('practice_file_uploads', JSON.stringify(updated.map(f => ({ ...f, url: '' }))));
                            return updated;
                        });
                    } else if (localFiles.length > 0) {
                        setLocalFiles(prev => {
                            const updated = [...prev];
                            updated[0].driveSynced = true;
                            localStorage.setItem('practice_file_uploads', JSON.stringify(updated.map(f => ({ ...f, url: '' }))));
                            return updated;
                        });
                    }
                    setDriveModalOpen(false);
                    fetchCloudFiles();
                    loadLocalFiles();
                }}
                toolName="File Uploader"
            />

            {/* Local Storage Virtual History Modal */}
            <LocalHistoryModal
                isOpen={localHistoryModalOpen}
                readOnly={isReadOnly}
                onClose={() => {
                    setLocalHistoryModalOpen(false);
                    loadLocalFiles();
                }}
                onRefresh={() => {
                    loadLocalFiles();
                }}
            />
        </DashboardLayout>
    );
};

export default FileUploadPage;
