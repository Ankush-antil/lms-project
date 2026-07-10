import DashboardLayout from '../../components/layout/DashboardLayout';
import { DollarSign, TrendingUp, Calendar, CheckCircle, Clock } from 'lucide-react';

const SALARY_HISTORY = [
    { month: 'June 2026', amount: 25000, status: 'Paid', date: 'Jul 1, 2026' },
    { month: 'May 2026', amount: 25000, status: 'Paid', date: 'Jun 1, 2026' },
    { month: 'April 2026', amount: 24500, status: 'Paid', date: 'May 2, 2026' },
    { month: 'March 2026', amount: 24500, status: 'Paid', date: 'Apr 1, 2026' },
    { month: 'February 2026', amount: 24000, status: 'Paid', date: 'Mar 3, 2026' },
    { month: 'January 2026', amount: 24000, status: 'Paid', date: 'Feb 1, 2026' },
];

const CURRENT = { month: 'July 2026', amount: 25000, status: 'Pending' };

const statusStyle = {
    Paid: { bg: '#dcfce7', color: '#16a34a', label: 'Paid' },
    Pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
    Processing: { bg: '#e0e7ff', color: '#4338ca', label: 'Processing' },
};

const StaffSalary = () => {
    return (
        <DashboardLayout role="Staff">
            <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '14px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <DollarSign size={22} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>My Salary</h1>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Monthly salary history and current status</p>
                    </div>
                </div>

                {/* Current Month Card */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e1b4b, #4338ca)',
                    borderRadius: '20px', padding: '28px 32px',
                    marginBottom: '28px', color: '#fff',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Current Month
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 800, color: '#c7d2fe' }}>{CURRENT.month}</p>
                    <p style={{ margin: '0 0 16px', fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        ₹{CURRENT.amount.toLocaleString()}
                    </p>
                    <span style={{
                        background: CURRENT.status === 'Paid' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                        color: CURRENT.status === 'Paid' ? '#34d399' : '#fcd34d',
                        borderRadius: '999px', padding: '4px 14px',
                        fontSize: '0.75rem', fontWeight: 900
                    }}>
                        {CURRENT.status === 'Paid' ? '✓ Paid' : '⏳ Pending'}
                    </span>
                </div>

                {/* Summary Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
                    {[
                        { label: 'Total Earned (2026)', value: '₹1,47,000', icon: <TrendingUp size={16} />, color: '#10b981', bg: '#f0fdf4' },
                        { label: 'Months Paid', value: '6', icon: <CheckCircle size={16} />, color: '#6366f1', bg: '#eef2ff' },
                        { label: 'Next Payout', value: 'Aug 1', icon: <Calendar size={16} />, color: '#f59e0b', bg: '#fffbeb' },
                    ].map((s, i) => (
                        <div key={i} style={{ background: s.bg, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: s.color }}>{s.icon}</span>
                            <div>
                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{s.value}</p>
                                <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* History Table */}
                <div style={{
                    background: '#fff', borderRadius: '20px', overflow: 'hidden',
                    border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={15} style={{ color: '#6366f1' }} />
                        <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>Salary History</h2>
                    </div>
                    <div>
                        {SALARY_HISTORY.map((row, i) => {
                            const st = statusStyle[row.status];
                            return (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 24px',
                                    borderBottom: i < SALARY_HISTORY.length - 1 ? '1px solid #f8fafc' : 'none',
                                    background: i % 2 === 0 ? '#fff' : '#fafafa'
                                }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{row.month}</p>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Paid on: {row.date}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>₹{row.amount.toLocaleString()}</p>
                                        <span style={{
                                            background: st.bg, color: st.color,
                                            borderRadius: '999px', padding: '2px 10px',
                                            fontSize: '0.65rem', fontWeight: 900
                                        }}>{st.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StaffSalary;
