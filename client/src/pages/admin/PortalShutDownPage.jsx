import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Power, ChevronDown, RefreshCw, Users } from 'lucide-react';

const ALL_ROLES = [
    { value: 'Teacher', label: 'Teachers', emoji: '👨‍🏫' },
    { value: 'Student', label: 'Students', emoji: '🎓' },
    { value: 'Editor', label: 'Editors', emoji: '✏️' },
    { value: 'Accountant', label: 'Accountants', emoji: '💼' },
    { value: 'Marketer', label: 'Marketers', emoji: '📣' },
    { value: 'Staff', label: 'Staff', emoji: '🧑‍💼' },
    { value: 'Parent', label: 'Parents', emoji: '👨‍👩‍👧' },
    { value: 'Guest', label: 'Limited Users', emoji: '🔒' },
    { value: 'Limited', label: 'Guest Users', emoji: '👤' },
    { value: 'Institute', label: 'Institutes', emoji: '🏛️' },
];

const Toggle = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-slate-600/60'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
);

export default function PortalShutDownPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [institutes, setInstitutes] = useState([]);
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [togglingId, setTogglingId] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Load institutes (Admin only)
    useEffect(() => {
        if (user?.role !== 'Admin') {
            setSelectedInstitute(user?.institute || '');
            return;
        }
        axios.get('/api/setup/shutdown/status').then(res => {
            const list = res.data.institutes || [];
            setInstitutes(list);
            if (list.length > 0) setSelectedInstitute(list[0]._id);
        }).catch(() => toast.error('Could not load institutes'));
    }, [user]);

    // Load users when institute or role changes
    const loadUsers = useCallback(async () => {
        if (!selectedInstitute) return;
        setLoading(true);
        setSelected(new Set());
        try {
            const params = new URLSearchParams({ institute: selectedInstitute });
            if (selectedRole) params.set('role', selectedRole);
            const res = await axios.get(`/api/users?${params}`);
            setUsers(res.data.users || res.data || []);
        } catch (e) {
            toast.error('Could not load users');
        } finally {
            setLoading(false);
        }
    }, [selectedInstitute, selectedRole]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Toggle single user
    const toggleUser = async (userId, currentActive) => {
        setTogglingId(userId);
        try {
            const nextActive = !currentActive;
            await axios.put(`/api/users/${userId}`, { isActive: nextActive });
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: nextActive } : u));
            toast.success(nextActive ? 'User activated' : 'User shut down');
        } catch (e) {
            toast.error('Failed to update user status');
        } finally {
            setTogglingId(null);
        }
    };

    // Bulk toggle
    const bulkToggle = async (enable) => {
        if (selected.size === 0) return toast.error('Select at least one user');
        setBulkLoading(true);
        try {
            const userIds = [...selected];
            await axios.put('/api/users/bulk-status', { userIds, isActive: enable });
            setUsers(prev => prev.map(u => userIds.includes(u._id) ? { ...u, isActive: enable } : u));
            setSelected(new Set());
            toast.success(`${userIds.length} user(s) ${enable ? 'activated' : 'shut down'}`);
        } catch (e) {
            toast.error('Bulk update failed');
        } finally {
            setBulkLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(u => u._id)));
        }
    };

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filtered = users.filter(u => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });

    const activeCount = filtered.filter(u => u.isActive !== false).length;
    const shutDownCount = filtered.filter(u => u.isActive === false).length;

    return (
        <DashboardLayout role={user?.role}>
            <div className="min-h-screen bg-[#f8f9ff] p-4 md:p-6">
                <div className="max-w-6xl mx-auto space-y-5">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <Power size={22} className="text-red-500" /> Portal Shut Down
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                Manage login access for users — toggling OFF prevents login
                            </p>
                        </div>
                        <button
                            onClick={loadUsers}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-end">
                        {/* Institute selector - Admin only */}
                        {user?.role === 'Admin' && institutes.length > 0 && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Institute</label>
                                <div className="relative">
                                    <select
                                        value={selectedInstitute}
                                        onChange={e => setSelectedInstitute(e.target.value)}
                                        className="w-full appearance-none px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer pr-8"
                                    >
                                        {institutes.map(i => (
                                            <option key={i._id} value={i._id}>{i.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Role filter */}
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</label>
                            <div className="relative">
                                <select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    className="w-full appearance-none px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer pr-8"
                                >
                                    <option value="">All Roles</option>
                                    {ALL_ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Search</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm text-center">
                            <p className="text-2xl font-black text-slate-800">{filtered.length}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 shadow-sm text-center">
                            <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
                            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Active</p>
                        </div>
                        <div className="bg-red-50 rounded-xl border border-red-200 p-3 shadow-sm text-center">
                            <p className="text-2xl font-black text-red-500">{shutDownCount}</p>
                            <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mt-0.5">Shut Down</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Table toolbar */}
                        {selected.size > 0 && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                                <span className="text-sm font-black text-indigo-700">{selected.size} selected</span>
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={() => bulkToggle(true)}
                                        disabled={bulkLoading}
                                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        ✅ Activate All
                                    </button>
                                    <button
                                        onClick={() => bulkToggle(false)}
                                        disabled={bulkLoading}
                                        className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        🔴 Shut Down All
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Table head */}
                        <div className="grid grid-cols-[40px_1fr_1fr_120px_100px] gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filtered.length > 0 && selected.size === filtered.length}
                                    onChange={toggleSelectAll}
                                    className="accent-indigo-500 cursor-pointer w-4 h-4"
                                />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</p>
                        </div>

                        {/* Table body */}
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <Users size={40} strokeWidth={1.5} className="mb-3 opacity-40" />
                                <p className="text-sm font-bold">No users found</p>
                                <p className="text-xs mt-1">Try changing the filters or search query</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {filtered.map(u => {
                                    const isActive = u.isActive !== false;
                                    const isSelected = selected.has(u._id);
                                    const role = ALL_ROLES.find(r => r.value === u.role);
                                    return (
                                        <div
                                            key={u._id}
                                            className={`grid grid-cols-[40px_1fr_1fr_120px_100px] gap-3 px-4 py-3.5 items-center transition-all ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/60'} ${!isActive ? 'opacity-60' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(u._id)}
                                                className="accent-indigo-500 cursor-pointer w-4 h-4"
                                            />

                                            {/* Name + avatar */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0 overflow-hidden">
                                                    {u.avatar
                                                        ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                                                        : u.name?.[0]?.toUpperCase() || '?'
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-800 truncate">{u.name || '—'}</p>
                                                    {!isActive && <span className="text-[9px] font-black text-red-400 bg-red-50 px-1.5 py-0.5 rounded-full">Shut Down</span>}
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <p className="text-xs font-bold text-slate-500 truncate">{u.email || '—'}</p>

                                            {/* Role badge */}
                                            <div>
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                                                    <span>{role?.emoji}</span> {u.role}
                                                </span>
                                            </div>

                                            {/* Status toggle */}
                                            <div className="flex justify-center">
                                                <Toggle
                                                    checked={isActive}
                                                    onChange={() => toggleUser(u._id, isActive)}
                                                    disabled={togglingId === u._id}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
