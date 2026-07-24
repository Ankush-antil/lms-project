import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Megaphone, Search, RefreshCw, Plus, Edit2, Trash2, Calendar, Users,
    Building, Eye, X, Send, AlertTriangle, Download, Upload
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import RecycleBinModal from '../../components/common/RecycleBinModal';

const AdminAnnouncements = () => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const importFileRef = useRef(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInstitute, setSelectedInstitute] = useState('All');
    const [selectedAudience, setSelectedAudience] = useState('All');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage, setEntriesPerPage] = useState(10);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'

    // Bulk action & Recycle Bin states
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

    // Reactivate announcement modal state
    const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
    const [reactivateAnnouncement, setReactivateAnnouncement] = useState(null);
    const [reactivateEndDate, setReactivateEndDate] = useState('');

    const isAnnouncementActive = (ann) => {
        if (!ann) return false;
        if (ann.isActive === false) return false;
        if (ann.endDate && new Date(ann.endDate) < new Date()) return false;
        return true;
    };

    const handleToggleStatus = async (ann) => {
        const active = isAnnouncementActive(ann);
        if (active) {
            try {
                await axios.put(`/api/announcements/${ann._id}`, { isActive: false });
                toast.success('Announcement deactivated');
                fetchAnnouncements();
            } catch (err) {
                console.error('[Deactivate Announcement Error]', err);
                toast.error('Failed to deactivate announcement');
            }
        } else {
            setReactivateAnnouncement(ann);
            const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
            setReactivateEndDate(defaultDate);
            setReactivateModalOpen(true);
        }
    };

    const handleReactivateSubmit = async (e) => {
        e.preventDefault();
        if (!reactivateAnnouncement || !reactivateEndDate) {
            return toast.error('Please select a valid ending date');
        }

        if (new Date(reactivateEndDate) <= new Date()) {
            return toast.error('Ending date must be in the future.');
        }

        try {
            await axios.put(`/api/announcements/${reactivateAnnouncement._id}`, {
                isActive: true,
                endDate: reactivateEndDate
            });
            toast.success('Announcement reactivated successfully!');
            setReactivateModalOpen(false);
            setReactivateAnnouncement(null);
            fetchAnnouncements();
        } catch (err) {
            console.error('[Reactivate Announcement Error]', err);
            toast.error('Failed to reactivate announcement');
        }
    };

    const handleExportData = () => {
        if (!announcements || announcements.length === 0) {
            return toast.error('No announcements available to export.');
        }

        const headers = ['Title', 'Content', 'Target Audience', 'Institute Scope', 'Ending Date', 'Published Date', 'Status'];
        const csvRows = [headers.join(',')];

        announcements.forEach(ann => {
            const title = `"${(ann.title || '').replace(/"/g, '""')}"`;
            const content = `"${(ann.content || '').replace(/"/g, '""')}"`;
            const audience = `"${ann.targetAudience || 'All'}"`;
            const institute = `"${ann.institute?.name || 'Global'}"`;
            const endDate = ann.endDate ? new Date(ann.endDate).toLocaleString() : '';
            const pubDate = ann.createdAt ? new Date(ann.createdAt).toLocaleString() : '';
            const status = isAnnouncementActive(ann) ? 'Active' : 'Inactive';

            csvRows.push([title, content, audience, institute, endDate, pubDate, status].join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Announcements_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Announcements exported successfully!');
    };

    const handleImportData = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(text);
                const itemsToImport = Array.isArray(parsed) ? parsed : [parsed];
                let count = 0;
                for (const item of itemsToImport) {
                    if (item.title && item.content) {
                        await axios.post('/api/announcements', {
                            title: item.title,
                            content: item.content,
                            targetAudience: item.targetAudience || 'All',
                            endDate: item.endDate || null
                        });
                        count++;
                    }
                }
                toast.success(`Successfully imported ${count} announcements!`);
                fetchAnnouncements();
            } else if (file.name.endsWith('.csv')) {
                const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length <= 1) return toast.error('CSV file is empty or missing data rows.');
                
                let count = 0;
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
                    if (parts.length >= 2 && parts[0] && parts[1]) {
                        await axios.post('/api/announcements', {
                            title: parts[0],
                            content: parts[1],
                            targetAudience: parts[2] || 'All',
                            endDate: parts[4] || null
                        });
                        count++;
                    }
                }
                toast.success(`Successfully imported ${count} announcements!`);
                fetchAnnouncements();
            }
        } catch (err) {
            console.error('[Import Error]', err);
            toast.error('Failed to parse or import file.');
        } finally {
            if (importFileRef.current) importFileRef.current.value = '';
        }
    };

    // Form inputs
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        instituteId: '',
        targetAudience: 'All',
        endDate: '',
        studentAudienceType: 'All',
        selectedStudents: []
    });

    const [attachmentFile, setAttachmentFile] = useState(null);
    const [clearAttachment, setClearAttachment] = useState(false);

    // Specific students target states
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/announcements');
            setAnnouncements(data);
            setSelectedIds(new Set()); // Reset selections on successful fetch
        } catch (err) {
            console.error('[Fetch Announcements Error]', err);
            toast.error('Failed to load announcements.');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkApply = async () => {
        if (selectedIds.size === 0 || !bulkAction) return;

        if (bulkAction === 'delete') {
            if (window.confirm(`Are you sure you want to delete the ${selectedIds.size} selected announcements? They will be moved to the Recycle Bin.`)) {
                try {
                    setLoading(true);
                    await Promise.all(
                        Array.from(selectedIds).map(id => axios.delete(`/api/announcements/${id}`))
                    );
                    toast.success('Successfully deleted selected announcements');
                    setSelectedIds(new Set());
                    fetchAnnouncements();
                } catch (error) {
                    console.error('Error deleting selected announcements:', error);
                    toast.error('Failed to delete some announcements');
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const fetchInstitutes = async () => {
        try {
            const { data } = await axios.get('/api/setup/institutes');
            setInstitutes(data || []);
        } catch (err) {
            console.error('[Fetch Institutes Error]', err);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        fetchInstitutes();
    }, []);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedInstitute, selectedAudience]);

    // Fetch students list dynamically when target audience is set to Student
    useEffect(() => {
        if (formData.targetAudience === 'Student') {
            const fetchStudents = async () => {
                setStudentsLoading(true);
                try {
                    let url = '/api/users?role=Student';
                    if (formData.instituteId) {
                        url += `&institute=${formData.instituteId}`;
                    }
                    const { data } = await axios.get(url);
                    setStudents(data || []);
                } catch (err) {
                    console.error('[Fetch Students Error]', err);
                } finally {
                    setStudentsLoading(false);
                }
            };
            fetchStudents();
        }
    }, [formData.targetAudience, formData.instituteId]);

    // Handle Form Submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            return toast.error('Title and Content are required.');
        }

        if (formData.endDate && new Date(formData.endDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
            return toast.error('Ending date must be today or in the future.');
        }

        const payload = new FormData();
        payload.append('title', formData.title);
        payload.append('content', formData.content);
        payload.append('targetAudience', formData.targetAudience);
        payload.append('instituteId', formData.instituteId);
        payload.append('endDate', formData.endDate || '');
        payload.append('studentAudienceType', formData.studentAudienceType || 'All');
        payload.append('selectedStudents', JSON.stringify(formData.selectedStudents || []));
        if (attachmentFile) {
            payload.append('attachment', attachmentFile);
        }
        if (clearAttachment) {
            payload.append('clearAttachment', 'true');
        }

        try {
            if (modalMode === 'create') {
                await axios.post('/api/announcements', payload, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                toast.success('Announcement published successfully!');
            } else {
                await axios.put(`/api/announcements/${selectedAnnouncement._id}`, payload, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                toast.success('Announcement updated successfully!');
            }
            setIsModalOpen(false);
            resetForm();
            fetchAnnouncements();
        } catch (err) {
            console.error('[Save Announcement Error]', err);
            toast.error(err.response?.data?.message || 'Failed to save announcement.');
        }
    };

    // Handle Delete
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this announcement?');
        if (!confirmDelete) return;

        try {
            await axios.delete(`/api/announcements/${id}`);
            toast.success('Announcement deleted successfully.');
            fetchAnnouncements();
        } catch (err) {
            console.error('[Delete Announcement Error]', err);
            toast.error('Failed to delete announcement.');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            content: '',
            instituteId: '',
            targetAudience: 'All',
            endDate: '',
            studentAudienceType: 'All',
            selectedStudents: []
        });
        setSelectedAnnouncement(null);
        setAttachmentFile(null);
        setClearAttachment(false);
    };

    const openCreateModal = () => {
        setModalMode('create');
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (ann) => {
        setModalMode('edit');
        setSelectedAnnouncement(ann);
        setFormData({
            title: ann.title,
            content: ann.content,
            instituteId: ann.institute?._id || '',
            targetAudience: ann.targetAudience,
            endDate: ann.endDate ? ann.endDate.split('T')[0] : '',
            studentAudienceType: ann.studentAudienceType || 'All',
            selectedStudents: ann.selectedStudents || []
        });
        setAttachmentFile(null);
        setClearAttachment(false);
        setIsModalOpen(true);
    };

    const openViewModal = (ann) => {
        setSelectedAnnouncement(ann);
        setIsViewModalOpen(true);
    };

    // Format Date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter Logic
    const filteredAnnouncements = announcements.filter(ann => {
        const matchesSearch =
            ann.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ann.content?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesInstitute = selectedInstitute === 'All' ||
            (selectedInstitute === 'Global' ? !ann.institute : ann.institute?._id === selectedInstitute);

        const matchesAudience = selectedAudience === 'All' || ann.targetAudience === selectedAudience;

        return matchesSearch && matchesInstitute && matchesAudience;
    });

    // Pagination Calculations
    const limit = parseInt(entriesPerPage, 10) || 10;
    const indexOfLastEntry = currentPage * limit;
    const indexOfFirstEntry = indexOfLastEntry - limit;
    const currentEntries = filteredAnnouncements.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredAnnouncements.length / limit);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (currentPage > 3) {
                pages.push('...');
            }
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== totalPages) {
                    pages.push(i);
                }
            }
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            pages.push(totalPages);
        }
        return pages;
    };

    const isManager = ['Admin', 'Institute', 'Staff'].includes(user?.role);

    if (!isManager) {
        return (
            <DashboardLayout role={user?.role || 'Student'} fullWidth={true}>
                <div className="w-full px-1 py-4 font-sans">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                                <Megaphone className="text-indigo-650" size={26} />
                                <span>Announcements</span>
                            </h2>
                            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                                Official notices and announcements
                            </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                                onClick={fetchAnnouncements}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Table Container Card */}
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
                        {/* Controls Header */}
                        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="text-left">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <span>📋</span> Announcement Board
                                </h3>
                                <p className="text-xs font-semibold text-slate-400 mt-0.5">List of active alerts and official announcements</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search bar */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search title, details..."
                                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all w-52"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Table View */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                        <th className="py-3.5 px-6 text-left">Sr No.</th>
                                        <th className="py-3.5 px-6 text-left">Title</th>
                                        <th className="py-3.5 px-4 text-right">Created Date</th>
                                        <th className="py-3.5 px-4 text-right">Ending date</th>
                                        <th className="py-3.5 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-12 text-slate-400">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <RefreshCw size={24} className="animate-spin text-indigo-650" />
                                                    <span>Loading announcements...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentEntries.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-10 text-slate-400">No announcements found.</td>
                                        </tr>
                                    ) : (
                                        currentEntries.map((ann, idx) => (
                                            <tr key={ann._id || idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3.5 px-6 text-left font-extrabold text-slate-800">
                                                    {indexOfFirstEntry + idx + 1}
                                                </td>
                                                <td className="py-3.5 px-6 text-left font-extrabold text-slate-855">
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-sm text-slate-800 flex items-center gap-1.5">
                                                            {ann.title}
                                                            {ann.attachmentUrl && (
                                                                <span className="inline-flex items-center text-slate-400" title="Has attachment">
                                                                    📎
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-xs mt-0.5">{ann.content}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-slate-450 font-semibold">{formatDate(ann.createdAt)}</td>
                                                <td className="py-3.5 px-4 text-right text-slate-500 font-semibold">
                                                    {ann.endDate ? formatDate(ann.endDate) : '—'}
                                                </td>
                                                <td className="py-3.5 px-6 text-right space-x-1.5">
                                                    <button
                                                        onClick={() => openViewModal(ann)}
                                                        title="View Announcement"
                                                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-655 rounded-xl border border-slate-200 transition-all cursor-pointer inline-flex items-center justify-center active:scale-95"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-xs font-semibold text-slate-400">
                                Showing {filteredAnnouncements.length > 0 ? indexOfFirstEntry + 1 : 0} to {Math.min(indexOfLastEntry, filteredAnnouncements.length)} of {filteredAnnouncements.length} entries
                            </div>

                            <div className="flex items-center gap-3">
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2 select-none">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${currentPage === 1
                                                ? 'bg-slate-50 border-slate-200 text-slate-400'
                                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                                }`}
                                        >
                                            Previous
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {getPageNumbers().map((pageNum, idx) => {
                                                if (pageNum === '...') {
                                                    return (
                                                        <span key={idx} className="w-8 h-8 text-slate-400 font-bold text-xs flex items-center justify-center">
                                                            ...
                                                        </span>
                                                    );
                                                }

                                                const isPageActive = currentPage === pageNum;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${isPageActive
                                                            ? 'bg-[#0b1329] text-white shadow-md shadow-black/10'
                                                            : 'hover:bg-slate-100 text-slate-700'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${(currentPage === totalPages || totalPages === 0)
                                                ? 'bg-slate-50 border-slate-200 text-slate-400'
                                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                                }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* View Announcement Modal */}
                    {isViewModalOpen && selectedAnnouncement && createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[whitesmoke]/80 backdrop-blur-sm p-4 text-left font-sans animate-fade-in">
                            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Megaphone size={18} className="text-indigo-650" />
                                        <span className="font-extrabold text-slate-800 text-sm tracking-tight">Announcement Details</span>
                                    </div>
                                    <button
                                        onClick={() => setIsViewModalOpen(false)}
                                        className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-slate-855">{selectedAnnouncement.title}</h3>
                                        <div className="flex flex-wrap items-center gap-2.5 pt-1.5 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(selectedAnnouncement.createdAt)}</span>
                                            <span>•</span>
                                            <span>Audience: {selectedAnnouncement.targetAudience === 'limited' ? 'Guest User' : selectedAnnouncement.targetAudience === 'guest' ? 'Limited User' : selectedAnnouncement.targetAudience}</span>
                                            <span>•</span>
                                            <span>Scope: {selectedAnnouncement.institute?.name || 'Global'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedAnnouncement.content}
                                    </div>

                                    {selectedAnnouncement.attachmentUrl && (
                                        <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-655 mt-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <span>📎</span>
                                                <span className="truncate max-w-[200px]" title={selectedAnnouncement.attachmentName}>
                                                    {selectedAnnouncement.attachmentName || 'Attachment'}
                                                </span>
                                            </div>
                                            <a
                                                href={selectedAnnouncement.attachmentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3 py-1.5 bg-[#3E3ADD]/10 text-[#3E3ADD] hover:bg-[#3E3ADD]/20 rounded-xl transition-all font-black text-[10px]"
                                            >
                                                Download File
                                            </a>
                                        </div>
                                    )}

                                    <div className="pt-4 flex items-center justify-end border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setIsViewModalOpen(false)}
                                            className="px-5 py-2 bg-[#3E3ADD] hover:bg-[#2d2aab] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role={user?.role || 'Admin'} fullWidth={true}>
            <div className="w-full px-1 py-4 font-sans">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                            <Megaphone className="text-indigo-650" size={26} />
                            <span>Announcements</span>
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                            Publish notices, events, and announcements for students and staff
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            onClick={handleExportData}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            title="Export Announcements CSV"
                        >
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={() => importFileRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            title="Import Announcements CSV/JSON"
                        >
                            <Upload size={14} />
                            <span>Import</span>
                        </button>
                        <input
                            type="file"
                            ref={importFileRef}
                            onChange={handleImportData}
                            accept=".csv,.json"
                            className="hidden"
                        />
                        {user?.role && (
                            <>
                                <button
                                    onClick={() => setIsRecycleBinOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                >
                                    <Trash2 size={14} />
                                    <span>Recycle Bin</span>
                                </button>
                                <button
                                    onClick={openCreateModal}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-[#3E3ADD] hover:bg-[#2d2aab] text-white font-extrabold text-xs rounded-xl shadow-sm shadow-indigo-650/10 transition-all cursor-pointer"
                                >
                                    <Plus size={14} />
                                    <span>Create Announcement</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>


                {/* Table Container Card */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">

                    {/* Controls Header */}
                    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">

                        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto pb-1.5 md:pb-0 scrollbar-none w-full md:w-auto">
                            {/* Bulk Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer h-[38px] min-w-[120px]"
                                >
                                    <option value="">Bulk Action</option>
                                    <option value="delete">Delete Selected</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleBulkApply}
                                    disabled={selectedIds.size === 0 || !bulkAction}
                                    className="px-4 py-2 bg-[#3E3ADD] hover:bg-[#2d2aab] disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-250 border border-transparent disabled:border-slate-200 text-white rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer whitespace-nowrap h-[38px] active:scale-95 flex items-center justify-center"
                                >
                                    Apply to All ({selectedIds.size})
                                </button>
                            </div>

                            {/* Entries Selector */}
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 tracking-wider uppercase shrink-0">
                                <span>Show</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={entriesPerPage}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEntriesPerPage(val === '' ? '' : Math.max(1, parseInt(val, 10)));
                                        setCurrentPage(1);
                                    }}
                                    className="w-14 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-black text-slate-700 text-center outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/20 transition-all"
                                />
                                <span>Entries</span>
                            </div>

                            {/* Audience Filter */}
                            <select
                                value={selectedAudience}
                                onChange={(e) => setSelectedAudience(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer shrink-0"
                            >
                                <option value="All">All Audiences</option>
                                <option value="Student">Students Only</option>
                                <option value="Teacher">Teachers Only</option>
                                <option value="Staff">Staff Only</option>
                            </select>

                            {/* Institute Filter */}
                            {user?.role === 'Admin' && (
                                <select
                                    value={selectedInstitute}
                                    onChange={(e) => setSelectedInstitute(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer shrink-0"
                                >
                                    <option value="All">All Institutes</option>
                                    <option value="Global">Global Only</option>
                                    {institutes.map(inst => (
                                        <option key={inst._id} value={inst._id}>{inst.name}</option>
                                    ))}
                                </select>
                            )}

                            {/* Search bar */}
                            <div className="relative shrink-0">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search title, details..."
                                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all w-52"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                    <th className="py-3 px-3 text-left w-10">
                                        <input
                                            type="checkbox"
                                            checked={currentEntries.length > 0 && currentEntries.every(ann => selectedIds.has(ann._id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const newSelected = new Set(selectedIds);
                                                    currentEntries.forEach(ann => newSelected.add(ann._id));
                                                    setSelectedIds(newSelected);
                                                } else {
                                                    const newSelected = new Set(selectedIds);
                                                    currentEntries.forEach(ann => newSelected.delete(ann._id));
                                                    setSelectedIds(newSelected);
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="py-3 px-3">Announcement Title</th>
                                    <th className="py-3 px-2">Institute scope</th>
                                    <th className="py-3 px-2">Audience</th>
                                    <th className="py-3 px-2">Created By</th>
                                    <th className="py-3 px-2 text-center">Status</th>
                                    <th className="py-3 px-2 text-right">Ending date</th>
                                    <th className="py-3 px-2 text-right">Published date</th>
                                    <th className="py-3 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-12 text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <RefreshCw size={24} className="animate-spin text-indigo-650" />
                                                <span>Loading announcements...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-10 text-slate-400">No announcements found.</td>
                                    </tr>
                                ) : (
                                    currentEntries.map((ann, idx) => (
                                        <tr key={ann._id || idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-3 text-left w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(ann._id)}
                                                    onChange={(e) => {
                                                        const newSelected = new Set(selectedIds);
                                                        if (e.target.checked) {
                                                            newSelected.add(ann._id);
                                                        } else {
                                                            newSelected.delete(ann._id);
                                                        }
                                                        setSelectedIds(newSelected);
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="py-3 px-3 font-extrabold text-slate-850">
                                                <div className="flex flex-col text-left">
                                                    <span className="text-sm text-slate-800 flex items-center gap-1.5">
                                                        {ann.title}
                                                        {ann.attachmentUrl && (
                                                            <span className="inline-flex items-center text-slate-400" title="Has attachment">
                                                                📎
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-xs mt-0.5">{ann.content}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                {ann.institute ? (
                                                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-750 rounded-xl text-[10px] font-black">
                                                        🏫 {ann.institute.name}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-teal-50 border border-teal-100 text-teal-750 rounded-xl text-[10px] font-black">
                                                        🌐 Global
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className={`px-2 py-0.5 rounded-xl text-[10px] font-black ${ann.targetAudience === 'Student'
                                                    ? 'bg-blue-50 border border-blue-100 text-blue-755'
                                                    : ann.targetAudience === 'Teacher'
                                                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-755'
                                                        : ann.targetAudience === 'limited'
                                                            ? 'bg-amber-50 border border-amber-100 text-amber-755'
                                                            : ann.targetAudience === 'guest'
                                                                ? 'bg-teal-50 border border-teal-100 text-teal-755'
                                                                : 'bg-purple-50 border border-purple-100 text-purple-755'
                                                    }`}>
                                                    👥 {ann.targetAudience === 'limited' ? 'Guest User' : ann.targetAudience === 'guest' ? 'Limited User' : ann.targetAudience}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-slate-500 font-semibold">{ann.createdBy?.name || 'Admin'}</td>
                                            
                                            {/* Status Toggle Switch */}
                                            <td className="py-3 px-2 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(ann)}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            isAnnouncementActive(ann) ? 'bg-emerald-500' : 'bg-slate-300'
                                                        }`}
                                                        title={isAnnouncementActive(ann) ? "Click to Deactivate" : "Click to Reactivate"}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                isAnnouncementActive(ann) ? 'translate-x-4' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                        isAnnouncementActive(ann) ? 'text-emerald-600' : 'text-slate-400'
                                                    }`}>
                                                        {isAnnouncementActive(ann) ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3 px-2 text-right text-slate-500 font-semibold">
                                                {ann.endDate ? formatDate(ann.endDate) : '—'}
                                            </td>
                                            <td className="py-3 px-2 text-right text-slate-400 font-semibold">{formatDate(ann.createdAt)}</td>
                                            <td className="py-3 px-3 text-right space-x-1">
                                                <button
                                                    onClick={() => openViewModal(ann)}
                                                    title="View Announcement"
                                                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-655 rounded-xl border border-slate-200 transition-all cursor-pointer inline-flex items-center justify-center active:scale-95"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                {(user?.role === 'Admin' || ann.createdBy?._id === user?._id) && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(ann)}
                                                            title="Edit Announcement"
                                                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-xl border border-indigo-100 transition-all cursor-pointer inline-flex items-center justify-center active:scale-95"
                                                        >
                                                            <Edit2 size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(ann._id)}
                                                            title="Delete Announcement"
                                                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-xl border border-rose-100 transition-all cursor-pointer inline-flex items-center justify-center active:scale-95"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs font-semibold text-slate-400">
                            Showing {filteredAnnouncements.length > 0 ? indexOfFirstEntry + 1 : 0} to {Math.min(indexOfLastEntry, filteredAnnouncements.length)} of {filteredAnnouncements.length} entries
                        </div>

                        <div className="flex items-center gap-3">
                            {totalPages > 1 && (
                                <div className="flex items-center gap-2 select-none">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        className={`px-4 py-2 rounded-full border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${currentPage === 1
                                            ? 'bg-slate-50 border-slate-200 text-slate-400'
                                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                            }`}
                                    >
                                        Previous
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {getPageNumbers().map((pageNum, idx) => {
                                            if (pageNum === '...') {
                                                return (
                                                    <span key={idx} className="w-8 h-8 text-slate-400 font-bold text-xs flex items-center justify-center">
                                                        ...
                                                    </span>
                                                );
                                            }

                                            const isPageActive = currentPage === pageNum;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${isPageActive
                                                        ? 'bg-[#0b1329] text-white shadow-md shadow-black/10'
                                                        : 'hover:bg-slate-100 text-slate-700'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        className={`px-4 py-2 rounded-full border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${(currentPage === totalPages || totalPages === 0)
                                            ? 'bg-slate-50 border-slate-200 text-slate-400'
                                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                            }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Create/Edit Announcement Modal */}
                {isModalOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[whitesmoke]/80 backdrop-blur-sm p-4 text-left font-sans animate-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Megaphone size={18} className="text-indigo-650" />
                                    <span className="font-extrabold text-slate-800 text-sm tracking-tight">
                                        {modalMode === 'create' ? 'Publish Announcement' : 'Edit Announcement'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4">
                                <div className="space-y-1 text-left">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Announcement Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Exam Schedule Release, Holiday Notice..."
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>

                                <div className="space-y-1 text-left">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Announcement Details</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Provide complete details about the announcement..."
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1 text-left">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attachment (Optional)</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    setAttachmentFile(e.target.files[0]);
                                                    setClearAttachment(false);
                                                }}
                                                className="hidden"
                                                id="announcement-file-upload"
                                            />
                                            <label
                                                htmlFor="announcement-file-upload"
                                                className="px-4 py-2 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-350 cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                                            >
                                                <span>📎</span> {attachmentFile ? 'Change File' : 'Choose File'}
                                            </label>
                                            {attachmentFile && (
                                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-655 truncate max-w-xs">
                                                    <span className="truncate max-w-[120px]">{attachmentFile.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAttachmentFile(null)}
                                                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            {!attachmentFile && selectedAnnouncement?.attachmentUrl && !clearAttachment && (
                                                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold text-[#3E3ADD] truncate max-w-xs">
                                                    <span className="truncate max-w-[120px]">{selectedAnnouncement.attachmentName || 'Attached File'}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setClearAttachment(true)}
                                                        className="text-indigo-400 hover:text-indigo-650 cursor-pointer"
                                                        title="Delete attachment"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-left">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ending Date (Optional)</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {user?.role === 'Admin' ? (
                                        <>
                                            <div className="space-y-1 text-left">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institute Scope</label>
                                                <select
                                                    value={formData.instituteId}
                                                    onChange={(e) => setFormData({ ...formData, instituteId: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500 transition-all"
                                                >
                                                    <option value="">Global (All Institutes)</option>
                                                    {institutes.map(inst => (
                                                        <option key={inst._id} value={inst._id}>{inst.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1 text-left">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Audience</label>
                                                <select
                                                    value={formData.targetAudience}
                                                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500 transition-all"
                                                >
                                                    <option value="All">Everyone (All)</option>
                                                    <option value="Student">Students Only</option>
                                                    <option value="Teacher">Teachers Only</option>
                                                    <option value="Editor">Editor Only</option>
                                                    <option value="Accountant">Accountants Only</option>
                                                    <option value="Marketer">Marketers Only</option>
                                                    <option value="Parent">Parents Only</option>
                                                    <option value="limited">Guest Users Only</option>
                                                    <option value="guest">Limited Users Only</option>
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-1 text-left col-span-1 sm:col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Audience</label>
                                            <select
                                                value={formData.targetAudience}
                                                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500 transition-all"
                                            >
                                                <option value="All">Everyone (All)</option>
                                                <option value="Student">Students Only</option>
                                                <option value="Teacher">Teachers Only</option>
                                                <option value="Editor">Editor Only</option>
                                                <option value="Accountant">Accountants Only</option>
                                                <option value="Marketer">Marketers Only</option>
                                                <option value="Parent">Parents Only</option>
                                                <option value="limited">Guest Users Only</option>
                                                <option value="guest">Limited Users Only</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {formData.targetAudience === 'Student' && (
                                    <div className="space-y-3 mt-4 border-t border-slate-100 pt-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Target Selection</label>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                                    <input
                                                        type="radio"
                                                        name="studentAudienceType"
                                                        value="All"
                                                        checked={formData.studentAudienceType === 'All'}
                                                        onChange={() => setFormData({ ...formData, studentAudienceType: 'All', selectedStudents: [] })}
                                                        className="accent-indigo-650 cursor-pointer"
                                                    />
                                                    All Students
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                                    <input
                                                        type="radio"
                                                        name="studentAudienceType"
                                                        value="Selected"
                                                        checked={formData.studentAudienceType === 'Selected'}
                                                        onChange={() => setFormData({ ...formData, studentAudienceType: 'Selected' })}
                                                        className="accent-indigo-650 cursor-pointer"
                                                    />
                                                    Selected Students
                                                </label>
                                            </div>
                                        </div>

                                        {formData.studentAudienceType === 'Selected' && (
                                            <div className="space-y-2.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 animate-fade-in text-left">
                                                <div className="flex items-center justify-between gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Search students by name or email..."
                                                        value={studentSearch}
                                                        onChange={(e) => setStudentSearch(e.target.value)}
                                                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const filtered = students.filter(st =>
                                                                    st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                                    st.email.toLowerCase().includes(studentSearch.toLowerCase())
                                                                );
                                                                const allSelected = new Set([
                                                                    ...(formData.selectedStudents || []),
                                                                    ...filtered.map(st => st._id)
                                                                ]);
                                                                setFormData({ ...formData, selectedStudents: Array.from(allSelected) });
                                                            }}
                                                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-xl text-[10px] font-black cursor-pointer transition-all active:scale-95"
                                                        >
                                                            Select All
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const filteredIds = new Set(students.filter(st =>
                                                                    st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                                    st.email.toLowerCase().includes(studentSearch.toLowerCase())
                                                                ).map(st => st._id));
                                                                const remaining = (formData.selectedStudents || []).filter(id => !filteredIds.has(id));
                                                                setFormData({ ...formData, selectedStudents: remaining });
                                                            }}
                                                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-xl text-[10px] font-black cursor-pointer transition-all active:scale-95"
                                                        >
                                                            Deselect All
                                                        </button>
                                                    </div>
                                                </div>

                                                {studentsLoading ? (
                                                    <div className="text-center py-6 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                                                        <RefreshCw size={14} className="animate-spin text-indigo-650" />
                                                        <span>Loading students list...</span>
                                                    </div>
                                                ) : students.length === 0 ? (
                                                    <div className="text-center py-6 text-slate-450 text-xs font-bold">
                                                        No students found for this institute scope.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
                                                        {students.filter(st =>
                                                            st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                            st.email.toLowerCase().includes(studentSearch.toLowerCase())
                                                        ).map((st) => {
                                                            const isChecked = (formData.selectedStudents || []).includes(st._id);
                                                            return (
                                                                <label
                                                                    key={st._id}
                                                                    className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-100/60 hover:bg-slate-50/50 cursor-pointer select-none transition-all"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            let updated = [...(formData.selectedStudents || [])];
                                                                            if (isChecked) {
                                                                                updated = updated.filter(id => id !== st._id);
                                                                            } else {
                                                                                updated.push(st._id);
                                                                            }
                                                                            setFormData({ ...formData, selectedStudents: updated });
                                                                        }}
                                                                        className="w-3.5 h-3.5 accent-indigo-650 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                    />
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-[11px] font-bold text-slate-800 truncate">{st.name}</span>
                                                                        <span className="text-[9px] font-semibold text-slate-400 truncate">{st.email}</span>
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <div className="text-[10px] font-bold text-slate-450 mt-1">
                                                    Selected: <span className="text-[#3E3ADD] font-black">{(formData.selectedStudents || []).length}</span> students
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex items-center gap-1.5 px-5 py-2 bg-[#3E3ADD] hover:bg-[#2d2aab] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15"
                                    >
                                        <Send size={12} />
                                        <span>{modalMode === 'create' ? 'Publish notice' : 'Save Changes'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* View Announcement Modal */}
                {isViewModalOpen && selectedAnnouncement && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[whitesmoke]/80 backdrop-blur-sm p-4 text-left font-sans animate-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Megaphone size={18} className="text-indigo-650" />
                                    <span className="font-extrabold text-slate-800 text-sm tracking-tight">Announcement Details</span>
                                </div>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-slate-850">{selectedAnnouncement.title}</h3>
                                    <div className="flex flex-wrap items-center gap-2.5 pt-1.5 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(selectedAnnouncement.createdAt)}</span>
                                        <span>•</span>
                                        <span>Audience: {selectedAnnouncement.targetAudience}</span>
                                        <span>•</span>
                                        <span>Scope: {selectedAnnouncement.institute?.name || 'Global'}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedAnnouncement.content}
                                </div>

                                {selectedAnnouncement.attachmentUrl && (
                                    <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-655 mt-3 text-left">
                                        <div className="flex items-center gap-2">
                                            <span>📎</span>
                                            <span className="truncate max-w-[200px]" title={selectedAnnouncement.attachmentName}>
                                                {selectedAnnouncement.attachmentName || 'Attachment'}
                                            </span>
                                        </div>
                                        <a
                                            href={selectedAnnouncement.attachmentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1.5 bg-[#3E3ADD]/10 text-[#3E3ADD] hover:bg-[#3E3ADD]/20 rounded-xl transition-all font-black text-[10px]"
                                        >
                                            Download File
                                        </a>
                                    </div>
                                )}

                                <div className="pt-4 flex items-center justify-end border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsViewModalOpen(false)}
                                        className="px-5 py-2 bg-[#3E3ADD] hover:bg-[#2d2aab] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Recycle Bin Modal */}
                <RecycleBinModal
                    isOpen={isRecycleBinOpen}
                    onClose={() => setIsRecycleBinOpen(false)}
                    title="Announcements Recycle Bin"
                    trashUrl="/api/announcements/trash"
                    onRestoreSuccess={fetchAnnouncements}
                    restoreUrlPattern={(id) => `/api/announcements/${id}/restore`}
                    permanentDeleteUrlPattern={(id) => `/api/announcements/${id}/permanent`}
                    renderItemDetail={(item) => item.title}
                />

                {/* Reactivate Announcement Modal */}
                {reactivateModalOpen && reactivateAnnouncement && (
                    createPortal(
                        <div className="fixed inset-0 z-[9999] bg-[#f2f4f8]/80 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative p-6 animate-slide-up">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-extrabold text-slate-800">Reactivate Announcement</h3>
                                            <p className="text-xs text-slate-400 font-semibold truncate max-w-[220px]">{reactivateAnnouncement.title}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReactivateModalOpen(false);
                                            setReactivateAnnouncement(null);
                                        }}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <form onSubmit={handleReactivateSubmit} className="space-y-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                            Select New Ending Date <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="datetime-local"
                                            value={reactivateEndDate}
                                            onChange={(e) => setReactivateEndDate(e.target.value)}
                                            min={new Date().toISOString().slice(0, 16)}
                                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                                        />
                                        <p className="text-[11px] text-slate-400 font-semibold mt-2">
                                            This announcement will stay active until the specified ending date.
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReactivateModalOpen(false);
                                                setReactivateAnnouncement(null);
                                            }}
                                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                                        >
                                            Activate Announcement
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>,
                        document.body
                    )
                )}

            </div>
        </DashboardLayout>
    );
};

export default AdminAnnouncements;
