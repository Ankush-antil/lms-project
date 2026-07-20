import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    CheckSquare, Calendar, DollarSign, TrendingUp, Clock, Award
} from 'lucide-react';

const StaffDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // ── Live stats computed from user data ──────────────────────────────────────
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // e.g. "2026-07"
    const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' }); // e.g. "July 2026"

    const attendance = user?.staffProfile?.physicalAttendance || [];

    const presentDays = attendance.filter(a =>
        a.status === 'Present' && a.date?.startsWith(currentMonth)
    ).length;

    const absentDays = attendance.filter(a =>
        a.status === 'Absent' && a.date?.startsWith(currentMonth)
    ).length;

    const leaveDays = attendance.filter(a =>
        a.status === 'Leave' && a.date?.startsWith(currentMonth)
    ).length;

    const totalMarked = presentDays + absentDays + leaveDays;
    const attendancePct = totalMarked > 0
        ? `${Math.round((presentDays / totalMarked) * 100)}%`
        : 'N/A';

    const salaryStatus = user?.staffProfile?.salaryStatus || 'Pending';
    const salaryColor = salaryStatus === 'Paid' ? '#10b981' : salaryStatus === 'Processing' ? '#f59e0b' : '#ef4444';
    const salaryBg = salaryStatus === 'Paid' ? 'rgba(16,185,129,0.12)' : salaryStatus === 'Processing' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.10)';

    const stats = [
        {
            label: 'Present Days',
            value: String(presentDays),
            sub: monthLabel,
            icon: Calendar,
            color: '#10b981',
            bg: 'rgba(16,185,129,0.12)'
        },
        {
            label: 'Absent Days',
            value: String(absentDays),
            sub: monthLabel,
            icon: CheckSquare,
            color: '#6366f1',
            bg: 'rgba(99,102,241,0.12)'
        },
        {
            label: 'Leave Days',
            value: String(leaveDays),
            sub: monthLabel,
            icon: Clock,
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.12)'
        },
        {
            label: 'Salary Status',
            value: salaryStatus,
            sub: monthLabel,
            icon: DollarSign,
            color: salaryColor,
            bg: salaryBg
        },
        {
            label: 'Attendance %',
            value: attendancePct,
            sub: `${totalMarked} days recorded`,
            icon: TrendingUp,
            color: '#8b5cf6',
            bg: 'rgba(139,92,246,0.12)'
        },
        {
            label: 'My Valuation (Net)',
            value: String((user?.staffProfile?.plusPoints || 0) - (user?.staffProfile?.minusPoints || 0)),
            sub: `+${user?.staffProfile?.plusPoints || 0} Plus / -${user?.staffProfile?.minusPoints || 0} Minus`,
            icon: Award,
            color: '#6366f1',
            bg: 'rgba(99,102,241,0.12)'
        },
    ];

    // ── Activity feed: built from real user data ─────────────────────────────────
    const activities = [];

    // Leave applications (most recent first)
    const leaveEntries = [...attendance]
        .filter(a => a.status === 'Leave')
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 3);

    leaveEntries.forEach(a => {
        const date = a.date
            ? new Date(a.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
        const statusColor = a.leaveStatus === 'Approved' ? '#10b981' : a.leaveStatus === 'Rejected' ? '#ef4444' : '#f59e0b';
        const statusIcon = a.leaveStatus === 'Approved' ? '✅' : a.leaveStatus === 'Rejected' ? '❌' : '🔔';
        activities.push({
            icon: statusIcon,
            action: `Leave ${a.leaveStatus || 'Pending'}`,
            detail: `Applied for ${date}${a.leaveNote ? ` — "${a.leaveNote.slice(0, 40)}${a.leaveNote.length > 40 ? '…' : ''}"` : ''}`,
            color: statusColor,
            time: date
        });
    });

    // Salary status event
    activities.push({
        icon: salaryStatus === 'Paid' ? '💰' : salaryStatus === 'Processing' ? '⏳' : '📋',
        action: `Salary ${salaryStatus}`,
        detail: `${monthLabel} — ${salaryStatus === 'Paid' ? 'Salary has been credited' : salaryStatus === 'Processing' ? 'Processing in progress' : 'Awaiting salary disbursement'}`,
        color: salaryColor,
        time: monthLabel
    });

    // Joining info
    if (user?.staffProfile?.joiningDate) {
        const joined = new Date(user.staffProfile.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        activities.push({
            icon: '🏢',
            action: 'Joined Institute',
            detail: `${user?.staffProfile?.designation || 'Staff'} — ${user?.staffProfile?.department || 'General'}`,
            color: '#6366f1',
            time: joined
        });
    }

    // Latest present day
    const lastPresent = [...attendance].filter(a => a.status === 'Present').sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    if (lastPresent) {
        const date = new Date(lastPresent.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        activities.push({
            icon: '✅',
            action: 'Attendance Marked',
            detail: `Present on ${date}${lastPresent.checkInTime ? ` · In: ${lastPresent.checkInTime}` : ''}${lastPresent.checkOutTime ? ` · Out: ${lastPresent.checkOutTime}` : ''}`,
            color: '#10b981',
            time: date
        });
    }

    return (
        <DashboardLayout role={user?.role || 'Staff'} fullWidth={true}>
            <div>

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    {stats.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} style={{
                                background: '#fff',
                                borderRadius: '18px',
                                padding: '22px 24px',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '14px',
                                    background: s.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Icon size={22} style={{ color: s.color }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{s.value}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{s.label}</p>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{s.sub}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Recent Activity Feed */}
                <div style={{
                    background: '#fff', borderRadius: '20px', padding: '24px',
                    border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <Clock size={16} style={{ color: '#6366f1' }} />
                        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Recent Activity</h2>
                    </div>

                    {activities.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                            📋 No recent activity found
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activities.map((a, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    padding: '12px 16px', borderRadius: '12px', background: '#f8fafc'
                                }}>
                                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{a.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: a.color }}>{a.action}</p>
                                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{a.detail}</p>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default StaffDashboard;

