import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    CheckSquare, Calendar, DollarSign, TrendingUp,
    Clock, User, Building, Award
} from 'lucide-react';

const StaffDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const stats = [
        { label: 'Tasks Assigned', value: '8', sub: '3 pending', icon: CheckSquare, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
        { label: 'Present Days', value: '22', sub: 'This month', icon: Calendar, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        { label: 'Salary Status', value: 'Pending', sub: 'July 2026', icon: DollarSign, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        { label: 'Performance', value: '92%', sub: 'Last review', icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    ];

    const recentActivity = [
        { action: 'Task assigned', detail: 'Prepare monthly report', time: '2h ago', icon: '📋' },
        { action: 'Attendance marked', detail: 'Present — 10 Jul 2026', time: '8h ago', icon: '✅' },
        { action: 'Salary processed', detail: 'June salary under review', time: '2d ago', icon: '💰' },
        { action: 'Task completed', detail: 'Student fee reconciliation', time: '3d ago', icon: '🎯' },
    ];

    return (
        <DashboardLayout role="Staff" fullWidth={true}>
            <div>

                {/* Welcome Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                    borderRadius: '24px',
                    padding: '32px 36px',
                    marginBottom: '32px',
                    position: 'relative',
                    overflow: 'hidden',
                    color: '#fff'
                }}>
                    <div style={{
                        position: 'absolute', top: -40, right: -40,
                        width: 200, height: 200, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)'
                    }} />
                    <div style={{
                        position: 'absolute', bottom: -60, right: 100,
                        width: 160, height: 160, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.04)'
                    }} />
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                        Staff Portal
                    </p>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '6px 0 4px', letterSpacing: '-0.03em' }}>
                        Welcome back, {user?.name?.split(' ')[0] || 'Staff'} 👋
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: '#c7d2fe', margin: 0, fontWeight: 500 }}>
                        Here's a quick overview of your work this month.
                    </p>

                    {/* Info chips */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                        {[
                            { icon: <User size={13} />, label: user?.email || 'staff@lms.com' },
                            { icon: <Building size={13} />, label: 'LMS Institute' },
                            { icon: <Award size={13} />, label: user?.staffProfile?.designation || 'Staff Member' },
                        ].map((chip, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(255,255,255,0.1)', borderRadius: '999px',
                                padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#e0e7ff'
                            }}>
                                {chip.icon} {chip.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    {stats.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} style={{
                                background: '#fff', borderRadius: '18px', padding: '22px 24px',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                                display: 'flex', alignItems: 'center', gap: '16px'
                            }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '14px',
                                    background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={22} style={{ color: s.color }} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{s.value}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{s.label}</p>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{s.sub}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Recent Activity */}
                <div style={{
                    background: '#fff', borderRadius: '20px', padding: '24px',
                    border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <Clock size={16} style={{ color: '#6366f1' }} />
                        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Recent Activity</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentActivity.map((a, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '12px 16px', borderRadius: '12px', background: '#f8fafc'
                            }}>
                                <span style={{ fontSize: '1.3rem' }}>{a.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{a.action}</p>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{a.detail}</p>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>{a.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StaffDashboard;
