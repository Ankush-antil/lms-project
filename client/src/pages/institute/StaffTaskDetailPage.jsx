import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    ArrowLeft, CheckSquare, Eye, Pencil, Trash2, X, Send, Bell, Calendar,
    Shield, ShieldCheck, ShieldX, ShieldAlert, Clock, AlertTriangle, PauseCircle, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────────
const formatTime12h = (t24) => {
    if (!t24) return '';
    const [h, m] = t24.split(':');
    const hrs = parseInt(h, 10);
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const hrs12 = hrs % 12 || 12;
    return `${String(hrs12).padStart(2, '0')}:${m} ${ampm}`;
};

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

const getVerificationInfo = (val) => VERIFICATION_OPTIONS.find(o => o.value === val) || VERIFICATION_OPTIONS[0];

const openGoogleCalendar = (title, dateStr, timeStr) => {
    if (!dateStr) { toast.error('No date set to add to calendar.'); return; }
    const d = new Date(dateStr + 'T' + (timeStr || '09:00') + ':00');
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    const start = fmt(d);
    const end = fmt(new Date(d.getTime() + 60 * 60 * 1000));
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent('Task Reminder: ' + title)}`;
    window.open(url, '_blank');
};

// ─── Send Reminder Popup ────────────────────────────────────────────────────────
const SendReminderPopup = ({ task, onClose }) => {
    const [selectedPlatform, setSelectedPlatform] = useState('in-app');
    const [sending, setSending] = useState(false);

    const formattedDue = task?.due ? new Date(task.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'soon';
    const formattedTime = task?.reminderTime ? ` at ${formatTime12h(task.reminderTime)}` : '';
    const defaultMsg = `Reminder: Task "${task?.title}" is due on ${formattedDue}${formattedTime}. Please complete it on time.`;

    const [customMessage, setCustomMessage] = useState(defaultMsg);

    const handleSend = () => {
        setSending(true);
        setTimeout(() => {
            setSending(false);
            if (selectedPlatform === 'whatsapp') {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(customMessage)}`, '_blank');
            } else if (selectedPlatform === 'email') {
                window.open(`mailto:?subject=${encodeURIComponent('Task Reminder')}&body=${encodeURIComponent(customMessage)}`, '_blank');
            } else if (selectedPlatform === 'sms') {
                window.open(`sms:?body=${encodeURIComponent(customMessage)}`, '_blank');
            } else if (selectedPlatform === 'facebook') {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://yourplatform.com')}&quote=${encodeURIComponent(customMessage)}`, '_blank');
            } else if (selectedPlatform === 'x') {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(customMessage)}`, '_blank');
            }
            toast.success(`Reminder sent to ${task?.staffName} via ${selectedPlatform === 'in-app' ? 'In-App Notification' : selectedPlatform}!`);
            onClose();
        }, 800);
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bell size={18} color="#fff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Send Reminder</h3>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>to {task?.staffName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} style={{ color: '#64748b' }} />
                    </button>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px 16px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Task</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{task?.title}</div>
                    {task?.due && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', fontWeight: 650 }}>
                            📅 Due: {formattedDue}{formattedTime}
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#374151', marginBottom: '10px' }}>Send Via</label>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '10px 0' }}>
                        {[
                            {
                                id: 'in-app',
                                label: 'In-App',
                                icon: (selected) => (
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected ? '#e0e7ff' : '#f1f5f9', border: selected ? '2.5px solid #6366f1' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        <Bell size={20} color={selected ? '#4f46e5' : '#64748b'} />
                                    </div>
                                )
                            },
                            {
                                id: 'whatsapp',
                                label: 'WhatsApp',
                                icon: (selected) => (
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected ? '#dcfce7' : '#f1f5f9', border: selected ? '2.5px solid #25D366' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill={selected ? '#25D366' : '#64748b'}>
                                            <path d="M12.012 1.985c-5.523 0-10.002 4.48-10.002 10.002 0 1.763.456 3.486 1.325 5.006L2.01 22.015l5.184-1.36c1.474.804 3.128 1.226 4.816 1.226h.005c5.52 0 10.002-4.48 10.002-10.002 0-2.67-1.04-5.18-2.93-7.07-1.89-1.89-4.4-2.93-7.076-2.93m0 1.693c2.215 0 4.298.863 5.865 2.43 1.567 1.567 2.43 3.65 2.43 5.864 0 4.585-3.73 8.315-8.315 8.315h-.005c-1.5 0-2.974-.405-4.26-1.17l-.305-.18-3.167.83.845-3.09-.2-.317a8.27 8.27 0 0 1-1.267-4.39c0-4.582 3.73-8.312 8.314-8.312m-3.518 5.093c-.19 0-.323.015-.472.18-.15.166-.576.564-.576 1.378 0 .814.592 1.6.674 1.71.083.11 1.144 1.83 2.82 2.505.4.16.71.258.956.335.402.128.767.11 1.056.067.32-.047 1.057-.432 1.206-.848.15-.415.15-.772.105-.847-.045-.075-.165-.12-.35-.21-.18-.09-1.056-.52-1.22-.58-.165-.06-.285-.09-.405.09-.12.18-.465.58-.57.7-.105.12-.21.135-.395.045-.18-.09-.778-.27-1.48-.895-.547-.488-.916-1.09-1.023-1.27-.107-.18-.01-.278.08-.368.082-.08.18-.21.27-.315.09-.105.12-.18.18-.3.06-.12.03-.225-.015-.315-.045-.09-.405-.976-.555-1.336-.145-.353-.293-.305-.403-.31-.105-.005-.226-.005-.347-.005"/>
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                id: 'sms',
                                label: 'Messages',
                                icon: (selected) => (
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected ? '#e0f2fe' : '#f1f5f9', border: selected ? '2.5px solid #0284c7' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill={selected ? '#0284c7' : '#64748b'}>
                                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                id: 'email',
                                label: 'Email',
                                icon: (selected) => (
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected ? '#fee2e2' : '#f1f5f9', border: selected ? '2.5px solid #EA4335' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill={selected ? '#EA4335' : '#64748b'}>
                                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                id: 'facebook',
                                label: 'Facebook',
                                icon: (selected) => (
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected ? '#e0f2fe' : '#f1f5f9', border: selected ? '2.5px solid #1877F2' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        <svg viewBox="0 0 24 24" width="22" height="22" fill={selected ? '#1877F2' : '#64748b'}>
                                            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                id: 'x',
                                label: 'X (Twitter)',
                                icon: (selected) => (
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected ? '#f1f5f9' : '#f1f5f9', border: selected ? '2.5px solid #000' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill={selected ? '#000000' : '#64748b'}>
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                    </div>
                                )
                            }
                        ].map(p => {
                            const selected = selectedPlatform === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedPlatform(p.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px',
                                        outline: 'none',
                                        width: '65px'
                                    }}
                                >
                                    {p.icon(selected)}
                                    <span style={{ fontSize: '0.65rem', fontWeight: selected ? 800 : 600, color: selected ? '#1e293b' : '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {p.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Message</label>
                    <textarea
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        rows={4}
                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 900, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                    >
                        <Send size={14} />
                        {sending ? 'Sending...' : 'Send Reminder'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── Task Detail Popup ──────────────────────────────────────────────────────────
const TaskDetailPopup = ({ task, onClose }) => {
    if (!task) return null;
    const verif = getVerificationInfo(task.verificationStatus);
    const VerifIcon = verif.icon;

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{
                        background: task.priority === 'Urgent' ? '#fee2e2' : task.priority === 'High' ? '#ffedd5' : task.priority === 'Medium' ? '#fef9c3' : '#dcfce7',
                        color: task.priority === 'Urgent' ? '#dc2626' : task.priority === 'High' ? '#ea580c' : task.priority === 'Medium' ? '#d97706' : '#16a34a',
                        border: `1.5px solid ${task.priority === 'Urgent' ? '#fca5a5' : task.priority === 'High' ? '#fdba74' : task.priority === 'Medium' ? '#fde68a' : '#86efac'}`,
                        borderRadius: '20px', padding: '3px 12px', fontSize: '0.68rem', fontWeight: 900
                    }}>
                        {task.priority} Priority
                    </span>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} style={{ color: '#64748b' }} />
                    </button>
                </div>

                <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{task.title}</h3>

                {task.description && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Task Details</label>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', fontWeight: 550, lineHeight: 1.5, background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1.5px solid #f1f5f9', whiteSpace: 'pre-wrap' }}>
                            {task.description}
                        </p>
                    </div>
                )}

                {task.remark && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Remark</label>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 12px', borderRadius: '8px' }}>
                            📝 {task.remark}
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Date</label>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                            📅 {task.createdAt ? new Date(task.createdAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Due Date</label>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                            📅 {task.due ? new Date(task.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No Due Date'}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Reminder</label>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: task.reminderTime ? '#6366f1' : '#64748b' }}>
                            {task.reminderTime ? `🔔 ${formatTime12h(task.reminderTime)}` : '🔕 Not Set'}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Verification</label>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: verif.bg, color: verif.color, border: `1.5px solid ${verif.border}`, borderRadius: '20px', padding: '2px 8px', fontSize: '0.65rem', fontWeight: 900 }}>
                            <VerifIcon size={10} />
                            {verif.label}
                        </span>
                    </div>
                </div>

                {task.completedAt && (
                    <div style={{ marginBottom: '16px', background: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>Completion Info</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d' }}>
                            ✅ {new Date(task.completedAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {task.completedTime && ` at ${formatTime12h(task.completedTime)}`}
                        </div>
                    </div>
                )}

                {task.evidenceNote && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Evidence Remarks</label>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', background: '#f0fdf4', border: '1.5px solid #a7f3d0', padding: '8px 12px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                            ✅ {task.evidenceNote}
                        </div>
                    </div>
                )}

                <button onClick={onClose} style={{ width: '100%', padding: '11px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}>
                    Close
                </button>
            </div>
        </div>,
        document.body
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────────
const StaffTaskDetailPage = () => {
    const { staffName } = useParams();
    const navigate = useNavigate();
    const decodedStaffName = decodeURIComponent(staffName || '');

    const [tasks, setTasks] = useState([]);
    const [previewDateFilter, setPreviewDateFilter] = useState('year');
    const [previewStartDate, setPreviewStartDate] = useState('');
    const [previewEndDate, setPreviewEndDate] = useState('');
    const [previewParticularDate, setPreviewParticularDate] = useState('');
    const [selfPreviewDateFilter, setSelfPreviewDateFilter] = useState('year');
    const [selfPreviewStartDate, setSelfPreviewStartDate] = useState('');
    const [selfPreviewEndDate, setSelfPreviewEndDate] = useState('');
    const [selfPreviewParticularDate, setSelfPreviewParticularDate] = useState('');

    // Verification and Status filters
    const [verificationFilter, setVerificationFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [selfPreviewVerificationFilter, setSelfPreviewVerificationFilter] = useState('');
    const [selfPreviewStatusFilter, setSelfPreviewStatusFilter] = useState('');

    // Popups
    const [reminderTask, setReminderTask] = useState(null);
    const [viewingTask, setViewingTask] = useState(null);
    const [viewingEvidenceTask, setViewingEvidenceTask] = useState(null);
    const [viewEvidenceOpen, setViewEvidenceOpen] = useState(false);
    const [remarkEditTask, setRemarkEditTask] = useState(null);
    const [remarkEditText, setRemarkEditText] = useState('');

    // Edit task form states
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPriority, setFormPriority] = useState('Medium');
    const [formAssignedDate, setFormAssignedDate] = useState('');
    const [formDue, setFormDue] = useState('');
    const [formReminderTime, setFormReminderTime] = useState('');
    const [formRemark, setFormRemark] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('staff_tasks');
        if (stored) {
            try { setTasks(JSON.parse(stored)); } catch { }
        }
    }, []);

    const saveTasks = (updated) => {
        setTasks(updated);
        localStorage.setItem('staff_tasks', JSON.stringify(updated));
    };

    const handleVerificationChange = (taskId, val) => {
        const updated = tasks.map(t => {
            if (t.id === taskId) {
                const isRejected = val === 'rejected';
                return {
                    ...t,
                    verificationStatus: val,
                    status: isRejected ? 'pending' : t.status,
                    completedAt: isRejected ? null : t.completedAt,
                    completedTime: isRejected ? null : t.completedTime,
                    evidenceFile: isRejected ? null : t.evidenceFile,
                    evidenceFileName: isRejected ? null : t.evidenceFileName,
                    evidenceNote: isRejected ? null : t.evidenceNote,
                    submittedAt: isRejected ? null : t.submittedAt
                };
            }
            return t;
        });
        saveTasks(updated);
        toast.success(val === 'rejected' ? 'Task rejected and reverted to Pending!' : 'Verification status updated!');
    };

    const handleDeleteTask = (taskId) => {
        if (window.confirm('Delete this task?')) {
            saveTasks(tasks.filter(t => t.id !== taskId));
            toast.success('Task removed');
        }
    };

    const handleOpenEdit = (task) => {
        setEditingTask(task);
        setFormTitle(task.title || '');
        setFormDescription(task.description || '');
        setFormPriority(task.priority || 'Medium');
        setFormAssignedDate(task.assignedDate || task.createdAt || new Date().toISOString().split('T')[0]);
        setFormDue(task.due || '');
        setFormReminderTime(task.reminderTime || '');
        setFormRemark(task.remark || '');
        setShowTaskModal(true);
    };

    const handleSaveTask = (e) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            toast.error('Task title is required');
            return;
        }
        const updated = tasks.map(t => {
            if (t.id === editingTask.id) {
                return {
                    ...t,
                    title: formTitle,
                    description: formDescription,
                    priority: formPriority,
                    assignedDate: formAssignedDate,
                    due: formDue,
                    reminderTime: formReminderTime,
                    remark: formRemark
                };
            }
            return t;
        });
        saveTasks(updated);
        toast.success('Task updated successfully!');
        setShowTaskModal(false);
        setEditingTask(null);
    };

    const filterPreviewTask = (t) => {
        const taskDate = t.createdAt || t.due || new Date().toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        if (previewDateFilter === 'today') return taskDate === todayStr;
        if (previewDateFilter === 'month') return taskDate.startsWith(todayStr.substring(0, 7));
        if (previewDateFilter === 'range') { if (!previewStartDate || !previewEndDate) return true; return taskDate >= previewStartDate && taskDate <= previewEndDate; }
        if (previewDateFilter === 'particular') { if (!previewParticularDate) return true; return taskDate === previewParticularDate; }
        return true;
    };

    const filterSelfTask = (t) => {
        const taskDate = t.createdAt || t.due || new Date().toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        if (selfPreviewDateFilter === 'month') return taskDate.startsWith(todayStr.substring(0, 7));
        if (selfPreviewDateFilter === 'range') { if (!selfPreviewStartDate || !selfPreviewEndDate) return true; return taskDate >= selfPreviewStartDate && taskDate <= selfPreviewEndDate; }
        if (selfPreviewDateFilter === 'particular') { if (!selfPreviewParticularDate) return true; return taskDate === selfPreviewParticularDate; }
        return true;
    };

    const assignedList = tasks.filter(t =>
        t.staffName?.toLowerCase() === decodedStaffName.toLowerCase() &&
        !t.isSelfCreated &&
        filterPreviewTask(t) &&
        (verificationFilter === '' || (t.verificationStatus || '') === verificationFilter) &&
        (statusFilter === '' || (t.status || 'pending') === statusFilter)
    );

    const selfList = tasks.filter(t =>
        t.staffName?.toLowerCase() === decodedStaffName.toLowerCase() &&
        t.isSelfCreated &&
        filterSelfTask(t) &&
        (selfPreviewVerificationFilter === '' || (t.verificationStatus || '') === selfPreviewVerificationFilter) &&
        (selfPreviewStatusFilter === '' || (t.status || 'pending') === selfPreviewStatusFilter)
    );

    const statusBadge = (status) => {
        const map = {
            done: { bg: '#dcfce7', color: '#16a34a', label: 'Completed' },
            inprogress: { bg: '#fffbeb', color: '#d97706', label: 'In Progress' },
            pending: { bg: '#f1f5f9', color: '#64748b', label: 'Pending' }
        };
        const s = map[status] || map.pending;
        return <span style={{ background: s.bg, color: s.color, fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>{s.label}</span>;
    };

    return (
        <DashboardLayout role="Institute" fullWidth={true}>
            <div>
                {/* Back Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <button
                        onClick={() => navigate('/institute/staff')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: 'none', borderRadius: '12px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                    >
                        <ArrowLeft size={15} /> Back to Staff
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', fontWeight: 900 }}>
                            {decodedStaffName[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
                                Tasks for {decodedStaffName}
                            </h1>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                View and manage all assigned and self-created tasks for this staff member.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Assigned Tasks Section */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckSquare size={16} /> Assigned by Institute
                            <span style={{ background: '#e0e7ff', color: '#4338ca', borderRadius: '20px', padding: '1px 8px', fontSize: '0.65rem', fontWeight: 900 }}>{assignedList.length}</span>
                        </h2>
                    </div>

                    {/* Filter Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                        {/* Date Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Date:</span>
                            <select
                                value={previewDateFilter}
                                onChange={e => setPreviewDateFilter(e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#334155', background: '#fff', cursor: 'pointer' }}
                            >
                                <option value="today">Today</option>
                                <option value="month">This Month</option>
                                <option value="particular">Particular Date</option>
                                <option value="range">Date Range</option>
                                <option value="year">Complete Year</option>
                            </select>
                        </div>

                        {previewDateFilter === 'particular' && (
                            <input type="date" value={previewParticularDate} onChange={e => setPreviewParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                        )}
                        {previewDateFilter === 'range' && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input type="date" value={previewStartDate} onChange={e => setPreviewStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>to</span>
                                <input type="date" value={previewEndDate} onChange={e => setPreviewEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                            </div>
                        )}

                        {/* Verification Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Verification:</span>
                            <select
                                value={verificationFilter}
                                onChange={e => setVerificationFilter(e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#334155', background: '#fff', cursor: 'pointer' }}
                            >
                                <option value="">All Verifications</option>
                                {VERIFICATION_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Status:</span>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#334155', background: '#fff', cursor: 'pointer' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="inprogress">In Progress</option>
                                <option value="done">Completed</option>
                            </select>
                        </div>
                    </div>

                    {assignedList.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                            No assigned tasks match this filter.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1300px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                        {['Task Title', 'Remark', 'Priority', 'Created Date', 'Assigned Date', 'Due Date', 'Valuation', 'Time Taken', 'Status', 'Verification', 'Report w/ Evidence', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '10px 14px', fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignedList.map((t, idx) => {
                                        const priorityColor = t.priority === 'Urgent' ? '#ef4444' : t.priority === 'High' ? '#ea580c' : t.priority === 'Medium' ? '#d97706' : '#16a34a';
                                        const verif = getVerificationInfo(t.verificationStatus);
                                        const VerifIcon = verif.icon;
                                        return (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                {/* Task Title */}
                                                <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>{t.title}</div>
                                                    {t.description && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{t.description}</div>}
                                                </td>
                                                {/* Remark */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    {t.remark ? (
                                                        <span
                                                            onClick={() => {
                                                                setRemarkEditTask(t);
                                                                setRemarkEditText(t.remark || '');
                                                            }}
                                                            style={{ display: 'inline-flex', gap: '4px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '8px', padding: '6px 12px', fontSize: '0.72rem', color: '#b45309', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}
                                                            title={t.remark}
                                                        >
                                                            📝 {t.remark}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setRemarkEditTask(t);
                                                                setRemarkEditText('');
                                                            }}
                                                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '0.72rem', fontWeight: 650, color: '#64748b', cursor: 'pointer', outline: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                                                        >
                                                            + Add remark
                                                        </button>
                                                    )}
                                                </td>
                                                {/* Priority */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{ background: `${priorityColor}15`, color: priorityColor, border: `1.5px solid ${priorityColor}30`, fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                                                        {t.priority || 'Medium'}
                                                    </span>
                                                </td>
                                                {/* Created Date */}
                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                                        📅 {t.createdAt ? new Date(t.createdAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                    </span>
                                                </td>
                                                {/* Assigned Date */}
                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                                            📅 {(t.assignedDate || t.createdAt) ? new Date((t.assignedDate || t.createdAt) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                        </span>
                                                        {(t.assignedDate || t.createdAt) && (
                                                            <button
                                                                onClick={() => openGoogleCalendar('Assigned: ' + t.title, (t.assignedDate || t.createdAt), null)}
                                                                title="Add to Google Calendar"
                                                                style={{ width: 22, height: 22, borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4285f4', flexShrink: 0, transition: 'all 0.15s' }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = '#e8f0fe'; e.currentTarget.style.borderColor = '#4285f4'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                            >
                                                                <Calendar size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Due Date */}
                                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                                            📅 {t.due ? new Date(t.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'}
                                                        </span>
                                                        {t.due && (
                                                            <button
                                                                onClick={() => openGoogleCalendar('Due: ' + t.title, t.due, t.reminderTime)}
                                                                title="Add to Google Calendar"
                                                                style={{ width: 22, height: 22, borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4285f4', flexShrink: 0, transition: 'all 0.15s' }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = '#e8f0fe'; e.currentTarget.style.borderColor = '#4285f4'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                            >
                                                                <Calendar size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Valuation */}
                                                <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                    {t.valuation ? `₹${Number(t.valuation).toLocaleString('en-IN')}` : '—'}
                                                </td>
                                                {/* Time Taken */}
                                                <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                    {t.timeTaken ? t.timeTaken : '—'}
                                                </td>

                                                {/* Status */}
                                                <td style={{ padding: '12px 14px' }}>{statusBadge(t.status)}</td>
                                                {/* Verification */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <select
                                                        value={t.verificationStatus || ''}
                                                        onChange={e => handleVerificationChange(t.id, e.target.value)}
                                                        style={{ padding: '5px 8px', borderRadius: '8px', border: `1.5px solid ${verif.border}`, background: verif.bg, color: verif.color, fontSize: '0.65rem', fontWeight: 900, outline: 'none', cursor: 'pointer', width: '140px' }}
                                                    >
                                                        {VERIFICATION_OPTIONS.map(o => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                {/* Evidence */}
                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    {t.evidenceNote || t.evidenceFile ? (
                                                        <button
                                                            onClick={() => { setViewingEvidenceTask(t); setViewEvidenceOpen(true); }}
                                                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                                        >
                                                            View Evidence
                                                        </button>
                                                    ) : <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>—</span>}
                                                </td>
                                                {/* Actions */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                        {/* Send Reminder */}
                                                        <button
                                                            onClick={() => setReminderTask(t)}
                                                            title="Send Reminder"
                                                            style={{ width: 28, height: 28, borderRadius: '7px', border: '1px solid #fde68a', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#d97706', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fef9c3'; e.currentTarget.style.borderColor = '#d97706'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.borderColor = '#fde68a'; }}
                                                        >
                                                            <Bell size={12} />
                                                        </button>
                                                        {/* Edit Button */}
                                                        <button
                                                            onClick={() => handleOpenEdit(t)}
                                                            title="Edit Task"
                                                            style={{ width: 28, height: 28, borderRadius: '7px', border: '1px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4f46e5', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#4f46e5'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        {/* View Details */}
                                                        <button
                                                            onClick={() => setViewingTask(t)}
                                                            title="View Details"
                                                            style={{ width: 28, height: 28, borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                                                        >
                                                            <Eye size={12} />
                                                        </button>
                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => handleDeleteTask(t.id)}
                                                            title="Delete task"
                                                            style={{ width: 28, height: 28, borderRadius: '7px', border: '1px solid #fee2e2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Self Created Tasks Section */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ⚡ Self-Created (Not Assigned)
                            <span style={{ background: '#fef9c3', color: '#92400e', borderRadius: '20px', padding: '1px 8px', fontSize: '0.65rem', fontWeight: 900 }}>{selfList.length}</span>
                        </h2>
                    </div>

                    {/* Self-Created Dropdown Filters Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#fffbeb', padding: '12px 16px', borderRadius: '14px', border: '1px solid #fde68a', marginBottom: '16px' }}>
                        {/* Date Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>Date:</span>
                            <select
                                value={selfPreviewDateFilter}
                                onChange={e => setSelfPreviewDateFilter(e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#92400e', background: '#fff', cursor: 'pointer' }}
                            >
                                <option value="month">This Month</option>
                                <option value="particular">Particular Date</option>
                                <option value="range">Date Range</option>
                                <option value="year">All</option>
                            </select>
                        </div>

                        {selfPreviewDateFilter === 'range' && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input type="date" value={selfPreviewStartDate} onChange={e => setSelfPreviewStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                                <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700 }}>to</span>
                                <input type="date" value={selfPreviewEndDate} onChange={e => setSelfPreviewEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                            </div>
                        )}
                        {selfPreviewDateFilter === 'particular' && (
                            <input type="date" value={selfPreviewParticularDate} onChange={e => setSelfPreviewParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }} />
                        )}

                        {/* Verification Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>Verification:</span>
                            <select
                                value={selfPreviewVerificationFilter}
                                onChange={e => setSelfPreviewVerificationFilter(e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#92400e', background: '#fff', cursor: 'pointer' }}
                            >
                                <option value="">All Verifications</option>
                                {VERIFICATION_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>Status:</span>
                            <select
                                value={selfPreviewStatusFilter}
                                onChange={e => setSelfPreviewStatusFilter(e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 700, outline: 'none', color: '#92400e', background: '#fff', cursor: 'pointer' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="inprogress">In Progress</option>
                                <option value="done">Completed</option>
                            </select>
                        </div>
                    </div>

                    {selfList.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem', fontWeight: 600 }}>
                            No self-created tasks match this filter.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #fde68a' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                                <thead>
                                    <tr style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                                        {['#', 'Task Title', 'Created Date', 'Valuation', 'Time Taken', 'Status', 'Verification', 'Completion'].map(h => (
                                            <th key={h} style={{ padding: '10px 14px', fontSize: '0.65rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selfList.map((t, idx) => {
                                        const verif = getVerificationInfo(t.verificationStatus);
                                        return (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #fef9c3', background: idx % 2 === 0 ? '#fff' : '#fffde7' }}>
                                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 800, color: '#92400e' }}>{idx + 1}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>{t.title}</div>
                                                    {t.description && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{t.description}</div>}
                                                </td>
                                                <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    📅 {t.createdAt ? new Date(t.createdAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                                {/* Valuation */}
                                                <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                    {t.valuation ? `₹${Number(t.valuation).toLocaleString('en-IN')}` : '—'}
                                                </td>
                                                {/* Time Taken */}
                                                <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                    {t.timeTaken ? t.timeTaken : '—'}
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>{statusBadge(t.status)}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <select
                                                        value={t.verificationStatus || ''}
                                                        onChange={e => handleVerificationChange(t.id, e.target.value)}
                                                        style={{ padding: '4px 6px', borderRadius: '8px', border: `1.5px solid ${verif.border}`, background: verif.bg, color: verif.color, fontSize: '0.65rem', fontWeight: 900, outline: 'none', cursor: 'pointer', width: '135px' }}
                                                    >
                                                        {VERIFICATION_OPTIONS.map(o => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                                                    {t.completedAt ? `✅ ${new Date(t.completedAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${t.completedTime ? ` ${formatTime12h(t.completedTime)}` : ''}` : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {reminderTask && <SendReminderPopup task={reminderTask} onClose={() => setReminderTask(null)} />}
            {viewingTask && <TaskDetailPopup task={viewingTask} onClose={() => setViewingTask(null)} />}

            {/* Remark Edit Sub-Modal Popup */}
            {remarkEditTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.15s ease-out' }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                            Edit Remark / Instructions
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                            Write instructions or notes for: "{remarkEditTask.title}"
                        </p>
                        <textarea
                            value={remarkEditText}
                            onChange={e => setRemarkEditText(e.target.value)}
                            placeholder="Type remark here..."
                            rows={4}
                            style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setRemarkEditTask(null)}
                                style={{ padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const updated = tasks.map(tk => tk.id === remarkEditTask.id ? { ...tk, remark: remarkEditText } : tk);
                                    saveTasks(updated);
                                    setRemarkEditTask(null);
                                    toast.success('Remark updated successfully!');
                                }}
                                style={{ padding: '8px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)' }}
                            >
                                Save Remark
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Evidence Modal */}
            {viewEvidenceOpen && viewingEvidenceTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Task Evidence Report</h3>
                            <button onClick={() => { setViewEvidenceOpen(false); setViewingEvidenceTask(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', background: '#f0fdf4', border: '1.5px solid #a7f3d0', padding: '10px 14px', borderRadius: '12px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                                    {viewingEvidenceTask.evidenceNote || 'No remarks provided.'}
                                </div>
                            </div>
                            {viewingEvidenceTask.evidenceFile && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, marginBottom: '6px' }}>Evidence Attachment:</div>
                                    {viewingEvidenceTask.evidenceFile.startsWith('data:image/') ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <img src={viewingEvidenceTask.evidenceFile} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                                        </div>
                                    ) : (
                                        <a href={viewingEvidenceTask.evidenceFile} download={viewingEvidenceTask.evidenceFileName || 'evidence.pdf'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', border: '1.5px solid #c7d2fe', padding: '8px 16px', borderRadius: '12px', fontSize: '0.78rem', color: '#4f46e5', fontWeight: 800, textDecoration: 'none' }}>
                                            📎 Download Proof ({viewingEvidenceTask.evidenceFileName || 'Attachment'})
                                        </a>
                                    )}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <button onClick={() => { setViewEvidenceOpen(false); setViewingEvidenceTask(null); }} style={{ padding: '10px 28px', borderRadius: '12px', background: '#1e293b', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Task Modal */}
            {showTaskModal && editingTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: '0 auto', position: 'relative', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
                                    Edit Assigned Task
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                                    Update details of the task assigned to {decodedStaffName}.
                                </p>
                            </div>
                            <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={18} style={{ color: '#64748b' }} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Task Title *</label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    placeholder="e.g. Complete financial audit"
                                    required
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Description / Details</label>
                                <textarea
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="Write details of the task here..."
                                    rows={4}
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Priority</label>
                                    <select
                                        value={formPriority}
                                        onChange={e => setFormPriority(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="Urgent">Urgent</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Assigned Date</label>
                                    <input
                                        type="date"
                                        value={formAssignedDate}
                                        onChange={e => setFormAssignedDate(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Due Date</label>
                                <input
                                    type="date"
                                    value={formDue}
                                    onChange={e => setFormDue(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Remark / Notes</label>
                                <input
                                    type="text"
                                    value={formRemark}
                                    onChange={e => setFormRemark(e.target.value)}
                                    placeholder="Add any extra instructions..."
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <button type="button" onClick={() => { setShowTaskModal(false); setEditingTask(null); }} style={{ padding: '10px 24px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '10px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }}>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default StaffTaskDetailPage;
