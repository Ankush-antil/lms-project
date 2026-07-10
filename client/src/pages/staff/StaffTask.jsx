import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { CheckSquare, Clock, CheckCircle, Circle, AlertCircle, Calendar, Plus, X, Trash2, Eye, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

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

    // Add extra task states
    const [showAddModal, setShowAddModal] = useState(false);
    const [taskModalRows, setTaskModalRows] = useState([
        { title: '', description: '' },
        { title: '', description: '' }
    ]);
    const [descPopupIndex, setDescPopupIndex] = useState(null);
    const [descPopupText, setDescPopupText] = useState('');

    // Evidence submission states
    const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
    const [selectedEvidenceTask, setSelectedEvidenceTask] = useState(null);
    const [evidenceText, setEvidenceText] = useState('');
    const [evidenceFileBase64, setEvidenceFileBase64] = useState('');
    const [evidenceFileName, setEvidenceFileName] = useState('');

    // Evidence viewing states
    const [viewEvidenceModalOpen, setViewEvidenceModalOpen] = useState(false);
    const [viewingEvidenceTask, setViewingEvidenceTask] = useState(null);

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

    const handleSaveEvidence = (e) => {
        e.preventDefault();
        if (!evidenceText.trim() && !evidenceFileBase64) {
            toast.error('Please enter description or upload a file as evidence.');
            return;
        }

        const updated = allTasks.map(t => {
            if (t.id === selectedEvidenceTask.id) {
                return {
                    ...t,
                    status: 'done', // automatically mark as completed
                    evidenceNote: evidenceText,
                    evidenceFile: evidenceFileBase64,
                    evidenceFileName: evidenceFileName,
                    submittedAt: new Date().toISOString().split('T')[0]
                };
            }
            return t;
        });

        updateTasksInStorage(updated);
        toast.success('Evidence submitted successfully! Task marked as Completed.');
        
        // Reset states
        setEvidenceText('');
        setEvidenceFileBase64('');
        setEvidenceFileName('');
        setEvidenceModalOpen(false);
        setSelectedEvidenceTask(null);
    };

    const addTaskRow = () => {
        setTaskModalRows(prev => [...prev, { title: '', description: '' }]);
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
            createdAt: new Date().toISOString().split('T')[0]
        }));

        const updated = [...newTasks, ...allTasks];
        updateTasksInStorage(updated);
        toast.success(`${newTasks.length} task(s) added successfully!`);

        // Reset form & close
        setTaskModalRows([
            { title: '', description: '' },
            { title: '', description: '' }
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
        const updated = allTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        updateTasksInStorage(updated);
        toast.success(`Task status updated to ${newStatus === 'done' ? 'Completed' : newStatus === 'inprogress' ? 'In Progress' : 'Pending'}!`);
    };

    // Filter tasks assigned to currently logged-in staff member
    const myTasks = allTasks.filter(t => t.staffName?.toLowerCase() === user?.name?.toLowerCase());

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

    const filteredAssignedTasks = assignedTasks.filter(t => applyDateFilter(t, assignedDateFilter, assignedStartDate, assignedEndDate, assignedParticularDate));
    const filteredSelfCreatedTasks = selfCreatedTasks.filter(t => applyDateFilter(t, selfDateFilter, selfStartDate, selfEndDate, selfParticularDate));

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
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: isSelfCreatedTable ? '800px' : '1100px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '80px', whiteSpace: 'nowrap' }}>Task No.</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '130px', whiteSpace: 'nowrap' }}>Created Date</th>
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '120px', whiteSpace: 'nowrap' }}>Due Date</th>
                                )}
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: isSelfCreatedTable ? '400px' : '300px', whiteSpace: 'nowrap' }}>Task Title & Description</th>
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '100px', whiteSpace: 'nowrap' }}>Priority</th>
                                )}
                                <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '120px', whiteSpace: 'nowrap' }}>Type</th>
                                {!isSelfCreatedTable && (
                                    <th style={{ padding: '14px 20px', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '145px', whiteSpace: 'nowrap' }}>Show Reminder</th>
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
                                        {/* Created Date */}
                                        <td style={{ padding: '16px 20px', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                            📅 {task.createdAt ? new Date(task.createdAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        {/* Due Date */}
                                        {!isSelfCreatedTable && (
                                            <td style={{ padding: '16px 20px', fontSize: '0.75rem', color: '#475569', fontWeight: 650 }}>
                                                📅 {task.due ? new Date(task.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'}
                                            </td>
                                        )}
                                        {/* Title & Description */}
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{task.title}</div>
                                            {task.description && (
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550, marginTop: '4px', lineHeight: 1.4 }}>{task.description}</div>
                                            )}
                                            {task.remark && (
                                                <div style={{ display: 'inline-flex', gap: '4px', background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: '6px', padding: '2px 8px', fontSize: '0.68rem', color: '#b45309', fontWeight: 650, marginTop: '6px' }}>
                                                    <span>📝 Remark:</span>
                                                    <span>{task.remark}</span>
                                                </div>
                                            )}
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
                                        {/* Action */}
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {task.isSelfCreated || task.status === 'done' ? (
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
                                                {task.isSelfCreated && (
                                                    <button
                                                        onClick={() => handleDeleteSelfTask(task.id)}
                                                        title="Delete task"
                                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
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
                                                            setSelectedEvidenceTask(task);
                                                            setEvidenceModalOpen(true);
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
        <DashboardLayout role="Staff" fullWidth={true}>
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
                            {/* Date Filter Toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Filter By Date:</span>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {[
                                        { key: 'month', label: 'This Month' },
                                        { key: 'particular', label: 'Particular Date' },
                                        { key: 'range', label: 'Date Range' },
                                        { key: 'year', label: 'Complete Year' }
                                    ].map(f => (
                                        <button key={f.key} onClick={() => setAssignedDateFilter(f.key)} style={{ padding: '5px 14px', borderRadius: '20px', border: assignedDateFilter === f.key ? 'none' : '1.5px solid #e2e8f0', background: assignedDateFilter === f.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff', color: assignedDateFilter === f.key ? '#fff' : '#475569', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                {assignedDateFilter === 'range' && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '4px' }}>
                                        <input type="date" value={assignedStartDate} onChange={e => setAssignedStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>to</span>
                                        <input type="date" value={assignedEndDate} onChange={e => setAssignedEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                    </div>
                                )}
                                {assignedDateFilter === 'particular' && (
                                    <input type="date" value={assignedParticularDate} onChange={e => setAssignedParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none', marginLeft: '4px' }} />
                                )}
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
                            {/* Date Filter Toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Filter By Date:</span>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {[
                                        { key: 'month', label: 'This Month' },
                                        { key: 'particular', label: 'Particular Date' },
                                        { key: 'range', label: 'Date Range' },
                                        { key: 'year', label: 'Complete Year' }
                                    ].map(f => (
                                        <button key={f.key} onClick={() => setSelfDateFilter(f.key)} style={{ padding: '5px 14px', borderRadius: '20px', border: selfDateFilter === f.key ? 'none' : '1.5px solid #e2e8f0', background: selfDateFilter === f.key ? 'linear-gradient(135deg, #ca8a04, #eab308)' : '#fff', color: selfDateFilter === f.key ? '#fff' : '#475569', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                {selfDateFilter === 'range' && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '4px' }}>
                                        <input type="date" value={selfStartDate} onChange={e => setSelfStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>to</span>
                                        <input type="date" value={selfEndDate} onChange={e => setSelfEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                    </div>
                                )}
                                {selfDateFilter === 'particular' && (
                                    <input type="date" value={selfParticularDate} onChange={e => setSelfParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none', marginLeft: '4px' }} />
                                )}
                            </div>
                            {filteredSelfCreatedTasks.length === 0 ? (
                                <div style={{ padding: '48px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                    ⚡ No self-created tasks match this filter.
                                </div>
                            ) : renderTasksTable(filteredSelfCreatedTasks, true)}
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
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '250px' }}>Task Title *</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '300px' }}>Description / Details</th>
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

            {/* Evidence Submission Modal */}
            {evidenceModalOpen && selectedEvidenceTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Report Task with Evidence</h3>
                            <button onClick={() => {
                                setEvidenceModalOpen(false);
                                setSelectedEvidenceTask(null);
                                setEvidenceText('');
                                setEvidenceFileBase64('');
                                setEvidenceFileName('');
                            }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Task Name:</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>{selectedEvidenceTask.title}</div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Completion Notes / Remarks *</label>
                                <textarea
                                    value={evidenceText}
                                    onChange={e => setEvidenceText(e.target.value)}
                                    placeholder="Describe your work done..."
                                    required
                                    rows={4}
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Attachment / Proof (Image, PDF, etc.)</label>
                                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', position: 'relative', background: '#f8fafc', cursor: 'pointer' }}>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                                    />
                                    <Upload size={24} style={{ color: '#6366f1', margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                                        {evidenceFileName ? evidenceFileName : 'Click to upload proof'}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>Supports images, pdfs, docs</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEvidenceModalOpen(false);
                                        setSelectedEvidenceTask(null);
                                        setEvidenceText('');
                                        setEvidenceFileBase64('');
                                        setEvidenceFileName('');
                                    }}
                                    style={{ padding: '10px 24px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}
                                >
                                    Submit & Complete
                                </button>
                            </div>
                        </form>
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
        </DashboardLayout>
    );
};

export default StaffTask;
