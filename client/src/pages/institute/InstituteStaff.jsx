import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, Search, UserPlus, X, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const InstituteStaff = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', designation: '', department: '' });

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

    useEffect(() => { fetchStaff(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            toast.error('Name, email and password are required');
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem('authToken');
            await axios.post('/api/users', {
                name: form.name,
                email: form.email,
                password: form.password,
                role: 'Staff',
                staffProfile: { designation: form.designation, department: form.department }
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Staff member added!');
            setShowModal(false);
            setForm({ name: '', email: '', password: '', designation: '', department: '' });
            fetchStaff();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to add staff');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = staffList.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    const displayList = filtered.length > 0 ? filtered : (search ? [] : DUMMY_STAFF);

    return (
        <DashboardLayout role="Institute">
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
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>My Staff</h1>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage your institute's staff members</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{
                                paddingLeft: 32, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                                border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.8rem',
                                fontWeight: 600, color: '#374151', background: '#fff', outline: 'none', fontFamily: 'inherit'
                            }} />
                        </div>
                        <button onClick={() => setShowModal(true)} style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                            border: 'none', borderRadius: '12px', padding: '9px 18px',
                            fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                            <UserPlus size={15} /> Add Staff
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 700 }}>Loading...</div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                    {['#', 'Name', 'Email', 'Designation', 'Department', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayList.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No staff found</td></tr>
                                ) : displayList.map((s, i) => (
                                    <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.78rem', fontWeight: 900 }}>
                                                    {s.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{s.email}</td>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{s.staffProfile?.designation || '—'}</td>
                                        <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{s.staffProfile?.department || '—'}</td>
                                        <td style={{ padding: '13px 16px' }}>
                                            <span style={{ background: s.isActive !== false ? '#dcfce7' : '#fee2e2', color: s.isActive !== false ? '#16a34a' : '#dc2626', borderRadius: '999px', padding: '3px 10px', fontSize: '0.65rem', fontWeight: 900 }}>
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

            {/* Add Staff Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Add Staff Member</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>
                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {[
                                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'e.g. Ravi Kumar' },
                                { label: 'Email *', key: 'email', type: 'email', placeholder: 'e.g. ravi@institute.com' },
                                { label: 'Designation', key: 'designation', type: 'text', placeholder: 'e.g. Office Clerk' },
                                { label: 'Department', key: 'department', type: 'text', placeholder: 'e.g. Administration' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>{f.label}</label>
                                    <input
                                        type={f.type} placeholder={f.placeholder} value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>Password *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password}
                                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting} style={{
                                marginTop: '6px', padding: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                color: '#fff', border: 'none', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 900,
                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit'
                            }}>
                                {submitting ? 'Adding...' : 'Add Staff Member'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

const DUMMY_STAFF = [
    { _id: 'd1', name: 'Ravi Kumar', email: 'ravi@institute.edu', staffProfile: { designation: 'Office Clerk', department: 'Administration' }, isActive: true },
    { _id: 'd2', name: 'Sunita Sharma', email: 'sunita@institute.edu', staffProfile: { designation: 'Lab Assistant', department: 'IT Lab' }, isActive: true },
    { _id: 'd3', name: 'Mohit Verma', email: 'mohit@institute.edu', staffProfile: { designation: 'Peon', department: 'General' }, isActive: true },
];

export default InstituteStaff;
