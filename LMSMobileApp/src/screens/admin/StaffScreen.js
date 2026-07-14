import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Alert, ScrollView, Modal, Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { AppHeader, EmptyState, LoadingScreen } from '../../components/common/UIComponents';

/* ── Design Tokens ── */
const C = {
    bg: '#f0f4ff',
    card: '#ffffff',
    accent: '#6366f1',
    accentLight: '#eef2ff',
    accentDark: '#4f46e5',
    text: '#0f172a',
    sub: '#475569',
    muted: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    green: '#10b981',
    greenLight: '#ecfdf5',
    red: '#ef4444',
    redLight: '#fef2f2',
    amber: '#f59e0b',
    amberLight: '#fffbeb',
    blue: '#3b82f6',
    blueLight: '#eff6ff',
    purple: '#8b5cf6',
    purpleLight: '#f5f3ff',
    white: '#ffffff',
};
const sp = { xs: 4, sm: 8, md: 16, lg: 24 };
const fz = { xs: 11, sm: 13, md: 15, lg: 18, xl: 22 };
const r = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

const today = new Date().toISOString().split('T')[0];
const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

/* ── Helpers ── */
const calcDuration = (ci, co) => {
    if (!ci || !co) return null;
    const toM = t => {
        const m = t.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
        if (!m) return null;
        let h = +m[1], mn = +m[2];
        if (m[3] === 'PM' && h < 12) h += 12;
        if (m[3] === 'AM' && h === 12) h = 0;
        return h * 60 + mn;
    };
    let d = toM(co) - toM(ci);
    if (d == null || isNaN(d)) return null;
    if (d < 0) d += 1440;
    return d >= 60 ? `${Math.floor(d / 60)}h ${d % 60 > 0 ? d % 60 + 'm' : ''}`.trim() : `${d}m`;
};

const avatar = name => (name?.[0] || '?').toUpperCase();
const instituteName = s => s?.institute?.name || s?.instituteName || '—';

/* ── Sub-components ── */
const Badge = ({ label, bg, color }) => (
    <View style={[ss.badge, { backgroundColor: bg }]}>
        <Text style={[ss.badgeText, { color }]}>{label}</Text>
    </View>
);

