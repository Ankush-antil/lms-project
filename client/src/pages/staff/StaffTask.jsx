import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { CheckSquare, Clock, CheckCircle, Circle, AlertCircle, Calendar, Plus, X, Trash2, Eye, Upload, Shield, ShieldCheck, ShieldX, ShieldAlert, AlertTriangle, PauseCircle, TrendingUp, Bell, Pencil, Check, Award } from 'lucide-react';
import toast from 'react-hot-toast';

// Verification Status info helper
const VERIFICATION_OPTIONS = [
    { value: '', label: 'Not Verified', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0', icon: Shield },
    { value: 'under_verification', label: 'Under Verification', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: Shield },
    { value: 'approved', label: 'Approved', color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: ShieldCheck },
    { value: 'rejected', label: 'Rejected', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: ShieldX },
    { value: 'needs_revision', label: 'Needs Revision', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: ShieldAlert },
    { value: 'evidence_insufficient', label: 'Evidence Insufficient', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: AlertTriangle },
    { value: 'on_hold', label: 'On Hold', color: '#475569', bg: '#f8fafc', border: '#cbd5e1', icon: PauseCircle },
    { value: 'escalated', label: 'Escalated', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', icon: TrendingUp },
];
const getVerifInfo = (val) => VERIFICATION_OPTIONS.find(o => o.value === (val || '')) || VERIFICATION_OPTIONS[0];

const openGoogleCalendar = (title, dateStr, timeStr) => {
    if (!dateStr) { toast.error('No date set to add to calendar.'); return; }
    const d = new Date(dateStr + 'T' + (timeStr || '09:00') + ':00');
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    const start = fmt(d);
    const end = fmt(new Date(d.getTime() + 60 * 60 * 1000));
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent('Task Reminder: ' + title)}`;
    window.open(url, '_blank');
};

const priorityColors = {
    Urgent: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#10b981'
};

const columns = [
    { key: 'pending', label: 'Pending', icon: <Circle size={14} />, color: '#ef4444', bg: '#fef2f2' },
    { key: 'inprogress', label: 'In Progress', icon: <Clock size={14} />, color: '#eab308', bg: '#fef9c3' },
    { key: 'done', label: 'Completed', icon: <CheckCircle size={14} />, color: '#10b981', bg: '#f0fdf4' },
];

const StaffTask = () => {
    const { user } = useAuth();
    const [allTasks, setAllTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('today'); // 'today', 'assigned', or 'self-created'

    // Date filter states for Assigned tab
    const [assignedDateFilter, setAssignedDateFilter] = useState('year');
    const [assignedStartDate, setAssignedStartDate] = useState('');
    const [assignedEndDate, setAssignedEndDate] = useState('');
    const [assignedParticularDate, setAssignedParticularDate] = useState('');

    // Date filter states for Self-Created tab
    const [selfDateFilter, setSelfDateFilter] = useState('year');
    const [selfStartDate, setSelfStartDate] = useState('');
    const [selfEndDate, setSelfEndDate] = useState('');
    const [selfParticularDate, setSelfParticularDate] = useState('');

    // Verification & Status filter states for Assigned tab
    const [assignedVerificationFilter, setAssignedVerificationFilter] = useState('');
    const [assignedStatusFilter, setAssignedStatusFilter] = useState('');

    // Verification & Status filter states for Self-Created tab
    const [selfVerificationFilter, setSelfVerificationFilter] = useState('');
    const [selfStatusFilter, setSelfStatusFilter] = useState('');

    // Add extra task states
    const [showAddModal, setShowAddModal] = useState(false);
    const [taskModalRows, setTaskModalRows] = useState([
        { title: '', description: '', timeTaken: '' },
        { title: '', description: '', timeTaken: '' }
    ]);
    const [descPopupIndex, setDescPopupIndex] = useState(null);
    const [descPopupText, setDescPopupText] = useState('');
    const [viewingTask, setViewingTask] = useState(null);
    const [editingSelfTask, setEditingSelfTask] = useState(null);
    const [editSelfTitle, setEditSelfTitle] = useState('');
    const [editSelfDescription, setEditSelfDescription] = useState('');

    // Evidence submission states
    const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
    const [selectedEvidenceTask, setSelectedEvidenceTask] = useState(null);
    const [evidenceText, setEvidenceText] = useState('');
    const [evidenceFileBase64, setEvidenceFileBase64] = useState('');
    const [evidenceFileName, setEvidenceFileName] = useState('');

    // Evidence viewing states
    const [viewEvidenceModalOpen, setViewEvidenceModalOpen] = useState(false);
    const [viewingEvidenceTask, setViewingEvidenceTask] = useState(null);
    const [viewingValuation, setViewingValuation] = useState(null);

    // Completion date/time picker states
    const [completionPickerOpen, setCompletionPickerOpen] = useState(false);
    const [completionTaskId, setCompletionTaskId] = useState(null);
    const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
    const [completionTime, setCompletionTime] = useState(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [pendingNewStatus, setPendingNewStatus] = useState('');
    const [completionTimeTaken, setCompletionTimeTaken] = useState('');
    const [editingTimeTaskId, setEditingTimeTaskId] = useState(null);
    const [editingTimeValue, setEditingTimeValue] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setEvidenceFileBase64(reader.result);
            setEvidenceFileName(file.name);
        };
        reader.readAsDataURL(file);
    };



    const addTaskRow = () => {
        setTaskModalRows(prev => [...prev, { title: '', description: '', timeTaken: '' }]);
    };

    const removeTaskRow = (idx) => {
        setTaskModalRows(prev => prev.filter((_, i) => i !== idx));
    };

    const handleRowChange = (idx, field, value) => {
        setTaskModalRows(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };

    // Save tasks back to localStorage and update state
    const updateTasksInStorage = (updatedList) => {
        setAllTasks(updatedList);
        localStorage.setItem('staff_tasks', JSON.stringify(updatedList));
    };

    // Add extra task handler
    const handleAddTask = (e) => {
        e.preventDefault();

        const validRows = taskModalRows.filter(row => row.title?.trim());
        if (validRows.length === 0) {
            toast.error('At least one task title is required');
            return;
        }

        const newTasks = validRows.map((row, idx) => ({
            id: (Date.now() + idx).toString(),
            staffName: user?.name,
            title: row.title.trim(),
            description: row.description || '',
            priority: 'Medium',
            due: '',
            reminderTime: '',
            remark: '',
            status: 'done',
            isSelfCreated: true,
            timeTaken: row.timeTaken || '', // Save time taken for self-created task
            createdAt: new Date().toISOString().split('T')[0]
        }));

        const updated = [...newTasks, ...allTasks];
        updateTasksInStorage(updated);
        toast.success(`${newTasks.length} task(s) added successfully!`);

        // Reset form & close
        setTaskModalRows([
            { title: '', description: '', timeTaken: '' },
            { title: '', description: '', timeTaken: '' }
        ]);
        setShowAddModal(false);
    };

    // Delete extra task handler
    const handleDeleteSelfTask = (taskId) => {
        if (window.confirm('Are you sure you want to delete this self-created task?')) {
            const updated = allTasks.filter(t => t.id !== taskId);
            updateTasksInStorage(updated);
            toast.success('Task deleted.');
        }
    };

    const handleSaveTimeTaken = (taskId) => {
        if (!editingTimeValue.trim()) {
            toast.error('Time taken cannot be empty.');
            return;
        }
        const updated = allTasks.map(t => t.id === taskId ? { ...t, timeTaken: editingTimeValue.trim() } : t);
        updateTasksInStorage(updated);
        toast.success('Time taken updated successfully! ✅');
        setEditingTimeTaskId(null);
        setEditingTimeValue('');
    };

    const openEditSelfTaskModal = (task) => {
        setEditingSelfTask(task);
        setEditSelfTitle(task.title);
        setEditSelfDescription(task.description || '');
    };

    const handleSaveEditSelfTask = (e) => {
        e.preventDefault();
        if (!editSelfTitle.trim()) {
            toast.error('Task title is required');
            return;
        }
        const updated = allTasks.map(t => t.id === editingSelfTask.id ? {
            ...t,
            title: editSelfTitle.trim(),
            description: editSelfDescription.trim()
        } : t);
        updateTasksInStorage(updated);
        toast.success('Self-created task updated successfully!');
        setEditingSelfTask(null);
    };

    // Load tasks from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('staff_tasks');
        if (stored) {
            try {
                setAllTasks(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse staff tasks', e);
            }
        }
    }, []);



    // Update status of a task
    const handleStatusChange = (taskId, newStatus) => {
        if (newStatus === 'done') {
            // Show completion date/time/evidence picker before marking done
            setCompletionTaskId(taskId);
            setPendingNewStatus('done');
            setCompletionDate(new Date().toISOString().split('T')[0]);
            const now = new Date();
            setCompletionTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

            // Reset evidence inputs for a clean state
            setEvidenceText('');
            setEvidenceFileBase64('');
            setEvidenceFileName('');

            setCompletionPickerOpen(true);
        } else {
            const updated = allTasks.map(t => t.id === taskId ? {
                ...t,
                status: newStatus,
                completedAt: null,
                completedTime: null,
                evidenceNote: null,
                evidenceFile: null,
                evidenceFileName: null,
                submittedAt: null,
                verificationStatus: '' // reset verification
            } : t);
            updateTasksInStorage(updated);
            toast.success(`Task status updated to ${newStatus === 'inprogress' ? 'In Progress' : 'Pending'}!`);
        }
    };

    const handleConfirmCompletion = () => {
        if (!completionTaskId) return;
        if (!evidenceText.trim()) {
            toast.error('Please enter completion remarks / notes.');
            return;
        }
        const updated = allTasks.map(t => t.id === completionTaskId ? {
            ...t,
            status: 'done',
            completedAt: completionDate,
            completedTime: completionTime,
            evidenceNote: evidenceText,
            evidenceFile: evidenceFileBase64,
            evidenceFileName: evidenceFileName,
            timeTaken: completionTimeTaken, // Save time taken
            submittedAt: completionDate,
            verificationStatus: 'under_verification' // set verification status to under_verification
        } : t);
        updateTasksInStorage(updated);

        // Reset the seen notification for this task in local storage so admin is alerted
        try {
            const seen = JSON.parse(localStorage.getItem('seen_task_notifications') || '[]');
            const filteredSeen = seen.filter(id => id !== completionTaskId);
            localStorage.setItem('seen_task_notifications', JSON.stringify(filteredSeen));
        } catch (e) {
            console.error('Failed to update seen notifications', e);
        }

        toast.success('Task marked as Completed with evidence! ✅');
        setCompletionPickerOpen(false);
        setCompletionTaskId(null);

        // Reset evidence inputs
        setEvidenceText('');
        setEvidenceFileBase64('');
        setEvidenceFileName('');
        setCompletionTimeTaken('');
    };

    const myTasks = allTasks.filter(t => t.staffName?.toLowerCase() === user?.name?.toLowerCase());
    // Filter points logs belonging to currently logged-in staff member
    const allPointsLogs = JSON.parse(localStorage.getItem('staff_points') || localStorage.getItem('staff_minus_points') || '[]');
    const myPointsLogs = allPointsLogs.filter(log => log.staffId === user?._id || log.staffName?.toLowerCase() === user?.name?.toLowerCase());


    // Helper to format Date objects to YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's tasks (tasks due today OR tasks created today)
    const todayTasks = myTasks.filter(t => t.due === todayStr || t.createdAt === todayStr);

    // All Assigned tasks (including today's)
    const assignedTasks = myTasks.filter(t => !t.isSelfCreated);

    // All Self-created tasks (including today's)
    const selfCreatedTasks = myTasks.filter(t => t.isSelfCreated);

    // Helper: apply date filter to a task
    const applyDateFilter = (t, filter, startDate, endDate, particularDate) => {
        const taskDate = t.createdAt || t.due || todayStr;
        if (filter === 'month') {
            return taskDate.startsWith(todayStr.substring(0, 7));
        }
        if (filter === 'range') {
            if (!startDate || !endDate) return true;
            return taskDate >= startDate && taskDate <= endDate;
        }
        if (filter === 'particular') {
            if (!particularDate) return true;
            return taskDate === particularDate;
        }
        // 'year' = show all
        return true;
    };

    const filteredAssignedTasks = assignedTasks.filter(t =>
        applyDateFilter(t, assignedDateFilter, assignedStartDate, assignedEndDate, assignedParticularDate) &&
        (assignedVerificationFilter === '' || (t.verificationStatus || '') === assignedVerificationFilter) &&
        (assignedStatusFilter === '' || (t.status || 'pending') === assignedStatusFilter)
    );
    const filteredSelfCreatedTasks = selfCreatedTasks.filter(t =>
        applyDateFilter(t, selfDateFilter, selfStartDate, selfEndDate, selfParticularDate) &&
        (selfVerificationFilter === '' || (t.verificationStatus || '') === selfVerificationFilter) &&
        (selfStatusFilter === '' || (t.status || 'pending') === selfStatusFilter)
    );

    // Helper to format 24h to 12h time
    const formatTime12h = (t24) => {
        if (!t24) return '';
        const [h, m] = t24.split(':');
        const hrs = parseInt(h, 10);
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const hrs12 = hrs % 12 || 12;
        return `${String(hrs12).padStart(2, '0')}:${m} ${ampm}`;
    };

    // Helper function to render a tasks table
    const renderTasksTable = (tasksList, isSelfCreatedTable = false) => {
        return (
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: isSelfCreatedTable ? '800px' : '1300px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '80px', whiteSpace: 'nowrap' }}>Task No.</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '130px', whiteSpace: 'nowrap' }}>Assigned Date</th>
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '140px', whiteSpace: 'nowrap' }}>Due Date</th>
                                )}
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '120px', whiteSpace: 'nowrap' }}>Valuation</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '130px', whiteSpace: 'nowrap' }}>Time Taken</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: isSelfCreatedTable ? '400px' : '300px', whiteSpace: 'nowrap' }}>Task Title &amp; Description</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '150px', whiteSpace: 'nowrap' }}>Remark</th>
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '100px', whiteSpace: 'nowrap' }}>Priority</th>
                                )}
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '120px', whiteSpace: 'nowrap' }}>Type</th>
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '145px', whiteSpace: 'nowrap' }}>Show Reminder</th>
                                )}
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '160px', whiteSpace: 'nowrap' }}>Verification</th>
                                )}
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '140px', whiteSpace: 'nowrap' }}>Action</th>
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '180px', textAlign: 'center', whiteSpace: 'nowrap' }}>Report with Evidence</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {tasksList.map((task, idx) => {
                                const priorityColor = priorityColors[task.priority] || '#64748b';

                                return (
                                    <tr key={task.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        {/* Task No */}
                                        <td style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                                            {idx + 1}
                                        </td>
                                        {/* Assigned Date */}
                                        <td style={{ padding: '16px 20px', fontSize: '0.75rem', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                <span>📅 {(task.assignedDate || task.createdAt) ? new Date((task.assignedDate || task.createdAt) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                                {(task.assignedDate || task.createdAt) && (
                                                    <button
                                                        onClick={() => openGoogleCalendar('Assigned: ' + task.title, (task.assignedDate || task.createdAt), null)}
                                                        title="Add to Google Calendar"
                                                        style={{ width: 20, height: 20, borderRadius: '5px', border: '1px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2563eb', flexShrink: 0 }}
                                                    >
                                                        <Calendar size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        {/* Due Date */}
                                        {!isSelfCreatedTable && (
                                            <td style={{ padding: '16px 20px', fontSize: '0.75rem', color: '#475569', fontWeight: 650, whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                    <span>📅 {task.due ? new Date(task.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'}</span>
                                                    {task.due && (
                                                        <button
                                                            onClick={() => openGoogleCalendar('Due: ' + task.title, task.due, task.reminderTime)}
                                                            title="Add Due Date to Google Calendar"
                                                            style={{ width: 20, height: 20, borderRadius: '5px', border: '1px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2563eb', flexShrink: 0 }}
                                                        >
                                                            <Calendar size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {/* Valuation */}
                                        <td style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                            {task.valuation ? `₹${Number(task.valuation).toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        {/* Time Taken */}
                                        <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                                            {editingTimeTaskId === task.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <input
                                                        type="text"
                                                        value={editingTimeValue}
                                                        onChange={e => setEditingTimeValue(e.target.value)}
                                                        style={{
                                                            width: '100px', padding: '6px 10px',
                                                            border: '1.5px solid #cbd5e1', borderRadius: '8px',
                                                            fontSize: '0.75rem', fontWeight: 700, color: '#0f172a',
                                                            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                                                        }}
                                                        placeholder="e.g. 2 hours"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveTimeTaken(task.id)}
                                                        title="Save"
                                                        style={{ border: 'none', background: '#dcfce7', color: '#16a34a', borderRadius: '6px', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingTimeTaskId(null);
                                                            setEditingTimeValue('');
                                                        }}
                                                        title="Cancel"
                                                        style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '6px', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                                                        {task.timeTaken ? task.timeTaken : '—'}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingTimeTaskId(task.id);
                                                            setEditingTimeValue(task.timeTaken || '');
                                                        }}
                                                        title="Edit Time Taken"
                                                        style={{
                                                            border: 'none', background: '#f1f5f9', color: '#64748b',
                                                            borderRadius: '6px', width: 22, height: 22,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', transition: 'all 0.2s', opacity: 0.7
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.opacity = '1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.opacity = '0.7'; }}
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        {/* Title & Description */}
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{task.title}</div>
                                            {task.description && (
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550, marginTop: '4px', lineHeight: 1.4 }}>{task.description}</div>
                                            )}
                                        </td>
                                        {/* Remark */}
                                        <td style={{ padding: '16px 20px' }}>
                                            {task.remark ? (
                                                <span style={{ display: 'inline-flex', gap: '4px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', color: '#b45309', fontWeight: 800 }}>
                                                    📝 {task.remark}
                                                </span>
                                            ) : <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>—</span>}
                                        </td>
                                        {/* Priority */}
                                        {!isSelfCreatedTable && (
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{
                                                    background: `${priorityColor}15`,
                                                    color: priorityColor,
                                                    border: `1.5px solid ${priorityColor}30`,
                                                    fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px',
                                                    borderRadius: '20px', textTransform: 'uppercase'
                                                }}>
                                                    {task.priority || 'Medium'}
                                                </span>
                                            </td>
                                        )}
                                        {/* Type */}
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={{
                                                background: task.isSelfCreated ? '#fef9c3' : '#e0e7ff',
                                                color: task.isSelfCreated ? '#ca8a04' : '#4338ca',
                                                border: `1.5px solid ${task.isSelfCreated ? '#fde68a' : '#c7d2fe'}`,
                                                fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px',
                                                borderRadius: '20px', textTransform: 'uppercase'
                                            }}>
                                                {task.isSelfCreated ? 'Self-Created' : 'Assigned'}
                                            </span>
                                        </td>
                                        {/* Show Reminder */}
                                        {!isSelfCreatedTable && (
                                            <td style={{ padding: '16px 20px', fontSize: '0.72rem', color: '#6366f1', fontWeight: 700 }}>
                                                {task.reminderTime ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        ⏰ {formatTime12h(task.reminderTime)}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        )}
                                        {/* Verification Status (read-only, set by Institute) */}
                                        {!isSelfCreatedTable && (() => {
                                            const verif = getVerifInfo(task.verificationStatus);
                                            const VerifIcon = verif.icon;
                                            return (
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: verif.bg, color: verif.color, border: `1.5px solid ${verif.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '0.62rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                                                        <VerifIcon size={10} />
                                                        {verif.label}
                                                    </span>
                                                    {task.completedAt && (
                                                        <div style={{ fontSize: '0.65rem', color: '#16a34a', marginTop: '4px', fontWeight: 700 }}>
                                                            ✅ {new Date(task.completedAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{task.completedTime && ` ${formatTime12h(task.completedTime)}`}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })()}
                                        {/* Action */}
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {task.isSelfCreated ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            background: '#dcfce7',
                                                            color: '#16a34a',
                                                            border: '1.5px solid #86efac',
                                                            borderRadius: '20px',
                                                            padding: '2px 8px',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 900,
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            Completed
                                                        </span>
                                                        {/* Preview button */}
                                                        <button
                                                            onClick={() => setViewingTask(task)}
                                                            title="View details"
                                                            style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                                                        >
                                                            <Eye size={12} />
                                                        </button>
                                                        {/* Edit button */}
                                                        <button
                                                            onClick={() => openEditSelfTaskModal(task)}
                                                            title="Edit task"
                                                            style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ca8a04', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ca8a04'; e.currentTarget.style.background = '#fef9c3'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fff'; }}
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        {/* Delete button */}
                                                        <button
                                                            onClick={() => handleDeleteSelfTask(task.id)}
                                                            title="Delete task"
                                                            style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid #fee2e2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#fee2e2'; e.currentTarget.style.background = '#fff'; }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {task.status === 'done' ? (
                                                            task.verificationStatus === 'approved' ? (
                                                                <span style={{
                                                                    background: '#dcfce7',
                                                                    color: '#16a34a',
                                                                    border: '1.5px solid #86efac',
                                                                    borderRadius: '20px',
                                                                    padding: '2px 8px',
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 900,
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    Completed
                                                                </span>
                                                            ) : task.verificationStatus === 'under_verification' ? (
                                                                <span style={{
                                                                    background: '#eff6ff',
                                                                    color: '#2563eb',
                                                                    border: '1.5px solid #bfdbfe',
                                                                    borderRadius: '20px',
                                                                    padding: '2px 8px',
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 900,
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    Submitted
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    background: '#f1f5f9',
                                                                    color: '#475569',
                                                                    border: '1.5px solid #cbd5e1',
                                                                    borderRadius: '20px',
                                                                    padding: '2px 8px',
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 900,
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    Pending Verification
                                                                </span>
                                                            )
                                                        ) : (
                                                            <select
                                                                value={task.status?.toLowerCase() || 'pending'}
                                                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #cbd5e1',
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 800,
                                                                    background: '#f8fafc',
                                                                    color: '#334155',
                                                                    outline: 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="inprogress">In Progress</option>
                                                                <option value="done">Completed</option>
                                                            </select>
                                                        )}
                                                        {/* Preview button */}
                                                        <button
                                                            onClick={() => setViewingTask(task)}
                                                            title="View details"
                                                            style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                                                        >
                                                            <Eye size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {/* Report with Evidence */}
                                        {!isSelfCreatedTable && (
                                            <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                {task.evidenceNote || task.evidenceFile ? (
                                                    <button
                                                        onClick={() => {
                                                            setViewingEvidenceTask(task);
                                                            setViewEvidenceModalOpen(true);
                                                        }}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '8px',
                                                            border: '1.5px solid #86efac',
                                                            background: '#f0fdf4',
                                                            color: '#16a34a',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; }}
                                                    >
                                                        View Evidence
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            handleStatusChange(task.id, 'done');
                                                        }}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '8px',
                                                            border: '1.5px solid #c7d2fe',
                                                            background: '#f5f3ff',
                                                            color: '#4f46e5',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.borderColor = '#4f46e5'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                                                    >
                                                        Report Completion
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout role={user?.role || 'Staff'} fullWidth={true}>
            <div style={{ padding: '4px' }}>
                {/* Header */}
                <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CheckSquare size={20} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>My Assigned Tasks</h1>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage, track, and update status of tasks assigned to you by the institute.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #ca8a04, #eab308)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)'
                        }}
                    >
                        <Plus size={15} /> Add Extra Task
                    </button>
                </div>

                {/* Tab Switcher Header */}
                <div style={{ display: 'flex', gap: '12px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px', marginTop: '20px' }}>
                    <button
                        onClick={() => setActiveTab('today')}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab === 'today' ? '#ef4444' : '#f1f5f9',
                            color: activeTab === 'today' ? '#fff' : '#475569',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'today' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
                        }}
                    >
                        📅 Today's Tasks ({todayTasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('assigned')}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab === 'assigned' ? '#4f46e5' : '#f1f5f9',
                            color: activeTab === 'assigned' ? '#fff' : '#475569',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'assigned' ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'
                        }}
                    >
                        📋 Assigned Tasks ({assignedTasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('self-created')}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab === 'self-created' ? '#ca8a04' : '#f1f5f9',
                            color: activeTab === 'self-created' ? '#fff' : '#475569',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'self-created' ? '0 4px 12px rgba(202, 138, 4, 0.2)' : 'none'
                        }}
                    >
                        ⚡ Self-Created Tasks ({selfCreatedTasks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('minus-points')}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab === 'minus-points' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f1f5f9',
                            color: activeTab === 'minus-points' ? '#fff' : '#475569',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'minus-points' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none'
                        }}
                    >
                        🏆 My Points (+{user?.staffProfile?.plusPoints || 0} / -{user?.staffProfile?.minusPoints || 0})
                    </button>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'today' && (
                        <div>
                            {todayTasks.length === 0 ? (
                                <div style={{ padding: '48px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                    📅 No tasks due or created today.
                                </div>
                            ) : renderTasksTable(todayTasks)}
                        </div>
                    )}

                    {activeTab === 'assigned' && (
                        <div>
                            {/* Filter Toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                {/* Date Filter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Date:</span>
                                    <select
                                        value={assignedDateFilter}
                                        onChange={e => setAssignedDateFilter(e.target.value)}
                                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#334155', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="month">This Month</option>
                                        <option value="particular">Particular Date</option>
                                        <option value="range">Date Range</option>
                                        <option value="year">Complete Year</option>
                                    </select>
                                </div>

                                {assignedDateFilter === 'particular' && (
                                    <input type="date" value={assignedParticularDate} onChange={e => setAssignedParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                )}
                                {assignedDateFilter === 'range' && (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input type="date" value={assignedStartDate} onChange={e => setAssignedStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>to</span>
                                        <input type="date" value={assignedEndDate} onChange={e => setAssignedEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                    </div>
                                )}

                                {/* Verification Filter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Verification:</span>
                                    <select
                                        value={assignedVerificationFilter}
                                        onChange={e => setAssignedVerificationFilter(e.target.value)}
                                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#334155', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="">All Verifications</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="needs_revision">Needs Revision</option>
                                        <option value="under_verification">Under Verification</option>
                                        <option value="evidence_insufficient">Evidence Insufficient</option>
                                        <option value="on_hold">On Hold</option>
                                        <option value="escalated">Escalated</option>
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Status:</span>
                                    <select
                                        value={assignedStatusFilter}
                                        onChange={e => setAssignedStatusFilter(e.target.value)}
                                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#334155', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="inprogress">In Progress</option>
                                        <option value="done">Completed</option>
                                    </select>
                                </div>
                            </div>
                            {filteredAssignedTasks.length === 0 ? (
                                <div style={{ padding: '48px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                    📋 No assigned tasks match this filter.
                                </div>
                            ) : renderTasksTable(filteredAssignedTasks)}
                        </div>
                    )}

                    {activeTab === 'self-created' && (
                        <div>
                            {/* Filter Toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#fffbeb', padding: '12px 16px', borderRadius: '14px', border: '1px solid #fde68a', marginBottom: '20px' }}>
                                {/* Date Filter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>Date:</span>
                                    <select
                                        value={selfDateFilter}
                                        onChange={e => setSelfDateFilter(e.target.value)}
                                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#92400e', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="month">This Month</option>
                                        <option value="particular">Particular Date</option>
                                        <option value="range">Date Range</option>
                                        <option value="year">All</option>
                                    </select>
                                </div>

                                {selfDateFilter === 'particular' && (
                                    <input type="date" value={selfParticularDate} onChange={e => setSelfParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                )}
                                {selfDateFilter === 'range' && (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input type="date" value={selfStartDate} onChange={e => setSelfStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                        <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700 }}>to</span>
                                        <input type="date" value={selfEndDate} onChange={e => setSelfEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                    </div>
                                )}

                                {/* Verification Filter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>Verification:</span>
                                    <select
                                        value={selfVerificationFilter}
                                        onChange={e => setSelfVerificationFilter(e.target.value)}
                                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#92400e', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="">All Verifications</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="needs_revision">Needs Revision</option>
                                        <option value="under_verification">Under Verification</option>
                                        <option value="evidence_insufficient">Evidence Insufficient</option>
                                        <option value="on_hold">On Hold</option>
                                        <option value="escalated">Escalated</option>
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>Status:</span>
                                    <select
                                        value={selfStatusFilter}
                                        onChange={e => setSelfStatusFilter(e.target.value)}
                                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#92400e', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="inprogress">In Progress</option>
                                        <option value="done">Completed</option>
                                    </select>
                                </div>
                            </div>
                            {filteredSelfCreatedTasks.length === 0 ? (
                                <div style={{ padding: '48px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                    ⚡ No self-created tasks match this filter.
                                </div>
                            ) : renderTasksTable(filteredSelfCreatedTasks, true)}
                        </div>
                    )}

                    {activeTab === 'minus-points' && (
                        <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* Summary header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>My Point History</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Track valuation rewarded or deducted by the institute for performance review.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                {/* Left Side: Plus Points */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <Award size={18} style={{ color: '#16a34a' }} />
                                        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Plus Valuation Log
                                            <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '12px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800 }}>
                                                {myPointsLogs.filter(log => log.type === 'plus').length}
                                            </span>
                                        </h4>
                                    </div>
                                    {myPointsLogs.filter(log => log.type === 'plus').length === 0 ? (
                                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 650 }}>
                                            No plus valuation logs recorded yet.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Task / Reason</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Valuation</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {myPointsLogs.filter(log => log.type === 'plus').map((log, idx) => (
                                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                            <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                📅 {new Date(log.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: '12px 14px' }}>
                                                                {log.taskTitle && (
                                                                    <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 800, marginBottom: '2px' }}>📋 Task: {log.taskTitle}</div>
                                                                )}
                                                                <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 650 }}>{log.reason}</div>
                                                            </td>
                                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                <span style={{
                                                                    background: '#dcfce7',
                                                                    color: '#15803d',
                                                                    borderRadius: '8px',
                                                                    padding: '4px 10px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 800
                                                                }}>
                                                                    +{log.points}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewingValuation(log)}
                                                                    title="View Details"
                                                                    style={{
                                                                        border: 'none',
                                                                        background: '#e0e7ff',
                                                                        borderRadius: '8px',
                                                                        padding: '6px',
                                                                        color: '#4338ca',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#c7d2fe'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = '#e0e7ff'; }}
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Minus Points */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Minus Valuation Log
                                            <span style={{ background: '#fee2e2', color: '#ef4444', borderRadius: '12px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800 }}>
                                                {myPointsLogs.filter(log => log.type === 'minus').length}
                                            </span>
                                        </h4>
                                    </div>
                                    {myPointsLogs.filter(log => log.type === 'minus').length === 0 ? (
                                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 650 }}>
                                            No minus valuation logs recorded yet.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Task / Reason</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Valuation</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {myPointsLogs.filter(log => log.type === 'minus').map((log, idx) => (
                                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                            <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                📅 {new Date(log.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: '12px 14px' }}>
                                                                {log.taskTitle && (
                                                                    <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 800, marginBottom: '2px' }}>📋 Task: {log.taskTitle}</div>
                                                                )}
                                                                <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 650 }}>{log.reason}</div>
                                                            </td>
                                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                                <span style={{
                                                                    background: '#fee2e2',
                                                                    color: '#ef4444',
                                                                    borderRadius: '8px',
                                                                    padding: '4px 10px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 800
                                                                }}>
                                                                    -{log.points}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewingValuation(log)}
                                                                    title="View Details"
                                                                    style={{
                                                                        border: 'none',
                                                                        background: '#e0e7ff',
                                                                        borderRadius: '8px',
                                                                        padding: '6px',
                                                                        color: '#4338ca',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#c7d2fe'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = '#e0e7ff'; }}
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Self Task Modal */}
            {showAddModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '750px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: '0 auto', position: 'relative', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>Add Completed Tasks</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                                    You can add multiple rows to record the tasks you have completed. They will automatically be marked as Completed.
                                </p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                                <X size={18} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Multiple Tasks Table Editor */}
                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '50px' }}>#</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '220px' }}>Task Title *</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '220px' }}>Description / Details</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '160px' }}>Time Taken *</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '60px', textAlign: 'center' }}>Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taskModalRows.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < taskModalRows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>{idx + 1}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.title}
                                                        onChange={e => handleRowChange(idx, 'title', e.target.value)}
                                                        placeholder="e.g. Prepare report"
                                                        required={idx === 0}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.description}
                                                        onClick={() => {
                                                            setDescPopupIndex(idx);
                                                            setDescPopupText(row.description || '');
                                                        }}
                                                        readOnly
                                                        placeholder="Click to edit details..."
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer', background: '#f8fafc' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.timeTaken}
                                                        onChange={e => handleRowChange(idx, 'timeTaken', e.target.value)}
                                                        placeholder="e.g. 2 hrs / 3 days"
                                                        required={idx === 0 || row.title?.trim()}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        disabled={taskModalRows.length <= 1}
                                                        onClick={() => removeTaskRow(idx)}
                                                        style={{ border: 'none', background: 'none', cursor: taskModalRows.length <= 1 ? 'not-allowed' : 'pointer', color: '#ef4444', opacity: taskModalRows.length <= 1 ? 0.3 : 1, transition: 'all 0.2s' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add row option */}
                            <button
                                type="button"
                                onClick={addTaskRow}
                                style={{
                                    alignSelf: 'flex-start',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#fff',
                                    color: '#ca8a04',
                                    border: '1.5px dashed #fde68a',
                                    borderRadius: '12px',
                                    padding: '8px 16px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ca8a04'; e.currentTarget.style.background = '#fef9c3'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#fde68a'; e.currentTarget.style.background = '#fff'; }}
                            >
                                <Plus size={14} /> Add Task Row
                            </button>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{ padding: '10px 24px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '10px 28px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #ca8a04, #eab308)',
                                        color: '#fff',
                                        border: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
                                        transition: 'opacity 0.2s'
                                    }}
                                >
                                    Save Tasks
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Description Sub-Modal for Staff Task Creation */}
            {descPopupIndex !== null && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.15s ease-out' }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Edit Detailed Description (Row #{descPopupIndex + 1})</h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Write a detailed description for this task below.</p>
                        <textarea
                            value={descPopupText}
                            onChange={e => setDescPopupText(e.target.value)}
                            placeholder="Type full description here..."
                            rows={8}
                            style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setDescPopupIndex(null)}
                                style={{ padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleRowChange(descPopupIndex, 'description', descPopupText);
                                    setDescPopupIndex(null);
                                }}
                                style={{ padding: '8px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #ca8a04, #eab308)', color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(234, 179, 8, 0.2)' }}
                            >
                                Save Description
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}



            {/* View Evidence Modal */}
            {viewEvidenceModalOpen && viewingEvidenceTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Task Evidence Report</h3>
                            <button onClick={() => {
                                setViewEvidenceModalOpen(false);
                                setViewingEvidenceTask(null);
                            }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Task Name:</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>{viewingEvidenceTask.title}</div>
                            </div>

                            {viewingEvidenceTask.submittedAt && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Submitted Date:</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginTop: '2px' }}>
                                        📅 {new Date(viewingEvidenceTask.submittedAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 655 }}>Completion Remarks:</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginTop: '4px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', whiteSpace: 'pre-wrap' }}>
                                    {viewingEvidenceTask.evidenceNote || 'No remark provided.'}
                                </div>
                            </div>

                            {viewingEvidenceTask.evidenceFile ? (
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, marginBottom: '6px' }}>Evidence proof attachment:</div>
                                    {viewingEvidenceTask.evidenceFile.startsWith('data:image/') ? (
                                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#f8fafc', display: 'flex', justifyContent: 'center', padding: '8px' }}>
                                            <img src={viewingEvidenceTask.evidenceFile} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain' }} />
                                        </div>
                                    ) : (
                                        <a href={viewingEvidenceTask.evidenceFile} download={viewingEvidenceTask.evidenceFileName || 'evidence.pdf'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 800, color: '#6366f1', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}>
                                            📎 Download {viewingEvidenceTask.evidenceFileName || 'proof_file'}
                                        </a>
                                    )}
                                </div>
                            ) : null}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <button
                                    onClick={() => {
                                        setViewEvidenceModalOpen(false);
                                        setViewingEvidenceTask(null);
                                    }}
                                    style={{ padding: '10px 28px', borderRadius: '12px', background: '#1e293b', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Completion Date/Time Picker Modal */}
            {completionPickerOpen && (() => {
                const curTask = allTasks.find(t => t.id === completionTaskId);
                return createPortal(
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={22} color="#fff" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>Mark Task as Completed</h3>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Confirm exact completion date, time, and submit report</p>
                                </div>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleConfirmCompletion(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Task Title:</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>{curTask?.title}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {/* Completion Date */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
                                            📅 Completion Date
                                        </label>
                                        <input
                                            type="date"
                                            value={completionDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={e => setCompletionDate(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                    {/* Completion Time */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
                                            ⏰ Completion Time
                                        </label>
                                        <input
                                            type="time"
                                            value={completionTime}
                                            onChange={e => setCompletionTime(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Completion Remarks / Notes *</label>
                                    <textarea
                                        value={evidenceText}
                                        onChange={e => setEvidenceText(e.target.value)}
                                        placeholder="Type completion remarks or details here..."
                                        required
                                        rows={3}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Time Taken (e.g. 2 hours, 45 mins) *</label>
                                    <input
                                        type="text"
                                        value={completionTimeTaken}
                                        onChange={e => setCompletionTimeTaken(e.target.value)}
                                        placeholder="e.g. 3 hours / 2.5 days"
                                        required
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Attachment / Proof (Optional)</label>
                                    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '14px', textAlign: 'center', position: 'relative', background: '#f8fafc', cursor: 'pointer' }}>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                                        />
                                        <Upload size={20} style={{ color: '#6366f1', margin: '0 auto 6px' }} />
                                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {evidenceFileName ? evidenceFileName : 'Click to upload proof'}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>Supports images, pdfs, docs</div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCompletionPickerOpen(false);
                                            setCompletionTaskId(null);
                                            setEvidenceText('');
                                            setEvidenceFileBase64('');
                                            setEvidenceFileName('');
                                        }}
                                        style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ flex: 2, padding: '11px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                                    >
                                        Confirm & Complete
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                );
            })()}

            {/* Task Detail Preview Modal */}
            {viewingTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Task Details</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Detailed status and assignment details of the task.</p>
                            </div>
                            <button onClick={() => setViewingTask(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Task Name:</span>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{viewingTask.title}</div>
                            </div>

                            {viewingTask.description && (
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Description:</span>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginTop: '4px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', whiteSpace: 'pre-wrap' }}>
                                        {viewingTask.description}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Assigned Date:</span>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                                        📅 {new Date((viewingTask.assignedDate || viewingTask.createdAt) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                                {!viewingTask.isSelfCreated && (
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Due Date:</span>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                                            📅 {viewingTask.due ? new Date(viewingTask.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Priority:</span>
                                    <div style={{ marginTop: '4px' }}>
                                        <span style={{
                                            background: `${priorityColors[viewingTask.priority] || '#64748b'}15`,
                                            color: priorityColors[viewingTask.priority] || '#64748b',
                                            border: `1.5px solid ${priorityColors[viewingTask.priority] || '#64748b'}30`,
                                            fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase'
                                        }}>
                                            {viewingTask.priority || 'Medium'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Type:</span>
                                    <div style={{ marginTop: '4px' }}>
                                        <span style={{
                                            background: viewingTask.isSelfCreated ? '#fef9c3' : '#e0e7ff',
                                            color: viewingTask.isSelfCreated ? '#ca8a04' : '#4338ca',
                                            border: `1.5px solid ${viewingTask.isSelfCreated ? '#fde68a' : '#c7d2fe'}`,
                                            fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase'
                                        }}>
                                            {viewingTask.isSelfCreated ? 'Self-Created' : 'Assigned'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Valuation:</span>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                                    {viewingTask.valuation ? `₹${Number(viewingTask.valuation).toLocaleString('en-IN')}` : '—'}
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Time Taken:</span>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                                    {viewingTask.timeTaken ? viewingTask.timeTaken : '—'}
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Remark:</span>
                                <div style={{ marginTop: '4px' }}>
                                    {viewingTask.remark ? (
                                        <span style={{ display: 'inline-flex', gap: '4px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', color: '#b45309', fontWeight: 850 }}>
                                            📝 {viewingTask.remark}
                                        </span>
                                    ) : <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>}
                                </div>
                            </div>

                            {!viewingTask.isSelfCreated && (
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Verification Status:</span>
                                    <div style={{ marginTop: '6px' }}>
                                        {(() => {
                                            const verif = getVerifInfo(viewingTask.verificationStatus);
                                            const VerifIcon = verif.icon;
                                            return (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: verif.bg, color: verif.color, border: `1.5px solid ${verif.border}`, borderRadius: '20px', padding: '4px 12px', fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                                                    <VerifIcon size={12} />
                                                    {verif.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                <button
                                    onClick={() => setViewingTask(null)}
                                    style={{ padding: '10px 28px', borderRadius: '12px', background: '#1e293b', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Self Created Task Modal */}
            {editingSelfTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Edit Self-Created Task</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Update the title and description of your task.</p>
                            </div>
                            <button onClick={() => setEditingSelfTask(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditSelfTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Task Title *</label>
                                <input
                                    type="text"
                                    value={editSelfTitle}
                                    onChange={e => setEditSelfTitle(e.target.value)}
                                    placeholder="Task Title"
                                    required
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Description / Details</label>
                                <textarea
                                    value={editSelfDescription}
                                    onChange={e => setEditSelfDescription(e.target.value)}
                                    placeholder="Task Description"
                                    rows={4}
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingSelfTask(null)}
                                    style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ flex: 2, padding: '11px', borderRadius: '12px', background: 'linear-gradient(135deg, #ca8a04, #eab308)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)' }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* View Valuation Details Modal */}
            {viewingValuation && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', position: 'relative', animation: 'scaleUp 0.2s ease-out' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '10px',
                                    background: viewingValuation.type === 'plus' ? '#ecfdf5' : '#fef2f2',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {viewingValuation.type === 'plus' ? (
                                        <Award size={18} style={{ color: '#16a34a' }} />
                                    ) : (
                                        <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                    )}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                                    {viewingValuation.type === 'plus' ? 'Plus Valuation Details' : 'Minus Valuation Details'}
                                </h3>
                            </div>
                            <button onClick={() => setViewingValuation(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={15} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Valuation Amount */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: viewingValuation.type === 'plus' ? '#f0fdf4' : '#fff5f5', padding: '16px', borderRadius: '16px', border: viewingValuation.type === 'plus' ? '1px solid #bbf7d0' : '1px solid #fca5a5' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: viewingValuation.type === 'plus' ? '#15803d' : '#991b1b', textTransform: 'uppercase' }}>Amount</span>
                                <span style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    color: viewingValuation.type === 'plus' ? '#16a34a' : '#ef4444'
                                }}>
                                    {viewingValuation.type === 'plus' ? `+${viewingValuation.points}` : `-${viewingValuation.points}`}
                                </span>
                            </div>

                            {/* Date */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Recorded</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                                    📅 {new Date(viewingValuation.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>

                            {/* Linked Task (if any) */}
                            {viewingValuation.taskTitle && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linked Task</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: viewingValuation.type === 'plus' ? '#4f46e5' : '#ef4444', background: viewingValuation.type === 'plus' ? '#f5f3ff' : '#fff5f5', padding: '6px 12px', borderRadius: '8px', border: viewingValuation.type === 'plus' ? '1px solid #ddd6fe' : '1px solid #fee2e2', display: 'inline-block' }}>
                                        📋 {viewingValuation.taskTitle}
                                    </span>
                                </div>
                            )}

                            {/* Reason / Remarks */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason / Remarks</span>
                                <div style={{ fontSize: '0.85rem', fontWeight: 650, color: '#334155', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', lineHeight: 1.5, minHeight: '60px' }}>
                                    {viewingValuation.reason || 'No remarks provided.'}
                                </div>
                            </div>
                        </div>

                        {/* Footer Button */}
                        <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setViewingValuation(null)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default StaffTask;
