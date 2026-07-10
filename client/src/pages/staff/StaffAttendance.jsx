import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Calendar, CheckCircle, XCircle, Clock, FileText, Plus,
    ChevronLeft, ChevronRight, Upload, X, ShieldAlert, FileIcon
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
    Present: { label: 'P', color: '#10b981', bg: '#dcfce7', border: '#86efac', textClass: 'text-emerald-700' },
    Absent: { label: 'A', color: '#ef4444', bg: '#fee2e2', border: '#fca5a5', textClass: 'text-rose-700' },
    Leave: { label: 'L', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d', textClass: 'text-amber-700' },
    Holiday: { label: 'H', color: '#3b82f6', bg: '#dbeafe', border: '#93c5fd', textClass: 'text-blue-700' },
};

const StaffAttendance = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMonth, setViewMonth] = useState(new Date());
    
    // Leave Application form states
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [leaveDate, setLeaveDate] = useState('');
    const [leaveNote, setLeaveNote] = useState('');
    const [leaveFile, setLeaveFile] = useState(null);
    const [submittingLeave, setSubmittingLeave] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!user?._id) return;
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/attendance/staff/${user._id}/history`);
            setHistory(data.history || []);
        } catch {
            // Keep empty on error
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Calendar Calculations
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = useMemo(() => {
        const c = [];
        for (let i = 0; i < firstDay; i++) c.push(null);
        for (let d = 1; d <= daysInMonth; d++) c.push(d);
        while (c.length % 7 !== 0) c.push(null);
        return c;
    }, [firstDay, daysInMonth]);

    const dateMap = useMemo(() => {
        const map = {};
        history.forEach(r => {
            if (r.date) map[r.date] = r;
        });
        return map;
    }, [history]);

    const stats = useMemo(() => {
        return {
            present: history.filter(r => r.status === 'Present').length,
            absent: history.filter(r => r.status === 'Absent').length,
            leave: history.filter(r => r.status === 'Leave').length,
            holiday: history.filter(r => r.status === 'Holiday').length,
            total: history.length
        };
    }, [history]);

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        if (!leaveDate) {
            toast.error("Please select a date.");
            return;
        }
        if (!leaveNote.trim()) {
            toast.error("Please enter a leave reason.");
            return;
        }

        try {
            setSubmittingLeave(true);
            const formData = new FormData();
            formData.append('date', leaveDate);
            formData.append('leaveNote', leaveNote.trim());
            if (leaveFile) {
                formData.append('leaveFile', leaveFile);
            }

            await axios.post('/api/attendance/leave-application', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Leave application submitted successfully!");
            setIsLeaveModalOpen(false);
            setLeaveDate('');
            setLeaveNote('');
            setLeaveFile(null);
            fetchHistory();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit leave application");
        } finally {
            setSubmittingLeave(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (t) => {
        if (!t) return '—';
        if (typeof t === 'string' && t.includes(':') && t.length <= 8) {
            const parts = t.split(':');
            let hours = parseInt(parts[0], 10);
            const minutes = parts[1];
            if (isNaN(hours)) return t;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hourStr = String(hours).padStart(2, '0');
            return `${hourStr}:${minutes} ${ampm}`;
        }
        try {
            const d = new Date(t);
            if (isNaN(d.getTime())) return t;
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return t;
        }
    };

    return (
        <DashboardLayout role="Staff" fullWidth={true}>
            <div style={{ padding: '0 8px' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '14px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Calendar size={22} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>My Attendance</h1>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Track check-in status, logs, and apply for leaves</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setIsLeaveModalOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 18px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                        }}
                    >
                        <Plus size={14} /> Apply for Leave
                    </button>
                </div>

                {/* Summary Panel */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[
                        { label: 'Present Days', value: stats.present, color: '#10b981', bg: '#f0fdf4', border: '#dcfce7', icon: <CheckCircle size={20} /> },
                        { label: 'Absent Days', value: stats.absent, color: '#ef4444', bg: '#fef2f2', border: '#fee2e2', icon: <XCircle size={20} /> },
                        { label: 'Approved Leaves', value: stats.leave, color: '#f59e0b', bg: '#fef3c7', border: '#fef3c7', icon: <FileText size={20} /> },
                        { label: 'Scheduled Holidays', value: stats.holiday, color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe', icon: <Calendar size={20} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: s.bg, border: `1px solid ${s.border}`,
                            borderRadius: '16px', padding: '18px 20px',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
                            <div>
                                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{s.value}</p>
                                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 700 }}>
                        <div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        Loading Attendance Data...
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>
                        
                        {/* Heatmap Calendar */}
                        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                            {/* Calendar Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <button
                                    onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px', cursor: 'pointer', color: '#64748b' }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>
                                    {viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button
                                    onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px', cursor: 'pointer', color: '#64748b' }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Day labels */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '10px', textAlign: 'center' }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8' }}>{d}</div>
                                ))}
                            </div>

                            {/* Cells */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px' }}>
                                {cells.map((day, i) => {
                                    if (!day) return <div key={`empty-${i}`} />;
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const record = dateMap[dateStr];
                                    const cfg = record ? STATUS_CONFIG[record.status] : null;
                                    const isWeekend = (i % 7 === 0 || i % 7 === 6);

                                    return (
                                        <div
                                            key={`day-${day}`}
                                            title={record ? `${dateStr}: ${record.status}` : dateStr}
                                            style={{
                                                aspectRatio: '1',
                                                borderRadius: '10px',
                                                background: cfg ? cfg.bg : (isWeekend ? '#f8fafc' : '#f1f5f9'),
                                                border: `1.5px solid ${cfg ? cfg.border : '#e2e8f0'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative'
                                            }}
                                        >
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cfg ? cfg.color : '#334155' }}>{day}</span>
                                            {cfg && <span style={{ fontSize: '0.55rem', fontWeight: 900, color: cfg.color, marginTop: '2px' }}>{cfg.label}</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '3px', background: cfg.bg, border: `1px solid ${cfg.border}` }} />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>{k}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Logs Timeline */}
                        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Detailed Attendance Logs</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                                {history.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                                        No attendance logs found in database.
                                    </div>
                                ) : history.map(rec => {
                                    const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Absent;
                                    return (
                                        <div key={rec.date} style={{ padding: '14px 18px', border: '1px solid #f1f5f9', borderRadius: '14px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{formatDate(rec.date)}</span>
                                                    <span style={{
                                                        marginLeft: '8px', fontSize: '0.62rem', fontWeight: 900,
                                                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                                                        padding: '2px 8px', borderRadius: '999px', display: 'inline-block'
                                                    }}>
                                                        {rec.status}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>via {rec.source}</span>
                                            </div>

                                            {/* Times check in/out */}
                                            {(rec.checkInTime || rec.checkOutTime) && (
                                                <div style={{ display: 'flex', gap: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Check In</span>
                                                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>{formatTime(rec.checkInTime)}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Check Out</span>
                                                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>{formatTime(rec.checkOutTime)}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Notes / Leave Status */}
                                            {rec.teacherNote && (
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, background: '#fff', border: '1px solid #f1f5f9', padding: '8px 10px', borderRadius: '8px' }}>
                                                    <strong style={{ color: '#475569' }}>Note:</strong> {rec.teacherNote}
                                                </div>
                                            )}

                                            {rec.status === 'Leave' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, marginTop: '2px' }}>
                                                    <span style={{ color: '#475569' }}>Leave Status:</span>
                                                    <span style={{
                                                        color: rec.leaveStatus === 'Approved' ? '#16a34a' : rec.leaveStatus === 'Rejected' ? '#dc2626' : '#d97706',
                                                        background: rec.leaveStatus === 'Approved' ? '#dcfce7' : rec.leaveStatus === 'Rejected' ? '#fee2e2' : '#fffbeb',
                                                        padding: '1px 6px', borderRadius: '4px'
                                                    }}>
                                                        {rec.leaveStatus || 'Pending'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Leave Application Modal */}
            {isLeaveModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '100px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', margin: '0 auto', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Apply for Leave</h2>
                            <button onClick={() => setIsLeaveModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>
                        <form onSubmit={handleLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>Leave Date *</label>
                                <input
                                    type="date"
                                    value={leaveDate}
                                    onChange={e => setLeaveDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>Reason / Leave Note *</label>
                                <textarea
                                    value={leaveNote}
                                    onChange={e => setLeaveNote(e.target.value)}
                                    placeholder="Explain your reason for leave..."
                                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>Leave Document (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={e => setLeaveFile(e.target.files[0])}
                                    style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}
                                />
                            </div>

                            <button type="submit" disabled={submittingLeave} style={{
                                marginTop: '6px', padding: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                color: '#fff', border: 'none', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 900,
                                cursor: submittingLeave ? 'not-allowed' : 'pointer', opacity: submittingLeave ? 0.7 : 1, fontFamily: 'inherit'
                            }}>
                                {submittingLeave ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default StaffAttendance;
