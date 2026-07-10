import DashboardLayout from '../../components/layout/DashboardLayout';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

const MONTH = 'July 2026';
const DAYS_IN_MONTH = 31;
const START_DAY = 2; // July 1, 2026 = Wednesday (0=Sun, 2=Tue... adjust as needed)

// Dummy attendance data: 1-indexed day → status
const ATTENDANCE = {
    1: 'present', 2: 'present', 3: 'present', 4: 'absent', 5: 'present',
    7: 'present', 8: 'present', 9: 'present', 10: 'present',
    // Weekends blank (6=Sat, 7=Sun logic handled by display)
};

const statusConfig = {
    present: { label: 'P', color: '#10b981', bg: '#dcfce7', border: '#86efac' },
    absent: { label: 'A', color: '#ef4444', bg: '#fee2e2', border: '#fca5a5' },
    leave: { label: 'L', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
    holiday: { label: 'H', color: '#6366f1', bg: '#ede9fe', border: '#c4b5fd' },
};

const StaffAttendance = () => {
    // Build calendar grid
    const blanks = Array(START_DAY).fill(null);
    const days = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);
    const cells = [...blanks, ...days];
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    const presentCount = Object.values(ATTENDANCE).filter(v => v === 'present').length;
    const absentCount = Object.values(ATTENDANCE).filter(v => v === 'absent').length;

    return (
        <DashboardLayout role="Staff" fullWidth={true}>
            <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '14px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Calendar size={22} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>My Attendance</h1>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{MONTH}</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
                    {[
                        { label: 'Present', value: presentCount, icon: <CheckCircle size={18} />, color: '#10b981', bg: '#f0fdf4' },
                        { label: 'Absent', value: absentCount, icon: <XCircle size={18} />, color: '#ef4444', bg: '#fef2f2' },
                        { label: 'Working Days', value: 27, icon: <Clock size={18} />, color: '#6366f1', bg: '#eef2ff' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: s.bg, borderRadius: '16px', padding: '18px 20px',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <span style={{ color: s.color }}>{s.icon}</span>
                            <div>
                                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{s.value}</p>
                                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Calendar */}
                <div style={{
                    background: '#fff', borderRadius: '20px', padding: '24px',
                    border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}>
                    {/* Day Labels */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '8px' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', padding: '4px 0' }}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px' }}>
                        {cells.map((day, i) => {
                            if (!day) return <div key={i} />;
                            const status = ATTENDANCE[day];
                            const cfg = status ? statusConfig[status] : null;
                            const isWeekend = (i % 7 === 0 || i % 7 === 6);
                            const isFuture = day > 10; // today approx day 10

                            return (
                                <div key={i} style={{
                                    aspectRatio: '1', borderRadius: '10px',
                                    background: cfg ? cfg.bg : (isWeekend ? '#f8fafc' : '#fafafa'),
                                    border: `1.5px solid ${cfg ? cfg.border : '#f1f5f9'}`,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: '2px'
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isWeekend ? '#cbd5e1' : '#374151' }}>{day}</span>
                                    {cfg && <span style={{ fontSize: '0.6rem', fontWeight: 900, color: cfg.color }}>{cfg.label}</span>}
                                    {isFuture && !cfg && !isWeekend && (
                                        <span style={{ fontSize: '0.55rem', color: '#cbd5e1', fontWeight: 700 }}>—</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '14px', marginTop: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: 14, height: 14, borderRadius: '4px', background: cfg.bg, border: `1.5px solid ${cfg.border}` }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'capitalize' }}>{key}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StaffAttendance;