const Avatar = ({ name, size = 40, bg = C.accent }) => (
    <View style={[ss.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
        <Text style={[ss.avatarText, { fontSize: size * 0.38 }]}>{avatar(name)}</Text>
    </View>
);

const TABS = [
    { id: 'directory', label: 'Directory', icon: 'people' },
    { id: 'attendance', label: 'Attendance', icon: 'calendar' },
    { id: 'salary', label: 'Salary', icon: 'cash' },
    { id: 'tasks', label: 'Tasks', icon: 'checkbox' },
];

const ATT_STATUSES = [
    { key: 'Present', color: C.green, bg: C.greenLight },
    { key: 'Absent', color: C.red, bg: C.redLight },
    { key: 'Leave', color: C.amber, bg: C.amberLight },
    { key: 'Holiday', color: C.blue, bg: C.blueLight },
];

/* ══════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════ */
const StaffScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('directory');
    const [staffList, setStaffList] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Directory
    const [search, setSearch] = useState('');
    const [instFilter, setInstFilter] = useState('All');
    const [instModal, setInstModal] = useState(false);

    // Attendance
    const [attDate, setAttDate] = useState(today);
    const [attRec, setAttRec] = useState({});
    const [attSearch, setAttSearch] = useState('');
    const [savingAtt, setSavingAtt] = useState(false);

    // Salary
    const [salaryInstFilter, setSalaryInstFilter] = useState('All');

    // Tasks (Admin = view only)
    const [tasks] = useState([]);
    const [taskDateF, setTaskDateF] = useState('year');
    const [taskStatusF, setTaskStatusF] = useState('');
    const [taskVerifF, setTaskVerifF] = useState('');
    const [taskFilModal, setTaskFilModal] = useState(false);
    const [staffTaskModal, setStaffTaskModal] = useState(null);

    /* ── Fetch ── */
    const fetchData = useCallback(async () => {
        try {
            const [sr, ir] = await Promise.all([
                axios.get('/users?role=Staff'),
                axios.get('/setup/institutes'),
            ]);
            const list = Array.isArray(sr.data) ? sr.data : sr.data?.users || [];
            setStaffList(list);
            setInstitutes(Array.isArray(ir.data) ? ir.data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!staffList.length) return;
        const rec = {};
        staffList.forEach(s => {
            const ex = s.staffProfile?.physicalAttendance?.find(a => a.date === attDate);
            rec[s._id] = { status: ex?.status || '', checkIn: ex?.checkInTime || '', checkOut: ex?.checkOutTime || '' };
        });
        setAttRec(rec);
    }, [staffList, attDate]);

    /* ── Derived lists ── */
    const dirList = staffList.filter(s =>
        (instFilter === 'All' || s.institute?._id === instFilter || s.institute === instFilter) &&
        [s.name, s.email, s.staffProfile?.designation].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    );

    const attList = staffList.filter(s =>
        [s.name, s.staffProfile?.designation].some(v => v?.toLowerCase().includes(attSearch.toLowerCase()))
    );

    const salaryList = staffList.filter(s =>
        salaryInstFilter === 'All' || s.institute?._id === salaryInstFilter || s.institute === salaryInstFilter
    );

    /* ── Task helpers ── */
    const getStaffTasks = s => tasks.filter(t => {
        if ((t.staffName || '').toLowerCase() !== (s.name || '').toLowerCase()) return false;
        const td = t.createdAt || t.due || today;
        if (taskDateF === 'today') return td === today;
        if (taskDateF === 'month') return td.startsWith(today.slice(0, 7));
        return true;
    });
    const assigned = ts => ts.filter(t =>
        !t.isSelfCreated &&
        (!taskVerifF || (t.verificationStatus || '') === taskVerifF) &&
        (!taskStatusF || (t.status || 'pending') === taskStatusF)
    );
    const selfTasks = ts => ts.filter(t =>
        t.isSelfCreated &&
        (!taskVerifF || (t.verificationStatus || '') === taskVerifF) &&
        (!taskStatusF || (t.status || 'pending') === taskStatusF)
    );

    /* ── Actions ── */
    const toggleActive = async (id, cur) => {
        const next = cur === false;
        try {
            await axios.put(`/users/${id}`, { isActive: next });
            setStaffList(p => p.map(s => s._id === id ? { ...s, isActive: next } : s));
        } catch { Alert.alert('Error', 'Could not update status'); }
    };

    const deleteStaff = (id, name) => Alert.alert('Delete Staff', `Remove ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
                await axios.delete(`/users/${id}`);
                setStaffList(p => p.filter(s => s._id !== id));
            } catch { Alert.alert('Error', 'Could not delete'); }
        }},
    ]);

    const saveAttendance = async () => {
        const records = Object.entries(attRec)
            .filter(([, r]) => r.status)
            .map(([staffId, r]) => ({ studentId: staffId, status: r.status, checkInTime: r.checkIn, checkOutTime: r.checkOut, note: '' }));
        if (!records.length) { Alert.alert('Info', 'No attendance marked yet'); return; }
        setSavingAtt(true);
        try {
            await axios.post('/users/bulk-physical-attendance', { date: attDate, attendanceRecords: records });
            Alert.alert('✓ Saved', `Attendance saved for ${attDate}`);
            fetchData();
        } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
        finally { setSavingAtt(false); }
    };

    const markPaid = async item => {
        try {
            await axios.put(`/users/${item._id}`, { staffProfile: { ...item.staffProfile, salaryPaid: true } });
            setStaffList(p => p.map(s => s._id === item._id ? { ...s, staffProfile: { ...s.staffProfile, salaryPaid: true } } : s));
        } catch { Alert.alert('Error', 'Could not update'); }
    };

    const shiftDate = d => {
        const dt = new Date(attDate);
        dt.setDate(dt.getDate() + d);
        if (dt <= new Date()) setAttDate(dt.toISOString().split('T')[0]);
    };

    if (loading) return <LoadingScreen />;

    /* ══════════════ RENDER ══════════════ */
    return (
        <View style={ss.root}>
            {/* Header */}
            <AppHeader
                title="All Staff"
                showBack
                rightIcon="person-add-outline"
                rightAction={() => navigation.navigate('CreateUser', { defaultRole: 'Staff' })}
            />

            {/* Tab Bar */}
            <View style={ss.tabRow}>
                {TABS.map(t => {
                    const active = activeTab === t.id;
                    return (
                        <TouchableOpacity key={t.id} style={[ss.tab, active && ss.tabActive]} onPress={() => setActiveTab(t.id)} activeOpacity={0.8}>
                            <Ionicons name={active ? t.icon : `${t.icon}-outline`} size={16} color={active ? C.white : C.muted} />
                            <Text style={[ss.tabLabel, active && ss.tabLabelActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ──────────── DIRECTORY ──────────── */}
            {activeTab === 'directory' && (
                <View style={ss.flex}>
                    {/* Search + Filter */}
                    <View style={ss.toolRow}>
                        <View style={ss.searchWrap}>
                            <Ionicons name="search-outline" size={16} color={C.muted} />
                            <TextInput
                                style={ss.searchInput}
                                placeholder="Search name, email, role…"
                                placeholderTextColor={C.muted}
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={C.muted} /></TouchableOpacity> : null}
                        </View>
                        <TouchableOpacity style={[ss.iconBtn, instFilter !== 'All' && { backgroundColor: C.accentLight, borderColor: C.accent }]} onPress={() => setInstModal(true)}>
                            <Ionicons name="funnel-outline" size={18} color={instFilter !== 'All' ? C.accent : C.muted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={ss.countLabel}>{dirList.length} staff member{dirList.length !== 1 ? 's' : ''}</Text>

                    <FlatList
                        data={dirList}
                        keyExtractor={i => i._id}
                        contentContainerStyle={ss.listPad}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.accent} />}
                        ListEmptyComponent={<EmptyState icon="people-outline" title="No staff found" subtitle="Try adjusting filters" />}
                        renderItem={({ item: s }) => (
                            <View style={ss.card}>
                                <View style={ss.cardRow}>
                                    <Avatar name={s.name} />
                                    <View style={ss.flex}>
                                        <Text style={ss.cardName}>{s.name}</Text>
                                        <Text style={ss.cardEmail} numberOfLines={1}>{s.email}</Text>
                                    </View>
                                    {/* Active toggle */}
                                    <TouchableOpacity style={[ss.toggle, { backgroundColor: s.isActive !== false ? C.green : C.border }]} onPress={() => toggleActive(s._id, s.isActive)}>
                                        <View style={[ss.toggleDot, { transform: [{ translateX: s.isActive !== false ? 14 : 0 }] }]} />
                                    </TouchableOpacity>
                                </View>

                                {/* Chips */}
                                <View style={ss.chipRow}>
                                    {s.staffProfile?.designation ? <Chip icon="briefcase-outline" label={s.staffProfile.designation} color={C.accent} bg={C.accentLight} /> : null}
                                    {s.staffProfile?.department ? <Chip icon="grid-outline" label={s.staffProfile.department} color={C.purple} bg={C.purpleLight} /> : null}
                                    {instituteName(s) !== '—' ? <Chip icon="business-outline" label={instituteName(s)} color={C.green} bg={C.greenLight} /> : null}
                                </View>

                                {/* Actions */}
                                <View style={ss.actionRow}>
                                    <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.accentLight }]} onPress={() => navigation.navigate('UserDetail', { userId: s._id })}>
                                        <Ionicons name="eye-outline" size={14} color={C.accent} />
                                        <Text style={[ss.actionBtnText, { color: C.accent }]}>View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.redLight }]} onPress={() => deleteStaff(s._id, s.name)}>
                                        <Ionicons name="trash-outline" size={14} color={C.red} />
                                        <Text style={[ss.actionBtnText, { color: C.red }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                </View>
            )}

            {/* ──────────── ATTENDANCE ──────────── */}
            {activeTab === 'attendance' && (
                <View style={ss.flex}>
                    {/* Date Nav */}
                    <View style={ss.dateNav}>
                        <TouchableOpacity style={ss.dateNavBtn} onPress={() => shiftDate(-1)}>
                            <Ionicons name="chevron-back" size={20} color={C.text} />
                        </TouchableOpacity>
                        <View style={ss.dateNavMid}>
                            <Ionicons name="calendar-outline" size={14} color={C.accent} />
                            <Text style={ss.dateNavText}>{attDate}</Text>
                        </View>
                        <TouchableOpacity style={ss.dateNavBtn} onPress={() => shiftDate(1)} disabled={attDate >= today}>
                            <Ionicons name="chevron-forward" size={20} color={attDate >= today ? C.border : C.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={[ss.searchWrap, { marginHorizontal: sp.md, marginBottom: sp.sm }]}>
                        <Ionicons name="search-outline" size={15} color={C.muted} />
                        <TextInput style={ss.searchInput} placeholder="Search staff…" placeholderTextColor={C.muted} value={attSearch} onChangeText={setAttSearch} />
                    </View>

                    <FlatList
                        data={attList}
                        keyExtractor={i => i._id}
                        contentContainerStyle={[ss.listPad, { paddingBottom: 96 }]}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<EmptyState icon="people-outline" title="No staff" />}
                        renderItem={({ item: s }) => {
                            const r = attRec[s._id] || {};
                            const dur = calcDuration(r.checkIn, r.checkOut);
                            return (
                                <View style={ss.card}>
                                    <View style={[ss.cardRow, { marginBottom: sp.sm }]}>
                                        <Avatar name={s.name} />
                                        <View style={ss.flex}>
                                            <Text style={ss.cardName}>{s.name}</Text>
                                            <Text style={ss.cardEmail}>{s.staffProfile?.designation || s.staffProfile?.department || s.email}</Text>
                                        </View>
                                        {r.status ? <Badge label={r.status} bg={ATT_STATUSES.find(a => a.key === r.status)?.bg || '#f1f5f9'} color={ATT_STATUSES.find(a => a.key === r.status)?.color || C.muted} /> : null}
                                    </View>

                                    {/* Status buttons */}
                                    <View style={ss.statusRow}>
                                        {ATT_STATUSES.map(a => {
                                            const sel = r.status === a.key;
                                            return (
                                                <TouchableOpacity
                                                    key={a.key}
                                                    style={[ss.statusBtn, sel && { backgroundColor: a.color, borderColor: a.color }]}
                                                    onPress={() => setAttRec(p => ({ ...p, [s._id]: { ...p[s._id], status: sel ? '' : a.key } }))}
                                                >
                                                    <Text style={[ss.statusBtnText, sel && { color: C.white }]}>{a.key}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Times */}
                                    <View style={ss.timeRow}>
                                        <View style={ss.timeField}>
                                            <Text style={ss.timeLabel}>CHECK IN</Text>
                                            <TextInput
                                                style={ss.timeInput}
                                                value={r.checkIn || ''}
                                                onChangeText={v => setAttRec(p => ({ ...p, [s._id]: { ...p[s._id], checkIn: v } }))}
                                                placeholder="09:00 AM"
                                                placeholderTextColor={C.muted}
                                            />
                                        </View>
                                        <Ionicons name="arrow-forward-outline" size={14} color={C.muted} style={{ marginTop: 20 }} />
                                        <View style={ss.timeField}>
                                            <Text style={ss.timeLabel}>CHECK OUT</Text>
                                            <TextInput
                                                style={ss.timeInput}
                                                value={r.checkOut || ''}
                                                onChangeText={v => setAttRec(p => ({ ...p, [s._id]: { ...p[s._id], checkOut: v } }))}
                                                placeholder="05:00 PM"
                                                placeholderTextColor={C.muted}
                                            />
                                        </View>
                                        {dur ? (
                                            <View style={{ alignItems: 'center', marginTop: 20 }}>
                                                <Text style={ss.timeLabel}>HOURS</Text>
                                                <Text style={{ fontSize: fz.sm, fontWeight: '800', color: C.accent }}>{dur}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        }}
                    />

                    {/* Save footer */}
                    <View style={ss.footer}>
                        <TouchableOpacity style={ss.saveBtn} onPress={saveAttendance} disabled={savingAtt}>
                            {savingAtt ? <ActivityIndicator size="small" color={C.white} /> : <>
                                <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />
                                <Text style={ss.saveBtnText}>Save Attendance</Text>
                            </>}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ──────────── SALARY ──────────── */}
            {activeTab === 'salary' && (
                <View style={ss.flex}>
                    <View style={ss.sectionHeader}>
                        <View>
                            <Text style={ss.sectionTitle}>Salary Processing</Text>
                            <Text style={ss.sectionSub}>{monthLabel}</Text>
                        </View>
                        {institutes.length > 0 && (
                            <TouchableOpacity style={ss.outlinePill} onPress={() => Alert.alert('Filter by Institute', '',
                                [{ text: 'All Institutes', onPress: () => setSalaryInstFilter('All') },
                                ...institutes.map(i => ({ text: i.name, onPress: () => setSalaryInstFilter(i._id) })),
                                { text: 'Cancel', style: 'cancel' }])}>
                                <Ionicons name="funnel-outline" size={13} color={C.accent} />
                                <Text style={ss.outlinePillText}>Filter</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={salaryList}
                        keyExtractor={i => i._id}
                        contentContainerStyle={ss.listPad}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.accent} />}
                        ListEmptyComponent={<EmptyState icon="cash-outline" title="No salary records" />}
                        renderItem={({ item: s }) => {
                            const amt = s.staffProfile?.salary ? `PKR ${Number(s.staffProfile.salary).toLocaleString()} / mo` : 'PKR 25,000 / mo';
                            const paid = s.staffProfile?.salaryPaid === true;
                            return (
                                <View style={ss.card}>
                                    <View style={ss.cardRow}>
                                        <Avatar name={s.name} />
                                        <View style={ss.flex}>
                                            <Text style={ss.cardName}>{s.name}</Text>
                                            <Text style={ss.cardEmail}>
                                                {[s.staffProfile?.designation, s.staffProfile?.department].filter(Boolean).join(' · ') || s.email}
                                            </Text>
                                        </View>
                                        <Badge label={paid ? 'Paid' : 'Pending'} bg={paid ? C.greenLight : '#fef9c3'} color={paid ? C.green : '#ca8a04'} />
                                    </View>

                                    <View style={ss.salaryInfoRow}>
                                        <View style={ss.salaryItem}>
                                            <Ionicons name="cash-outline" size={13} color={C.muted} />
                                            <Text style={ss.salaryItemText}>{amt}</Text>
                                        </View>
                                        {instituteName(s) !== '—' && (
                                            <View style={ss.salaryItem}>
                                                <Ionicons name="business-outline" size={13} color={C.muted} />
                                                <Text style={ss.salaryItemText}>{instituteName(s)}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {!paid && (
                                        <TouchableOpacity style={ss.markPaidBtn} onPress={() => markPaid(s)}>
                                            <Ionicons name="checkmark-circle-outline" size={15} color={C.green} />
                                            <Text style={ss.markPaidText}>Mark as Paid</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        }}
                    />
                </View>
            )}

            {/* ──────────── TASKS (Admin = view only) ──────────── */}
            {activeTab === 'tasks' && (
                <View style={ss.flex}>
                    <View style={ss.sectionHeader}>
                        <View>
                            <Text style={ss.sectionTitle}>Task Assignments</Text>
                            <Text style={ss.sectionSub}>Assigned by institutes · Admin view only</Text>
                        </View>
                        <TouchableOpacity style={ss.outlinePill} onPress={() => setTaskFilModal(true)}>
                            <Ionicons name="options-outline" size={13} color={C.accent} />
                            <Text style={ss.outlinePillText}>Filters</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Active filter pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: sp.md, gap: 8, paddingBottom: sp.sm }} style={{ maxHeight: 44 }}>
                        <View style={ss.activePill}>
                            <Text style={ss.activePillText}>
                                {taskDateF === 'year' ? 'Full Year' : taskDateF === 'month' ? 'This Month' : 'Today'}
                            </Text>
                        </View>
                        {taskStatusF ? <View style={ss.activePill}><Text style={ss.activePillText}>{taskStatusF === 'inprogress' ? 'In Progress' : taskStatusF.charAt(0).toUpperCase() + taskStatusF.slice(1)}</Text></View> : null}
                        {taskVerifF ? <View style={ss.activePill}><Text style={ss.activePillText}>{taskVerifF.replace('_', ' ')}</Text></View> : null}
                    </ScrollView>

                    <FlatList
                        data={staffList}
                        keyExtractor={i => i._id}
                        contentContainerStyle={ss.listPad}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.accent} />}
                        ListEmptyComponent={<EmptyState icon="people-outline" title="No staff found" />}
                        renderItem={({ item: s, index }) => {
                            const st = getStaffTasks(s);
                            const as = assigned(st);
                            const slf = selfTasks(st);
                            const pend = as.filter(t => (t.status || 'pending') === 'pending').length;
                            const inp = as.filter(t => t.status === 'inprogress').length;
                            const done = as.filter(t => t.status === 'done').length;
                            const selfDone = slf.length;
                            return (
                                <View style={ss.card}>
                                    {/* Staff header row */}
                                    <View style={ss.cardRow}>
                                        <View style={ss.srCircle}><Text style={ss.srText}>{index + 1}</Text></View>
                                        <Avatar name={s.name} size={36} />
                                        <View style={ss.flex}>
                                            <Text style={ss.cardName}>{s.name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Ionicons name="business-outline" size={10} color={C.muted} />
                                                <Text style={ss.cardEmail}>{instituteName(s)}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity style={ss.eyeBtn} onPress={() => setStaffTaskModal({ staff: s, tasks: st })}>
                                            <Ionicons name="eye-outline" size={17} color={C.accent} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Assigned counts */}
                                    <Text style={ss.taskGroupLabel}>Assigned Tasks</Text>
                                    <View style={ss.countRow}>
                                        <TaskCount label="Pending" val={pend} activeColor={C.red} activeBg={C.redLight} activeBorder="#fca5a5" />
                                        <TaskCount label="In Progress" val={inp} activeColor={C.amber} activeBg={C.amberLight} activeBorder="#fde68a" />
                                        <TaskCount label="Completed" val={done} activeColor={C.green} activeBg={C.greenLight} activeBorder="#86efac" />
                                    </View>

                                    {/* Self tasks */}
                                    <Text style={ss.taskGroupLabel}>Not Assigned (Self)</Text>
                                    <View style={ss.countRow}>
                                        <TaskCount label="Completed" val={selfDone} activeColor={C.green} activeBg={C.greenLight} activeBorder="#86efac" />
                                    </View>
                                </View>
                            );
                        }}
                    />

                    {/* Staff Task Detail Modal */}
                    <Modal visible={!!staffTaskModal} transparent animationType="slide" onRequestClose={() => setStaffTaskModal(null)}>
                        <View style={ss.overlay}>
                            <View style={ss.sheet}>
                                <View style={ss.sheetHandle} />
                                <View style={ss.sheetHeader}>
                                    <View>
                                        <Text style={ss.sheetTitle}>{staffTaskModal?.staff?.name}'s Tasks</Text>
                                        <Text style={ss.sheetSub}>{staffTaskModal?.tasks?.length || 0} tasks total</Text>
                                    </View>
                                    <TouchableOpacity style={ss.closeBtn} onPress={() => setStaffTaskModal(null)}>
                                        <Ionicons name="close" size={20} color={C.sub} />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={staffTaskModal?.tasks || []}
                                    keyExtractor={(t, i) => String(t.id || t._id || i)}
                                    contentContainerStyle={{ padding: sp.md, paddingBottom: 40 }}
                                    ListEmptyComponent={
                                        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                                            <Ionicons name="checkbox-outline" size={40} color={C.border} />
                                            <Text style={{ marginTop: 12, fontSize: fz.sm, color: C.muted, fontWeight: '600', textAlign: 'center' }}>
                                                No tasks yet{'\n'}Tasks are assigned by the Institute
                                            </Text>
                                        </View>
                                    }
                                    renderItem={({ item: t }) => {
                                        const pMap = { High: { bg: C.redLight, c: C.red }, Medium: { bg: C.amberLight, c: C.amber }, Low: { bg: C.greenLight, c: C.green } };
                                        const sMap = { pending: { bg: '#f1f5f9', c: C.muted }, inprogress: { bg: C.amberLight, c: C.amber }, done: { bg: C.greenLight, c: C.green } };
                                        const pc = pMap[t.priority] || pMap.Medium;
                                        const sc = sMap[t.status] || sMap.pending;
                                        return (
                                            <View style={[ss.card, { marginBottom: sp.sm }]}>
                                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                                    <Badge label={t.priority || 'Medium'} bg={pc.bg} color={pc.c} />
                                                    <Badge label={t.status === 'inprogress' ? 'In Progress' : (t.status || 'Pending')} bg={sc.bg} color={sc.c} />
                                                    {t.isSelfCreated && <Badge label="Self" bg={C.greenLight} color={C.green} />}
                                                </View>
                                                <Text style={{ fontSize: fz.sm, fontWeight: '700', color: C.text, marginBottom: 4 }}>{t.title}</Text>
                                                {t.due && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Ionicons name="calendar-outline" size={12} color={C.muted} />
                                                        <Text style={{ fontSize: fz.xs, color: C.muted, fontWeight: '600' }}>Due: {t.due}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        </View>
                    </Modal>
                </View>
            )}

            {/* ──────────── INSTITUTE FILTER MODAL ──────────── */}
            <Modal visible={instModal} transparent animationType="slide" onRequestClose={() => setInstModal(false)}>
                <View style={ss.overlay}>
                    <View style={ss.sheet}>
                        <View style={ss.sheetHandle} />
                        <View style={ss.sheetHeader}>
                            <Text style={ss.sheetTitle}>Filter by Institute</Text>
                            <TouchableOpacity style={ss.closeBtn} onPress={() => setInstModal(false)}>
                                <Ionicons name="close" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            {[{ _id: 'All', name: 'All Institutes' }, ...institutes].map(inst => {
                                const sel = instFilter === inst._id;
                                return (
                                    <TouchableOpacity key={inst._id} style={[ss.modalOption, sel && ss.modalOptionActive]} onPress={() => { setInstFilter(inst._id); setInstModal(false); }}>
                                        <Ionicons name={inst._id === 'All' ? 'globe-outline' : 'business-outline'} size={16} color={sel ? C.accent : C.muted} />
                                        <Text style={[ss.modalOptionText, sel && { color: C.accent, fontWeight: '800' }]}>{inst.name}</Text>
                                        {sel && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ──────────── TASK FILTER MODAL ──────────── */}
            <Modal visible={taskFilModal} transparent animationType="slide" onRequestClose={() => setTaskFilModal(false)}>
                <View style={ss.overlay}>
                    <View style={ss.sheet}>
                        <View style={ss.sheetHandle} />
                        <View style={ss.sheetHeader}>
                            <Text style={ss.sheetTitle}>Task Filters</Text>
                            <TouchableOpacity style={ss.closeBtn} onPress={() => setTaskFilModal(false)}>
                                <Ionicons name="close" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: sp.md, paddingBottom: 40 }}>
                            <FilterSection label="Date Range">
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {[{ k: 'year', l: 'Full Year' }, { k: 'month', l: 'This Month' }, { k: 'today', l: 'Today' }].map(d => (
                                        <TouchableOpacity key={d.k} style={[ss.pill, taskDateF === d.k && ss.pillActive]} onPress={() => setTaskDateF(d.k)}>
                                            <Text style={[ss.pillText, taskDateF === d.k && ss.pillTextActive]}>{d.l}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </FilterSection>

                            <FilterSection label="Status">
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {[{ k: '', l: 'All' }, { k: 'pending', l: 'Pending' }, { k: 'inprogress', l: 'In Progress' }, { k: 'done', l: 'Done' }].map(s => (
                                        <TouchableOpacity key={s.k} style={[ss.pill, taskStatusF === s.k && ss.pillActive]} onPress={() => setTaskStatusF(s.k)}>
                                            <Text style={[ss.pillText, taskStatusF === s.k && ss.pillTextActive]}>{s.l}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </FilterSection>

                            <FilterSection label="Verification">
                                {[{ k: '', l: 'All Verifications' }, { k: 'approved', l: 'Approved' }, { k: 'rejected', l: 'Rejected' }, { k: 'needs_revision', l: 'Needs Revision' }, { k: 'under_verification', l: 'Under Verification' }].map(v => (
                                    <TouchableOpacity key={v.k} style={[ss.modalOption, taskVerifF === v.k && ss.modalOptionActive]} onPress={() => setTaskVerifF(v.k)}>
                                        <Text style={[ss.modalOptionText, taskVerifF === v.k && { color: C.accent, fontWeight: '800' }]}>{v.l}</Text>
                                        {taskVerifF === v.k && <Ionicons name="checkmark-circle" size={16} color={C.accent} />}
                                    </TouchableOpacity>
                                ))}
                            </FilterSection>

                            <TouchableOpacity style={ss.saveBtn} onPress={() => setTaskFilModal(false)}>
                                <Text style={ss.saveBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

/* ── Tiny sub-components ── */
const Chip = ({ icon, label, color, bg }) => (
    <View style={[ss.chip, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={10} color={color} />
        <Text style={[ss.chipText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
);

const TaskCount = ({ label, val, activeColor, activeBg, activeBorder }) => {
    const active = val > 0;
    return (
        <View style={[ss.countBadge, { backgroundColor: active ? activeBg : '#f1f5f9', borderColor: active ? activeBorder : C.border }]}>
            <Text style={[ss.countBadgeText, { color: active ? activeColor : C.muted }]}>{label}: {val}</Text>
        </View>
    );
};

const FilterSection = ({ label, children }) => (
    <View style={{ marginBottom: sp.md }}>
        <Text style={ss.filterSectionLabel}>{label}</Text>
        {children}
    </View>
);

/* ══════════════════════════════════════════
   STYLES
══════════════════════════════════════════ */
const ss = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    flex: { flex: 1 },

    /* Tab bar */
    tabRow: { flexDirection: 'row', backgroundColor: C.card, paddingHorizontal: sp.md, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: C.border },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: r.md, backgroundColor: 'transparent' },
    tabActive: { backgroundColor: C.text },
    tabLabel: { fontSize: 10, fontWeight: '700', color: C.muted },
    tabLabelActive: { color: C.white, fontSize: 10 },

    /* Tool row */
    toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: sp.md, marginTop: sp.md, marginBottom: 6 },
    searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, paddingHorizontal: 12, height: 44, borderRadius: r.md, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, fontSize: fz.sm, color: C.text, padding: 0 },
    iconBtn: { width: 44, height: 44, backgroundColor: C.card, borderRadius: r.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    countLabel: { fontSize: 10, fontWeight: '700', color: C.muted, paddingHorizontal: sp.md, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

    /* Card */
    listPad: { paddingHorizontal: sp.md, paddingBottom: 32 },
    card: { backgroundColor: C.card, borderRadius: r.lg, padding: sp.md, marginBottom: 10, borderWidth: 1, borderColor: C.borderLight, ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 } }) },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    cardName: { fontSize: fz.sm, fontWeight: '800', color: C.text, marginBottom: 2 },
    cardEmail: { fontSize: fz.xs, color: C.muted, fontWeight: '500' },

    /* Avatar */
    avatar: { alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: C.white, fontWeight: '900' },

    /* Badge */
    badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: r.full },
    badgeText: { fontSize: 10, fontWeight: '800' },

    /* Chips */
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: r.full },
    chipText: { fontSize: 10, fontWeight: '700' },

    /* Toggle */
    toggle: { width: 40, height: 22, borderRadius: 11, justifyContent: 'center', paddingHorizontal: 3 },
    toggleDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.white },

    /* Action buttons */
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 34, borderRadius: r.sm },
    actionBtnText: { fontSize: fz.xs, fontWeight: '700' },

    /* Attendance */
    dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: sp.md, marginBottom: sp.sm, backgroundColor: C.card, borderRadius: r.md, padding: 10, borderWidth: 1, borderColor: C.border },
    dateNavBtn: { padding: 6 },
    dateNavMid: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateNavText: { fontSize: fz.sm, fontWeight: '800', color: C.text },
    statusRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    statusBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: r.sm, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
    statusBtnText: { fontSize: 10, fontWeight: '800', color: C.sub },
    timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    timeField: { flex: 1 },
    timeLabel: { fontSize: 9, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
    timeInput: { height: 38, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.sm, paddingHorizontal: 10, fontSize: fz.xs, color: C.text },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, paddingHorizontal: sp.md, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1, borderTopColor: C.border },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, height: 50, borderRadius: r.md },
    saveBtnText: { fontSize: fz.md, fontWeight: '800', color: C.white },

    /* Salary */
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingVertical: 12 },
    sectionTitle: { fontSize: fz.md, fontWeight: '900', color: C.text },
    sectionSub: { fontSize: fz.xs, color: C.muted, fontWeight: '600', marginTop: 2 },
    outlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: r.full, borderWidth: 1.5, borderColor: C.accent, backgroundColor: C.accentLight },
    outlinePillText: { fontSize: fz.xs, fontWeight: '700', color: C.accent },
    salaryInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
    salaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    salaryItemText: { fontSize: fz.xs, fontWeight: '700', color: C.text },
    markPaidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: r.sm, borderWidth: 1.5, borderColor: C.green, backgroundColor: C.greenLight },
    markPaidText: { fontSize: fz.xs, fontWeight: '800', color: C.green },

    /* Tasks */
    activePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: r.full, backgroundColor: C.accent },
    activePillText: { fontSize: 10, fontWeight: '800', color: C.white },
    srCircle: { width: 22, height: 22, borderRadius: 6, backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center' },
    srText: { fontSize: 10, fontWeight: '900', color: C.accent },
    eyeBtn: { width: 36, height: 36, borderRadius: r.sm, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentLight },
    taskGroupLabel: { fontSize: 9, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    countBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: r.full, borderWidth: 1.5 },
    countBadgeText: { fontSize: 10, fontWeight: '900' },

    /* Modals */
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, maxHeight: '85%', paddingBottom: 8 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginVertical: 12 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    sheetTitle: { fontSize: fz.md, fontWeight: '900', color: C.text },
    sheetSub: { fontSize: fz.xs, color: C.muted, fontWeight: '600', marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
    modalOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: sp.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    modalOptionActive: { backgroundColor: C.accentLight },
    modalOptionText: { flex: 1, fontSize: fz.sm, fontWeight: '600', color: C.text },

    /* Filter pills in modal */
    pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: r.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
    pillActive: { backgroundColor: C.accent, borderColor: C.accent },
    pillText: { fontSize: fz.xs, fontWeight: '700', color: C.sub },
    pillTextActive: { color: C.white },
    filterSectionLabel: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
});

export default StaffScreen;
