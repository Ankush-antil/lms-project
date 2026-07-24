import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Plus, Trash2, Edit, Building, MapPin, Hash, Eye, BookOpen, ChevronRight, ChevronDown, ChevronUp, Shield, X, Check, Upload, Download } from 'lucide-react';
import AddInstituteModal from '../../components/AddInstituteModal';
import EditInstituteModal from '../../components/EditInstituteModal';
import InstituteDetailsModal from '../../components/InstituteDetailsModal';
import TruncatedCell from '../../components/common/TruncatedCell';
import RecycleBinModal from '../../components/common/RecycleBinModal';
import BulkEditModal from '../../components/common/BulkEditModal';


const InstitutesList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'pending'
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);
    const [controlsPanel, setControlsPanel] = useState(null); // { inst } or null
    const [controlsData, setControlsData] = useState(null);
    const [savingControls, setSavingControls] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});
    const [hiringModalData, setHiringModalData] = useState(null); // { instName, roles }

    // Bulk actions
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    useEffect(() => {
        setSelectedIds(new Set());
        setBulkAction('');
    }, [activeTab]);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const defaultControls = {
        dashboard: { show: true, mode: 'hide', note: '', application: true, staffRequest: true },
        student: { show: true, mode: 'hide', note: '', admissionOpen: true, addStudent: true, editStudent: true, dailyAttendanceLog: true, feeManagement: true, studentDirectory: true },
        teacher: { show: true, mode: 'hide', note: '', hiring: true, addTeacher: true, editTeacher: true, teacherDirectory: true, dailyAttendanceLog: true },
        editor: { show: true, mode: 'hide', note: '', hiring: true, addEditor: true, editEditor: true },
        accountant: { show: true, mode: 'hide', note: '', addAccountant: true, editAccountant: true },
        staff: { show: true, mode: 'hide', note: '', addStaff: true, staffDirectory: true, attendanceManagement: true, salaryPayouts: true, taskAssignment: true },
        parent: { show: true, mode: 'hide', note: '', addParent: true, editParent: true },
        course: { show: true, mode: 'hide', note: '', addCourse: true, addNewCourse: true, addNewDemoCourse: true, editCourse: true },
        subject: { show: true, mode: 'hide', note: '', addSubject: true, editSubject: true },
        activities: { show: true, mode: 'hide', note: '', createAssignment: true, editAssignment: true, lmsConnectedTests: true, publicWebTest: true, draftTests: true, openFolderExplorer: true },
        drive: { show: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
        notes: { show: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true },
        tools: { show: true, mode: 'hide', note: '', formBuilderTool: true, databaseCreatorTool: true, elementsControl: true, inputElements: true, displayingElements: true, recordingElements: true, advanceElements: true, addons: true, theme: true, createWithAi: true, integrate: true, import: true, saveAsTemplate: true, decideActivity: true, templates: true, locationLocked: true, logicRules: true, monitoring: true, connectIt: true, profileUnderSettings: true, moreSettings: true, responses: true, collaborate: true, manageAccess: true, publicToWeb: true },
        chat: { show: true, mode: 'hide', note: '' }
    };

    const openControlsPanel = (inst) => {
        const merged = {
            dashboard: { ...defaultControls.dashboard, ...inst.controls?.dashboard },
            student: { ...defaultControls.student, ...inst.controls?.student },
            teacher: { ...defaultControls.teacher, ...inst.controls?.teacher },
            editor: { ...defaultControls.editor, ...inst.controls?.editor },
            accountant: { ...defaultControls.accountant, ...inst.controls?.accountant },
            staff: { ...defaultControls.staff, ...inst.controls?.staff },
            parent: { ...defaultControls.parent, ...inst.controls?.parent },
            course: { ...defaultControls.course, ...inst.controls?.course },
            subject: { ...defaultControls.subject, ...inst.controls?.subject },
            activities: { ...defaultControls.activities, ...inst.controls?.activities },
            drive: { ...defaultControls.drive, ...inst.controls?.drive },
            notes: { ...defaultControls.notes, ...inst.controls?.notes },
            tools: { ...defaultControls.tools, ...inst.controls?.tools },
            chat: { ...defaultControls.chat, ...inst.controls?.chat },
        };
        setExpandedSections({});
        setControlsData(merged);
        setControlsPanel(inst);
    };

    const handleControlChange = (section, field, value) => {
        setControlsData(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const renderInstituteControlSection = ({ id, label, hasSubControls = false, subControls = null }) => {
        const ctrl = controlsData?.[id] || { show: true, mode: 'hide', note: '' };
        const isExpanded = !!expandedSections[id];

        return (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 space-y-3 shadow-sm hover:shadow-md/5 transition-all text-left">
                <div 
                    className="flex items-center justify-between border-b border-slate-100 pb-2 cursor-pointer select-none" 
                    onClick={() => hasSubControls && toggleSection(id)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-800">{label}</span>
                        {hasSubControls && (
                            isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />
                        )}
                    </div>
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <select
                            value={ctrl.mode || 'hide'}
                            onChange={e => handleControlChange(id, 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2 py-0.5 text-[10px] font-bold text-slate-600 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                        <input 
                            type="checkbox" 
                            checked={ctrl.show !== false} 
                            onChange={e => handleControlChange(id, 'show', e.target.checked)} 
                            className="w-4 h-4 accent-indigo-650 cursor-pointer" 
                        />
                    </div>
                </div>

                {ctrl.show !== false && hasSubControls && isExpanded && (
                    <div className="pl-1 pt-1 space-y-2 animate-fade-in">
                        {subControls}
                    </div>
                )}

                {ctrl.show === false && (
                    <div className="w-full animate-fade-in pt-1">
                        <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                        <input
                            type="text"
                            value={ctrl.note || ''}
                            onChange={e => handleControlChange(id, 'note', e.target.value)}
                            placeholder={`Reason for deactivating ${label}`}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                        />
                    </div>
                )}
            </div>
        );
    };

    const handleSaveControls = async () => {
        if (!controlsPanel) return;
        setSavingControls(true);
        try {
            await axios.put(`/api/setup/institutes/${controlsPanel._id}`, { controls: controlsData });
            toast.success('Controls saved successfully!');
            setInstitutes(prev => prev.map(i => i._id === controlsPanel._id ? { ...i, controls: controlsData } : i));
            setControlsPanel(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save controls');
        } finally {
            setSavingControls(false);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            setLoadingRequests(true);
            const { data } = await axios.get('/api/registration-requests/admin');
            setPendingRequests(data);
            setLoadingRequests(false);
        } catch (err) {
            console.error("Error fetching pending requests:", err);
            toast.error("Failed to load registration requests");
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPendingRequests();
        }
    }, [activeTab]);

    const handleResolveRequest = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this institute request?`)) return;
        try {
            setResolvingId(id);
            await axios.put(`/api/registration-requests/${id}/admin-resolve`, { status });
            toast.success(`Request ${status.toLowerCase()} successfully`);
            setPendingRequests(prev => prev.filter(r => r._id !== id));
            if (status === 'Approved') {
                fetchData();
            }
        } catch (err) {
            console.error("Error resolving request:", err);
            toast.error(err.response?.data?.message || "Failed to resolve request");
        } finally {
            setResolvingId(null);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchData = async () => {
        try {
            setLoading(true);

            
            // Controller now returns courseCount and a slice of courses via aggregate
            const { data } = await axios.get('/api/setup/institutes');
            setInstitutes(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching institutes:", error);
            toast.error("Failed to load institutes");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this institute? This may affect users and courses associated with it.')) {
            try {


                await axios.delete(`/api/setup/institutes/${id}`);
                setInstitutes(institutes.filter(i => i._id !== id));
                toast.success('Institute deleted successfully');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting institute');
            }
        }
    };

    const handleApplyBulkAction = async () => {
        if (selectedIds.size === 0 || !bulkAction) return;

        if (bulkAction === 'edit') {
            setIsBulkEditOpen(true);
            return;
        }

        if (bulkAction === 'delete') {
            const confirmMsg = activeTab === 'pending'
                ? `Are you sure you want to reject the ${selectedIds.size} selected registration requests?`
                : `Are you sure you want to delete the ${selectedIds.size} selected institutes? This may affect users and courses associated with them.`;

            if (window.confirm(confirmMsg)) {
                try {
                    const promises = Array.from(selectedIds).map(id => {
                        if (activeTab === 'active') {
                            return axios.delete(`/api/setup/institutes/${id}`);
                        } else if (activeTab === 'pending') {
                            return axios.put(`/api/registration-requests/${id}/admin-resolve`, { status: 'Rejected' });
                        }
                        return Promise.resolve();
                    });

                    await Promise.all(promises);
                    toast.success('Successfully completed bulk action');
                    setSelectedIds(new Set());
                    setBulkAction('');
                    fetchData();
                    if (activeTab === 'pending') {
                        fetchPendingRequests();
                    }
                } catch (err) {
                    console.error("Bulk action error:", err);
                    toast.error('Failed to complete some actions');
                }
            }
        }
    };

    const handleToggleLanding = async (id) => {
        try {
            const { data } = await axios.patch(`/api/setup/institutes/${id}/toggle`, { flag: 'showOnLanding' });
            setInstitutes(institutes.map(inst => inst._id === id ? { ...inst, showOnLanding: data.value } : inst));
            toast.success('Landing page visibility updated');
        } catch (error) {
            console.error("Error toggling landing page visibility:", error);
            toast.error(error.response?.data?.message || 'Failed to toggle visibility');
        }
    };

    const filteredInstitutes = institutes.filter(inst =>
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredInstitutes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInstitutes = filteredInstitutes.slice(startIndex, startIndex + itemsPerPage);

    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const importInstitutesRef = useRef(null);

    const handleImportInstitutes = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        const filename = file.name.toLowerCase();

        const processImported = async (parsed) => {
            if (!Array.isArray(parsed)) {
                toast.error('File must contain an array of institutes');
                return;
            }
            const parsedMapped = parsed.map(row => {
                const keys = Object.keys(row);
                const nameKey = keys.find(k => k.toLowerCase() === 'name');
                const codeKey = keys.find(k => k.toLowerCase() === 'code');
                const emailKey = keys.find(k => ['contact email', 'contactemail', 'email'].includes(k.toLowerCase()));
                const addressKey = keys.find(k => k.toLowerCase() === 'address');
                const phoneKey = keys.find(k => k.toLowerCase() === 'phone');
                const helplineKey = keys.find(k => ['helpline number', 'helplinenumber', 'helpline'].includes(k.toLowerCase()));
                const passwordKey = keys.find(k => k.toLowerCase() === 'password');
                const descKey = keys.find(k => ['description', 'desc'].includes(k.toLowerCase()));
                const controlsKey = keys.find(k => k.toLowerCase() === 'controls');

                return {
                    name: nameKey ? String(row[nameKey]).trim() : '',
                    code: codeKey ? String(row[codeKey]).trim() : '',
                    contactEmail: emailKey ? String(row[emailKey]).trim() : '',
                    address: addressKey ? String(row[addressKey]).trim() : '',
                    phone: phoneKey ? String(row[phoneKey]).trim() : '',
                    helplineNumber: helplineKey ? String(row[helplineKey]).trim() : '',
                    password: passwordKey ? String(row[passwordKey]).trim() : '',
                    description: descKey ? String(row[descKey]).trim() : '',
                    controls: controlsKey ? row[controlsKey] : undefined
                };
            }).filter(item => item.name && item.code && item.contactEmail);

            if (parsedMapped.length === 0) {
                toast.error('No valid rows found. "Name", "Code" and "Contact Email" columns are required.');
                return;
            }

            const loadingToast = toast.loading(`Importing ${parsedMapped.length} institutes...`);
            try {
                const res = await axios.post('/api/setup/institutes/import', { institutes: parsedMapped });
                toast.dismiss(loadingToast);
                const { successCount, errors } = res.data.results;
                if (errors && errors.length > 0) {
                    toast.success(`Successfully imported ${successCount} institutes. ${errors.length} failed.`);
                } else {
                    toast.success(`Successfully imported ${successCount} institutes!`);
                }
                fetchData();
            } catch (err) {
                toast.dismiss(loadingToast);
                toast.error(err.response?.data?.message || 'Error importing institutes');
            }
        };

        if (filename.endsWith('.json')) {
            reader.onload = async (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    processImported(parsed);
                } catch (err) {
                    toast.error('Failed to parse JSON file');
                }
            };
            reader.readAsText(file);
        } else {
            reader.onload = async (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const parsed = XLSX.utils.sheet_to_json(worksheet);
                    processImported(parsed);
                } catch (err) {
                    toast.error('Failed to parse file');
                }
            };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = '';
    };

    const exportInstitutes = (format) => {
        const list = institutes;
        if (list.length === 0) {
            toast.error('No institutes to export');
            return;
        }

        const rows = list.map(inst => ({
            Name: inst.name || '',
            Code: inst.code || '',
            Address: inst.address || '',
            'Contact Email': inst.contactEmail || '',
            Phone: inst.phone || '',
            'Helpline Number': inst.helplineNumber || '',
            Description: inst.description || '',
            Controls: inst.controls ? JSON.stringify(inst.controls) : '',
            'Created At': inst.createdAt ? new Date(inst.createdAt).toLocaleString() : ''
        }));

        if (format === 'json') {
            const jsonContent = JSON.stringify(list.map(inst => ({
                name: inst.name || '',
                code: inst.code || '',
                address: inst.address || '',
                contactEmail: inst.contactEmail || '',
                phone: inst.phone || '',
                helplineNumber: inst.helplineNumber || '',
                description: inst.description || '',
                controls: inst.controls || {}
            })), null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `institutes_list_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} institutes to JSON`);
        } else if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `institutes_list_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} institutes to CSV`);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Institutes');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `institutes_list_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} institutes to Excel`);
        }
    };

    return (
        <DashboardLayout role="Admin">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Institutes Management</h1>
                    <p className="text-slate-500">Manage partner institutions and campuses.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer"
                        title="Recycle Bin"
                    >
                        <Trash2 size={16} className="text-red-500" /> Recycle Bin
                    </button>
                    <input
                        type="file"
                        ref={importInstitutesRef}
                        onChange={handleImportInstitutes}
                        accept=".json,.csv,.xlsx,.xls"
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => importInstitutesRef.current?.click()}
                        className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                    >
                        <Upload size={16} /> Import
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-3.5 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white rounded-2xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                        >
                            <Download size={16} /> Export
                        </button>
                        {isExportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={() => { exportInstitutes('excel'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    Excel (.xlsx)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportInstitutes('csv'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    CSV (.csv)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportInstitutes('json'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    JSON (.json)
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] shadow-xl shadow-[#0b1329]/15 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={20} /> Add New Institute
                    </button>
                </div>
            </div>

            {/* Tabs switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit mb-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'active' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-650 hover:text-slate-900'}`}
                >
                    Active Institutes
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'pending' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-650 hover:text-slate-900'}`}
                >
                    Pending Approvals
                    {pendingRequests.length > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-extrabold h-4 px-1.5 rounded-full flex items-center justify-center">
                            {pendingRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'active' ? (
                <>
                    {/* Search */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-[480px]">
                            <div className="relative w-full sm:flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by Name, Code or Location..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer h-[38px] min-w-[120px]"
                                >
                                    <option value="">Bulk Action</option>
                                    <option value="edit">Edit Selected</option>
                                    <option value="delete">Delete Selected</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleApplyBulkAction}
                                    disabled={selectedIds.size === 0 || !bulkAction}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer whitespace-nowrap h-[38px] active:scale-95 flex items-center justify-center border border-transparent disabled:border-slate-100"
                                >
                                    Apply to All ({selectedIds.size})
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            {/* Entries selector */}
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                                <input
                                    type="number"
                                    min={5}
                                    max={filteredInstitutes.length}
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val)) {
                                            setItemsPerPage('');
                                        } else {
                                            const maxVal = filteredInstitutes.length > 5 ? filteredInstitutes.length : 5;
                                            setItemsPerPage(Math.min(val, maxVal));
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val) || val < 5) {
                                            setItemsPerPage(10);
                                        }
                                    }}
                                    className="w-16 bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">entries</span>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-[#0b1329] rounded-lg">
                                <Building size={16} />
                                <span className="text-xs font-semibold uppercase tracking-wider">{institutes.length} Institutes</span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                             <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedInstitutes.length > 0 && selectedIds.size === paginatedInstitutes.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedInstitutes.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedInstitutes.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Institution Name</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Code</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Courses</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Location</th>
                                        <th className="p-4 font-semibold whitespace-nowrap text-center">Show on Landing</th>
                                        <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        [1, 2, 3].map(n => (
                                            <tr key={n} className="animate-pulse">
                                                <td className="p-4 w-10"><div className="w-4 h-4 bg-slate-100 rounded"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                                                <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                                <td className="p-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                                            </tr>
                                        ))
                                    ) : paginatedInstitutes.length > 0 ? (
                                        paginatedInstitutes.map((inst) => (
                                            <tr key={inst._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(inst._id)}
                                                        onChange={() => {
                                                            setSelectedIds(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(inst._id)) {
                                                                    next.delete(inst._id);
                                                                } else {
                                                                    next.add(inst._id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                    />
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-10 h-10 rounded-lg bg-slate-100 text-[#0b1329] flex items-center justify-center font-bold flex-shrink-0 transition-all shadow-sm overflow-hidden cursor-pointer hover:scale-110"
                                                            onClick={() => {
                                                                setSelectedInstitute(inst);
                                                                setIsDetailsModalOpen(true);
                                                            }}
                                                        >
                                                            {inst.imageUrl ? (
                                                                <img src={inst.imageUrl} alt={inst.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Building size={20} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div 
                                                                className="font-extrabold text-slate-800 text-sm cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => {
                                                                    setSelectedInstitute(inst);
                                                                    setIsDetailsModalOpen(true);
                                                                }}
                                                            >
                                                                <TruncatedCell text={inst.name} maxLength={20} />
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                <TruncatedCell text={inst.contactEmail || 'No Email Listed'} maxLength={25} />
                                                            </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold">
                                                        {inst.code}
                                                    </span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div 
                                                        className="flex items-center gap-1.5 text-indigo-650 font-black text-xs cursor-pointer hover:underline hover:text-indigo-850"
                                                        onClick={() => navigate(`/${user?.role?.toLowerCase()}/courses?institute=${inst._id}`)}
                                                    >
                                                        <BookOpen size={14} />
                                                        <span>{inst.courseCount || 0} courses</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                                                        <MapPin size={14} className="text-slate-400" />
                                                        <span><TruncatedCell text={inst.address || 'Not specified'} maxLength={20} /></span>
                                                    </div>
                                                </td>

                                                    {/* ADMISSION TOGGLE COLUMN */}
                                                    <td className="p-4 whitespace-nowrap text-center">
                                                        <label className="relative inline-flex items-center cursor-pointer select-none" title={`Click to ${isAdmissionOpen ? 'Close' : 'Open'} Student Admissions`}>
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only peer" 
                                                                checked={isAdmissionOpen}
                                                                onChange={() => handleToggleAdmission(inst._id)}
                                                            />
                                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                                        </label>
                                                    </td>

                                                    {/* HIRING ROLES COLUMN WITH CLIPPING-PROOF MODAL POPUP */}
                                                    {(() => {
                                                        const activeRoles = [];
                                                        if (inst.controls?.teacher?.hiring !== false && inst.teacherHiring !== false) activeRoles.push('Teacher');
                                                        if (inst.controls?.editor?.hiring !== false && inst.editorHiring !== false) activeRoles.push('Editor');
                                                        if (inst.controls?.accountant?.hiring !== false) activeRoles.push('Accountant');
                                                        if (inst.controls?.marketer?.hiring !== false) activeRoles.push('Marketer');
                                                        if (inst.controls?.parent?.hiring !== false) activeRoles.push('Parent');

                                                        const hiddenCount = activeRoles.length - 1;

                                                        return (
                                                            <td className="p-4 whitespace-nowrap text-center">
                                                                {activeRoles.length === 0 ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                                        Closed
                                                                    </span>
                                                                ) : (
                                                                    <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                                                                        {/* Primary Role Chip */}
                                                                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-full shadow-2xs">
                                                                            {activeRoles[0]}
                                                                        </span>

                                                                        {/* +More Button */}
                                                                        {hiddenCount > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setHiringModalData({ instName: inst.name, roles: activeRoles });
                                                                                }}
                                                                                className="px-2.5 py-1 font-extrabold text-xs rounded-full transition-all shadow-xs cursor-pointer active:scale-95 border bg-[#0b1329] hover:bg-[#152244] text-white border-[#0b1329]"
                                                                                title={`Click to view all ${activeRoles.length} active hiring roles`}
                                                                            >
                                                                                +{hiddenCount} more
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })()}

                                                    {/* SHOW ON LANDING TOGGLE COLUMN */}
                                                    <td className="p-4 whitespace-nowrap text-center">
                                                        <label className="relative inline-flex items-center cursor-pointer select-none" title="Toggle Public Landing Page Visibility">
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only peer" 
                                                                checked={inst.showOnLanding || false}
                                                                onChange={() => handleToggleLanding(inst._id)}
                                                            />
                                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                        </label>
                                                    </td>
                                                <td className="p-4 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] z-10">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInstitute(inst);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-[#0b1329] hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => openControlsPanel(inst)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2"
                                                        title="Manage Controls"
                                                    >
                                                        <Shield size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInstitute(inst);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-[#0b1329] hover:bg-slate-100 rounded-lg transition-colors ml-2"
                                                        title="Edit Institute"
                                                    >
                                                        <Edit size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(inst._id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                        title="Delete Institute"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-slate-500">
                                                No institutes found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredInstitutes.length > 0 && (
                            <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                                <div className="text-sm font-semibold text-slate-500">
                                    Showing <span className="text-slate-700">{startIndex + 1}</span> to{' '}
                                    <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, filteredInstitutes.length)}</span> of{' '}
                                    <span className="text-slate-700">{filteredInstitutes.length}</span> entries
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex gap-1">
                                        {(() => {
                                            const pages = [];
                                            const maxVisible = 5;
                                            if (totalPages <= maxVisible) {
                                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                                            } else {
                                                pages.push(1);
                                                let start = Math.max(2, currentPage - 1);
                                                let end = Math.min(totalPages - 1, currentPage + 1);
                                                if (currentPage <= 2) {
                                                    end = 4;
                                                } else if (currentPage >= totalPages - 1) {
                                                    start = totalPages - 3;
                                                }
                                                if (start > 2) pages.push('...');
                                                for (let i = start; i <= end; i++) pages.push(i);
                                                if (end < totalPages - 1) pages.push('...');
                                                pages.push(totalPages);
                                            }
                                            return pages.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    disabled={p === '...'}
                                                    onClick={() => p !== '...' && setCurrentPage(p)}
                                                    className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${
                                                        p === '...'
                                                            ? 'text-slate-400 cursor-default bg-transparent'
                                                            : currentPage === p
                                                                ? 'bg-[#0b1329] text-white shadow-md'
                                                                : 'text-slate-650 hover:bg-slate-100 bg-transparent'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Pending Approvals View */
<div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in text-left">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border border-slate-200 text-slate-505 text-xs font-bold uppercase tracking-wider">
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={pendingRequests.length > 0 && selectedIds.size === pendingRequests.length}
                                            onChange={() => {
                                                if (selectedIds.size === pendingRequests.length) {
                                                    setSelectedIds(new Set());
                                                } else {
                                                    setSelectedIds(new Set(pendingRequests.map(item => item._id)));
                                                }
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                        />
                                    </th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Institution Name</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Requested Code</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Contact Email</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Phone</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Location/Address</th>
                                    <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                {loadingRequests ? (
                                    [1, 2, 3].map(n => (
                                        <tr key={n} className="animate-pulse">
                                            <td className="p-4 w-10"><div className="w-4 h-4 bg-slate-100 rounded"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                            <td className="p-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                                            <td className="p-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : pendingRequests.length > 0 ? (
                                    pendingRequests.map((req) => (
                                        <tr key={req._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(req._id)}
                                                    onChange={() => {
                                                        setSelectedIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(req._id)) {
                                                                next.delete(req._id);
                                                            } else {
                                                                next.add(req._id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                                />
                                            </td>
                                            <td className="p-4 whitespace-nowrap font-extrabold text-slate-800">{req.name}</td>
                                            <td className="p-4 whitespace-nowrap font-mono text-xs">
                                                <span className="bg-indigo-50 text-indigo-705 px-2 py-0.5 rounded font-black">
                                                    {req.instituteDetails?.code || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 font-semibold">{req.email}</td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 font-semibold">{req.phone || 'N/A'}</td>
                                            <td className="p-4 whitespace-nowrap text-slate-500 font-semibold">{req.instituteDetails?.address || 'N/A'}</td>
                                            <td className="p-4 whitespace-nowrap text-right sticky right-0 bg-white border-l border-slate-200 z-10 space-x-2">
                                                <button
                                                    onClick={() => handleResolveRequest(req._id, 'Approved')}
                                                    disabled={resolvingId !== null}
                                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleResolveRequest(req._id, 'Rejected')}
                                                    disabled={resolvingId !== null}
                                                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-slate-400 font-bold text-sm">
                                            No pending institute registration requests.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AddInstituteModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                refreshData={fetchData}
            />

            <EditInstituteModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedInstitute(null);
                }}
                refreshData={fetchData}
                institute={selectedInstitute}
            />

            <InstituteDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedInstitute(null);
                }}
                instituteId={selectedInstitute?._id}
            />

            {/* Controls Panel Modal */}
            {controlsPanel && controlsData && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setControlsPanel(null)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setControlsPanel(null)} />
                    {/* Panel */}
                    <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-800 leading-none">{controlsPanel.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold mt-0.5">Manage Access Controls</p>
                                </div>
                            </div>
                            <button onClick={() => setControlsPanel(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - scrollable */}
                        <div className="overflow-y-auto p-7 space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-700 font-semibold flex items-center gap-2">
                                <Shield size={13} className="shrink-0" />
                                Uncheck items to hide them from this institute's admin panel.
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderInstituteControlSection({
                                    id: 'dashboard',
                                    label: 'Dashboard Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.dashboard?.application !== false} onChange={e => handleControlChange('dashboard', 'application', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Applications Tab</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.dashboard?.staffRequest !== false} onChange={e => handleControlChange('dashboard', 'staffRequest', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Staff Requests Tab</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'student',
                                    label: 'Student Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.student?.admissionOpen !== false} onChange={e => handleControlChange('student', 'admissionOpen', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Admission Toggle</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.student?.addStudent !== false} onChange={e => handleControlChange('student', 'addStudent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Student Button</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.student?.editStudent !== false} onChange={e => handleControlChange('student', 'editStudent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Student Button</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.student?.dailyAttendanceLog !== false} onChange={e => handleControlChange('student', 'dailyAttendanceLog', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Daily Attendance Log</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.student?.feeManagement !== false} onChange={e => handleControlChange('student', 'feeManagement', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Fee Management</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.student?.studentDirectory !== false} onChange={e => handleControlChange('student', 'studentDirectory', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Student Directory</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'teacher',
                                    label: 'Teacher Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.teacher?.hiring !== false} onChange={e => handleControlChange('teacher', 'hiring', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Hiring Toggle</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.teacher?.addTeacher !== false} onChange={e => handleControlChange('teacher', 'addTeacher', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Teacher Button</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.teacher?.editTeacher !== false} onChange={e => handleControlChange('teacher', 'editTeacher', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Teacher Button</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.teacher?.teacherDirectory !== false} onChange={e => handleControlChange('teacher', 'teacherDirectory', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Teacher Directory</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.teacher?.dailyAttendanceLog !== false} onChange={e => handleControlChange('teacher', 'dailyAttendanceLog', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Daily Attendance Log</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'editor',
                                    label: 'Editor Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.editor?.hiring !== false} onChange={e => handleControlChange('editor', 'hiring', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Hiring Toggle</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.editor?.addEditor !== false} onChange={e => handleControlChange('editor', 'addEditor', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Editor Button</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.editor?.editEditor !== false} onChange={e => handleControlChange('editor', 'editEditor', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Editor Button</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'accountant',
                                    label: 'Accountant Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.accountant?.addAccountant !== false} onChange={e => handleControlChange('accountant', 'addAccountant', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add New Accountants</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.accountant?.editAccountant !== false} onChange={e => handleControlChange('accountant', 'editAccountant', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'staff',
                                    label: 'My Staff Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.staff?.addStaff !== false} onChange={e => handleControlChange('staff', 'addStaff', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Staff</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.staff?.staffDirectory !== false} onChange={e => handleControlChange('staff', 'staffDirectory', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Staff Directory</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.staff?.attendanceManagement !== false} onChange={e => handleControlChange('staff', 'attendanceManagement', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Attendance Managements</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.staff?.salaryPayouts !== false} onChange={e => handleControlChange('staff', 'salaryPayouts', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Salary &amp; Payouts</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.staff?.taskAssignment !== false} onChange={e => handleControlChange('staff', 'taskAssignment', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Task Assignments</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'parent',
                                    label: 'Parents Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.parent?.addParent !== false} onChange={e => handleControlChange('parent', 'addParent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Parent</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.parent?.editParent !== false} onChange={e => handleControlChange('parent', 'editParent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'course',
                                    label: 'Course Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.course?.addNewCourse !== false} onChange={e => handleControlChange('course', 'addNewCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add New Course</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.course?.addNewDemoCourse !== false} onChange={e => handleControlChange('course', 'addNewDemoCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add New Demo Course</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.course?.editCourse !== false} onChange={e => handleControlChange('course', 'editCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Button</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'subject',
                                    label: 'Subject Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.subject?.addSubject !== false} onChange={e => handleControlChange('subject', 'addSubject', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Subject</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.subject?.editSubject !== false} onChange={e => handleControlChange('subject', 'editSubject', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({
                                    id: 'activities',
                                    label: 'Activities Page',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.activities?.createAssignment !== false} onChange={e => handleControlChange('activities', 'createAssignment', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Create New Assignment</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.activities?.editAssignment !== false} onChange={e => handleControlChange('activities', 'editAssignment', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.activities?.lmsConnectedTests !== false} onChange={e => handleControlChange('activities', 'lmsConnectedTests', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />LMS Connected Tests</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.activities?.publicWebTest !== false} onChange={e => handleControlChange('activities', 'publicWebTest', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Public Web Test</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.activities?.draftTests !== false} onChange={e => handleControlChange('activities', 'draftTests', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Draft Tests</label>
                                            <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.activities?.openFolderExplorer !== false} onChange={e => handleControlChange('activities', 'openFolderExplorer', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Open Folder Explorer</label>
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: (
                                    <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                        <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.drive?.newDrive !== false} onChange={e => handleControlChange('drive', 'newDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />New</label>
                                        <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.drive?.integrateDrive !== false} onChange={e => handleControlChange('drive', 'integrateDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Integrate</label>
                                        <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.drive?.viewDrive !== false} onChange={e => handleControlChange('drive', 'viewDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />View</label>
                                    </div>
                                ) })}
                                
                                {renderInstituteControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: (
                                    <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                        <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.notes?.newNote !== false} onChange={e => handleControlChange('notes', 'newNote', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />New Note</label>
                                        <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.notes?.saveDraft !== false} onChange={e => handleControlChange('notes', 'saveDraft', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Save Draft</label>
                                        <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.notes?.saveNotes !== false} onChange={e => handleControlChange('notes', 'saveNotes', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Save Notes</label>
                                    </div>
                                ) })}

                                {renderInstituteControlSection({
                                    id: 'tools',
                                    label: 'Form & Database Creator Tools',
                                    hasSubControls: true,
                                    subControls: (
                                        <div className="pl-1 space-y-2 animate-fade-in grid grid-cols-2 gap-2.5 text-left font-bold text-slate-600">
                                            {[
                                                { id: 'formBuilderTool', label: 'Form Builder' },
                                                { id: 'databaseCreatorTool', label: 'Database Creator' },
                                                { id: 'elementsControl', label: 'Elements Control' },
                                                { id: 'inputElements', label: 'Input Elements' },
                                                { id: 'displayingElements', label: 'Displaying Elements' },
                                                { id: 'recordingElements', label: 'Recording Elements' },
                                                { id: 'advanceElements', label: 'Advance Elements' },
                                                { id: 'addons', label: 'Add-ons' },
                                                { id: 'theme', label: 'Theme Styling' },
                                                { id: 'createWithAi', label: 'Create with AI' },
                                                { id: 'integrate', label: 'Integrate' },
                                                { id: 'import', label: 'Import' },
                                                { id: 'saveAsTemplate', label: 'Save As Template' },
                                                { id: 'decideActivity', label: 'Decide Activity' },
                                                { id: 'templates', label: 'Browse Templates' },
                                                { id: 'locationLocked', label: 'Location Locked' },
                                                { id: 'logicRules', label: 'Logic Rules' },
                                                { id: 'monitoring', label: 'Monitoring' },
                                                { id: 'connectIt', label: 'Connect It' },
                                                { id: 'profileUnderSettings', label: 'Profile Under Settings' },
                                                { id: 'moreSettings', label: 'More Settings' },
                                                { id: 'responses', label: 'Responses' },
                                                { id: 'collaborate', label: 'Collaborate' },
                                                { id: 'manageAccess', label: 'Manage Access' },
                                                { id: 'publicToWeb', label: 'Public to Web' }
                                            ].map(item => (
                                                <label key={item.id} className="flex items-center gap-2.5 text-xs text-slate-655 font-bold cursor-pointer"><input type="checkbox" checked={controlsData.tools?.[item.id] !== false} onChange={e => handleControlChange('tools', item.id, e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />{item.label}</label>
                                            ))}
                                        </div>
                                    )
                                })}

                                {renderInstituteControlSection({ id: 'chat', label: 'Chat Page' })}
                            

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 px-7 py-5 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setControlsPanel(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveControls}
                                disabled={savingControls}
                                className="flex-1 py-3 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {savingControls && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {savingControls ? 'Saving...' : <><Check size={16} /> Save Controls</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <RecycleBinModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title="Institutes Recycle Bin"
                trashUrl="/api/setup/institutes/trash"
                onRestoreSuccess={fetchData}
                restoreUrlPattern={(id) => `/api/setup/institutes/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/setup/institutes/${id}/permanent`}
                renderItemDetail={(item) => `Code: ${item.code} | Email: ${item.contactEmail}`}
            />
            <BulkEditModal
                isOpen={isBulkEditOpen}
                onClose={() => setIsBulkEditOpen(false)}
                type="institute"
                selectedIds={Array.from(selectedIds)}
                onSuccess={() => {
                    fetchData();
                    if (activeTab === 'pending') {
                        fetchPendingRequests();
                    }
                }}
            />
            {hiringModalData && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
                    <div 
                        className="fixed inset-0" 
                        onClick={() => setHiringModalData(null)} 
                    />
                    <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 z-50 text-center space-y-4 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5 text-left">
                                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-base shadow-xs">
                                    💼
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{hiringModalData.instName}</h4>
                                    <p className="text-[11px] font-bold text-slate-400">All Active Hirings ({hiringModalData.roles.length})</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setHiringModalData(null)}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* List of Active Roles */}
                        <div className="grid grid-cols-1 gap-2 pt-1">
                            {hiringModalData.roles.map((role, rIdx) => (
                                <div 
                                    key={rIdx} 
                                    className="flex items-center justify-between p-3 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/90 rounded-2xl transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="font-extrabold text-amber-900 text-xs">{role} Role</span>
                                    </div>
                                    <span className="px-2.5 py-0.5 bg-amber-200/80 text-amber-900 font-extrabold text-[10px] rounded-full">
                                        Actively Hiring
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={() => setHiringModalData(null)}
                            className="w-full py-2.5 bg-[#0b1329] hover:bg-[#152244] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default InstitutesList;

