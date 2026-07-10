import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, Search, Building, Mail, Briefcase } from 'lucide-react';
import axios from 'axios';

const StaffList = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get('/api/users?role=Staff', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStaffList(Array.isArray(data) ? data : data.users || []);
            } catch {
                setStaffList([]);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const filtered = staffList.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.staffProfile?.designation?.toLowerCase().includes(search.toLowerCase())
    );

    // Dummy fallback data for display when no real data
    const displayList = filtered.length > 0 ? filtered : (search ? [] : DUMMY_STAFF);

    return (
        <DashboardLayout role="Admin">
            <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Users size={22} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>All Staff</h1>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Staff members across all institutes</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search staff..."
                            style={{
                                paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                                border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.82rem',
                                fontWeight: 600, color: '#374151', background: '#fff', outline: 'none',
                                minWidth: 240, fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 700 }}>Loading staff...</div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                    {['#', 'Name', 'Email', 'Designation', 'Department', 'Institute', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                                            No staff found
                                        </td>
                                    </tr>
                                ) : displayList.map((s, i) => (
                                    <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontSize: '0.8rem', fontWeight: 900
                                                }}>
                                                    {s.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Mail size={12} style={{ color: '#94a3b8' }} /> {s.email}
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Briefcase size={12} style={{ color: '#94a3b8' }} />
                                                {s.staffProfile?.designation || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{s.staffProfile?.department || '—'}</td>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Building size={12} style={{ color: '#94a3b8' }} />
                                                {s.instituteName || s.institute?.name || 'All Institutes'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <span style={{
                                                background: s.isActive !== false ? '#dcfce7' : '#fee2e2',
                                                color: s.isActive !== false ? '#16a34a' : '#dc2626',
                                                borderRadius: '999px', padding: '3px 10px',
                                                fontSize: '0.65rem', fontWeight: 900
                                            }}>
                                                {s.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

// Dummy data shown when no real staff exist yet
const DUMMY_STAFF = [
    { _id: 'd1', name: 'Ravi Kumar', email: 'ravi@hartron.edu', staffProfile: { designation: 'Office Clerk', department: 'Administration' }, instituteName: 'Hartron Institute', isActive: true },
    { _id: 'd2', name: 'Sunita Sharma', email: 'sunita@hartron.edu', staffProfile: { designation: 'Lab Assistant', department: 'IT Lab' }, instituteName: 'Hartron Institute', isActive: true },
    { _id: 'd3', name: 'Mohit Verma', email: 'mohit@lms.edu', staffProfile: { designation: 'Peon', department: 'General' }, instituteName: 'LMS Academy', isActive: true },
    { _id: 'd4', name: 'Priya Singh', email: 'priya@lms.edu', staffProfile: { designation: 'Receptionist', department: 'Front Desk' }, instituteName: 'LMS Academy', isActive: false },
];

export default StaffList;
