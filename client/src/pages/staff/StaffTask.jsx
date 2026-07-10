import DashboardLayout from '../../components/layout/DashboardLayout';
import { CheckSquare, Clock, CheckCircle, Circle, AlertCircle } from 'lucide-react';

const DUMMY_TASKS = [
    { id: 1, title: 'Prepare Monthly Fee Report', desc: 'Compile fee collection data for July 2026', priority: 'High', due: 'Jul 12, 2026', status: 'pending' },
    { id: 2, title: 'Student Attendance Audit', desc: 'Cross-check QR attendance with manual registers', priority: 'Medium', due: 'Jul 15, 2026', status: 'inprogress' },
    { id: 3, title: 'Update Notice Board', desc: 'Post July exam schedule on the notice board', priority: 'Low', due: 'Jul 11, 2026', status: 'pending' },
    { id: 4, title: 'Fee Reconciliation', desc: 'Match June fee receipts with bank statements', priority: 'High', due: 'Jul 8, 2026', status: 'done' },
    { id: 5, title: 'Library Inventory Check', desc: 'Count and update the library book inventory list', priority: 'Low', due: 'Jul 10, 2026', status: 'done' },
    { id: 6, title: 'Staff Meeting Notes', desc: 'Prepare and distribute minutes from July 7 meeting', priority: 'Medium', due: 'Jul 13, 2026', status: 'inprogress' },
];

const priorityColors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

const columns = [
    { key: 'pending', label: 'Pending', icon: <Circle size={14} />, color: '#ef4444', bg: '#fef2f2' },
    { key: 'inprogress', label: 'In Progress', icon: <Clock size={14} />, color: '#f59e0b', bg: '#fffbeb' },
    { key: 'done', label: 'Done', icon: <CheckCircle size={14} />, color: '#10b981', bg: '#f0fdf4' },
];

const StaffTask = () => {
    return (
        <DashboardLayout role="Staff" fullWidth={true}>
            <div>
                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CheckSquare size={20} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>My Tasks</h1>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Track and manage your assigned tasks</p>
                        </div>
                    </div>
                </div>

                {/* Kanban Board */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    {columns.map(col => {
                        const tasks = DUMMY_TASKS.filter(t => t.status === col.key);
                        return (
                            <div key={col.key}>
                                {/* Column Header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: col.bg, borderRadius: '12px', padding: '10px 14px',
                                    marginBottom: '12px'
                                }}>
                                    <span style={{ color: col.color }}>{col.icon}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {col.label}
                                    </span>
                                    <span style={{
                                        marginLeft: 'auto', background: col.color, color: '#fff',
                                        borderRadius: '999px', fontSize: '0.7rem', fontWeight: 900,
                                        padding: '2px 8px'
                                    }}>{tasks.length}</span>
                                </div>

                                {/* Cards */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {tasks.map(task => (
                                        <div key={task.id} style={{
                                            background: '#fff', borderRadius: '14px', padding: '16px',
                                            border: '1px solid #f1f5f9',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            cursor: 'default'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', flex: 1, lineHeight: 1.3 }}>
                                                    {task.title}
                                                </p>
                                                <span style={{
                                                    flexShrink: 0, marginLeft: '8px',
                                                    background: `${priorityColors[task.priority]}18`,
                                                    color: priorityColors[task.priority],
                                                    fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px',
                                                    borderRadius: '999px', textTransform: 'uppercase'
                                                }}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>
                                                {task.desc}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={11} style={{ color: '#94a3b8' }} />
                                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>Due: {task.due}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {tasks.length === 0 && (
                                        <div style={{
                                            background: '#f8fafc', borderRadius: '14px', padding: '24px',
                                            textAlign: 'center', border: '2px dashed #e2e8f0'
                                        }}>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>No tasks here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StaffTask;
