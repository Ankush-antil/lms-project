import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, FileText, Cloud, Database, Download, Trash, ArrowLeft, Loader2, AlertCircle, Info, Folder, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import { saveLocalBlob, getLocalBlob, deleteLocalBlob } from '../../../utils/indexedDB';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';

const FileUploadPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
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

    // Filter local files by selected date and inbox param
    const filteredLocalFiles = useMemo(() => {
        let filtered = localFiles;
        if (dateParam) {
            filtered = filtered.filter(f => parseDateToDdMmYyyy(f.timestamp) === dateParam);
        }
        if (inboxParam) {
            filtered = filtered.filter(f => f.inbox === inboxParam);
        }
        return filtered;
    }, [localFiles, dateParam, inboxParam]);

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
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // Save Selected File to Local DB
    const handleSaveLocal = async (e) => {
        e.preventDefault();
        if (isReadOnly) {
            toast.error("Saving files is disabled in Read-Only archive.");
            return;
        }
        if (!selectedFile) {
            toast.error("Please select a file.");
            return;
        }

        if (selectedFile.size > 100 * 1024 * 1024) {
            toast.error("File exceeds the 100MB size limit.");
            return;
        }

        const fileId = 'file_' + Date.now();
        
        try {
            setUploading(true);
            
            // Save to IndexedDB
            const success = await saveLocalBlob(fileId, selectedFile);
            if (!success) {
                throw new Error("Failed to write to local storage.");
            }

            // Save metadata to localStorage
            const newLocalFile = {
                id: fileId,
                name: selectedFile.name,
                timestamp: getSessionTimestamp(),
                size: formatBytes(selectedFile.size),
                mimeType: selectedFile.type || 'application/octet-stream',
                synced: false,
                inbox: inboxParam || ''
            };

            const updatedList = [newLocalFile, ...localFiles];
            setLocalFiles(updatedList);
            localStorage.setItem('practice_file_uploads', JSON.stringify(updatedList.map(f => ({ ...f, url: '' }))));

            toast.success("File saved locally to workspace!");
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            // Reload files
            loadLocalFiles();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save file locally.");
        } finally {
            setUploading(false);
        }
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
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50/50 rounded-3xl overflow-hidden font-sans border border-slate-200">
                {/* ── HEADER BANNER ───────────────────────────────────── */}
                <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(inboxParam ? `/student/tests?tab=practice` : `/student/practice-tools?date=${dateParam || todayDdMmYyyy}`)}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-650 transition-all active:scale-95 cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="text-left">
                            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">
                                File Uploader
                            </h1>
                            <p className="text-xs font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">
                                Practice environment • {dateParam || todayDdMmYyyy}
                            </p>
                        </div>
                    </div>

                    {/* Storage Status */}
                    <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center gap-2">
                            <Cloud size={16} className="text-indigo-500" />
                            <div className="text-left leading-none">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Storage Used</span>
                                <span className="text-xs font-extrabold text-slate-750">
                                    {(cloudSpace.used / (1024 * 1024)).toFixed(1)}MB / 300MB
                                </span>
                            </div>
                        </div>
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }}
                            />
                        </div>
                    </div>
                </header>

                {/* ── CONTENT BODY ────────────────────────────────────── */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
                    {/* LEFT PANEL: Upload Interface */}
                    <section className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between overflow-y-auto text-left shadow-sm">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-800">Save Files to Workspace</h2>
                                <p className="text-xs font-medium text-slate-450 mt-1">
                                    Select or drop any file to save locally. Sync to cloud storage when ready. Max file size: 100MB.
                                </p>
                            </div>

                            {/* Warning or read-only banner */}
                            {isReadOnly && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-amber-900">
                                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <p className="font-bold">Archive Workspace (Read-Only)</p>
                                        <p className="text-amber-800/80 text-[11px] mt-0.5">
                                            You are viewing a past workspace date. File saving and deletions are disabled.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Drag and Drop Zone */}
                            <form 
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onSubmit={handleSaveLocal}
                                className="space-y-4"
                            >
                                <div 
                                    onClick={() => !isReadOnly && fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-3 transition-all ${
                                        isReadOnly 
                                            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60' 
                                            : dragActive
                                                ? 'border-indigo-500 bg-indigo-50/20'
                                                : 'border-slate-300 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-400 cursor-pointer'
                                    }`}
                                >
                                    <input 
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        disabled={isReadOnly}
                                    />
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                        <Upload size={22} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-slate-700">
                                            {selectedFile ? selectedFile.name : 'Choose a file or drag it here'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                            {selectedFile ? formatBytes(selectedFile.size) : 'Any format (DOCX, PDF, Zip, Image, Audio, Video, etc)'}
                                        </p>
                                    </div>
                                </div>

                                {/* Save Button */}
                                {!isReadOnly && (
                                    <button
                                        type="submit"
                                        disabled={uploading || !selectedFile}
                                        className="w-full py-3.5 bg-[#0b1329] text-white font-extrabold rounded-2xl shadow-xl hover:bg-[#152244] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm cursor-pointer"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Saving File Locally...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Folder size={16} />
                                                <span>Save to Local Workspace</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </form>
                        </div>

                        {/* Note about limits */}
                        <div className="mt-8 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-start gap-3">
                            <Info className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                            <div className="text-xs leading-relaxed text-slate-500">
                                <p className="font-bold text-slate-755">Important Notice</p>
                                <p className="text-[11px] mt-0.5">Files uploaded to the cloud count towards your 300MB student account storage limit. You can access these files anytime from this screen or share them with teachers during assignments.</p>
                            </div>
                        </div>
                    </section>

                    {/* RIGHT PANEL: Data Settings & Local vs Cloud Gallery */}
                    <aside className="w-full md:w-96 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col overflow-y-auto text-left shadow-sm space-y-6">
                        {/* Data Settings Widget */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">
                                Data Settings
                            </h3>
                            <div className="space-y-2.5">
                                {/* Save in Google Drive */}
                                <button
                                    onClick={() => handleSaveToDriveClick()}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                                >
                                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                        <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                        <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                    </svg>
                                    <div className="text-left flex-1">
                                        <p>Save in Google Drive</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Upload Latest File</span>
                                    </div>
                                </button>

                                {/* Go to Drive History */}
                                <button
                                    onClick={() => {
                                        setDriveFileMeta({ name: '', blob: null });
                                        setDriveModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                                >
                                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                        <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                        <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                    </svg>
                                    <div className="text-left flex-1">
                                        <p>Go to Drive History</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            View & Manage Drive Folders
                                        </span>
                                    </div>
                                </button>
                                
                                {/* Go to Local Data */}
                                <button
                                    onClick={() => setLocalHistoryModalOpen(true)}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                    <Folder className="text-[#3E3ADD] shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredLocalFiles.length} Local Files • View structured folders
                                        </span>
                                    </div>
                                </button>
                                
                                {/* Go to Cloud Data */}
                                <button
                                    onClick={async () => {
                                        setGalleryTab('cloud');
                                        await fetchCloudFiles();
                                        toast.success("Switched to Cloud Storage Gallery");
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        galleryTab === 'cloud'
                                            ? 'bg-[#3e3add]/10 border-indigo-200 text-indigo-850 shadow-sm'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'
                                    }`}
                                >
                                    <Database className="text-[#3E3ADD] shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredCloudFiles.length} Cloud Files • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB
                                        </span>
                                    </div>
                                </button>
                                
                                {/* Sync with Cloud */}
                                <button
                                    disabled={isReadOnly}
                                    onClick={handleSyncWithCloud}
                                    className={`w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer ${
                                        isReadOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'
                                    }`}
                                >
                                    <RefreshCw className="text-[#3E3ADD] shrink-0 animate-hover-spin" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredLocalFiles.filter(f => !f.synced).length} files not synced
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local vs Cloud Gallery */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                                    {galleryTab === 'local' ? 'Local Files' : 'Cloud Files'}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-655 font-black text-[9px] uppercase tracking-wider">
                                    {galleryTab === 'local' ? 'Offline' : 'Server'}
                                </span>
                            </div>

                            {/* Gallery List */}
                            {galleryTab === 'local' ? (
                                filteredLocalFiles.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs italic font-medium">
                                        No local files found for this date.
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                        {filteredLocalFiles.map(f => {
                                            const FileIcon = getFileIcon(f.mimeType);
                                            return (
                                                <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-bold text-slate-700 truncate text-left" title={f.name}>{f.name}</p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5 text-left">Size: {f.size} • {f.mimeType}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteLocalFile(f.id)}
                                                            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                                            title="Delete Local File"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                /* Cloud Gallery List */
                                cloudLoading ? (
                                    <div className="text-center py-6 text-xs text-slate-450 animate-pulse font-bold uppercase tracking-wider">Loading Cloud Data...</div>
                                ) : filteredCloudFiles.length === 0 ? (
                                    <p className="text-xs text-slate-450 italic text-center py-4">No cloud files found. Click "Sync with Cloud" to upload.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                        {filteredCloudFiles.map(c => {
                                            const FileIcon = getFileIcon(c.mimeType);
                                            return (
                                                <div key={c._id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-bold text-slate-700 truncate text-left" title={c.filename}>{c.filename}</p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5 text-left">{(c.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => handleSaveToDriveClick(c)}
                                                                className="p-1.5 hover:bg-slate-100 rounded text-[#3E3ADD] cursor-pointer"
                                                                title="Save to Google Drive"
                                                            >
                                                                <Database size={13} />
                                                            </button>
                                                            {!isReadOnly && (
                                                                <button
                                                                    onClick={() => handleDeleteCloudFile(c._id)}
                                                                    className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-655 cursor-pointer"
                                                                    title="Delete from Cloud"
                                                                >
                                                                    <Trash size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>
                    </aside>
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
                onSaveSuccess={() => {
                    toast.success("Saved to Google Drive!");
                    setDriveModalOpen(false);
                    fetchCloudFiles();
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
