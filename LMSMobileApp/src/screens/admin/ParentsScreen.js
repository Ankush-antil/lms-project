import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Alert, ScrollView, Modal, Platform, Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { AppHeader, EmptyState, LoadingScreen } from '../../components/common/UIComponents';

/* ── Design Tokens ── */
const C = {
    bg: '#f8fafc', card: '#ffffff', text: '#0f172a', sub: '#475569',
    muted: '#94a3b8', border: '#e2e8f0', borderLight: '#f1f5f9',
    accent: '#0f172a', indigo: '#6366f1', indigoLight: '#eef2ff',
    green: '#10b981', greenLight: '#ecfdf5',
    red: '#ef4444', redLight: '#fef2f2',
    pink: '#f43f5e', pinkLight: '#fff1f2', white: '#ffffff',
    amber: '#f59e0b', amberLight: '#fffbeb',
};
const sp = { xs: 4, sm: 8, md: 16, lg: 24 };
const fz = { xs: 11, sm: 13, md: 15, lg: 18 };
const r = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

const PAGE_SIZE = 20;

// Default Parent Feature Controls (same as web)
const DEFAULT_PARENT_CONTROLS = {
    dashboard:  { enabled: true, mode: 'hide', note: '' },
    studentFee: { enabled: true, mode: 'hide', note: '' },
    attendance: { enabled: true, mode: 'hide', note: '' },
    activities: { enabled: true, mode: 'hide', note: '' },
};

const CONTROL_LABELS = {
    dashboard:  'Dashboard',
    studentFee: 'Student Fee Portal',
    attendance: 'Attendance',
    activities: 'Activities',
};

const ALL_ROLES = ['Student', 'Teacher', 'Editor', 'Accountant', 'Marketer', 'Staff', 'Parent'];

/* ══════════════════════════════
   MAIN SCREEN
══════════════════════════════ */
const ParentsScreen = ({ navigation }) => {
    const [parents, setParents] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter & Search
    const [search, setSearch] = useState('');
    const [instFilter, setInstFilter] = useState('All');
    const [instModal, setInstModal] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);

    // Edit modal
    const [editModal, setEditModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [editSaving, setEditSaving] = useState(false);

    // Edit form fields
    const [fName, setFName] = useState('');
    const [fEmail, setFEmail] = useState('');
    const [fMobile, setFMobile] = useState('');
    const [fInstitute, setFInstitute] = useState('');
    const [fStudent, setFStudent] = useState('');
    const [fPassword, setFPassword] = useState('');
    const [fRoles, setFRoles] = useState([]);
    const [fControls, setFControls] = useState(DEFAULT_PARENT_CONTROLS);

    // Student picker inside edit modal
    const [studentSearch, setStudentSearch] = useState('');
    const [showStudentPicker, setShowStudentPicker] = useState(false);
    const [showInstPicker, setShowInstPicker] = useState(false);

    /* ── Fetch ── */
    const fetchData = useCallback(async () => {
        try {
            const [pr, ir, sr] = await Promise.all([
                axios.get('/users?role=Parent'),
                axios.get('/setup/institutes'),
                axios.get('/users?role=Student'),
            ]);
            setParents(Array.isArray(pr.data) ? pr.data : pr.data?.users || []);
            setInstitutes(Array.isArray(ir.data) ? ir.data : []);
            setStudents(Array.isArray(sr.data) ? sr.data : sr.data?.users || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [search, instFilter]);

    /* ── Derived list ── */
    const filtered = parents.filter(p =>
        (instFilter === 'All' || p.institute?._id === instFilter || p.institute === instFilter) &&
        [p.name, p.email, p.parentProfile?.student?.name, p.parentProfile?.phone]
            .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    );
    const paged = filtered.slice(0, page * PAGE_SIZE);
    const hasMore = page * PAGE_SIZE < filtered.length;

    /* ── Helpers ── */
    const instName = p => p?.institute?.name || p?.instituteName || '—';
    const linkedStudent = p => p?.parentProfile?.student?.name || p?.parentProfile?.studentName || null;

    /* ── Actions ── */
    const toggleStatus = async (id, cur) => {
        const next = cur === false;
        try {
            await axios.put(`/users/${id}`, { isActive: next });
            setParents(p => p.map(x => x._id === id ? { ...x, isActive: next } : x));
        } catch { Alert.alert('Error', 'Could not update status'); }
    };

    const deleteParent = (id, name) => Alert.alert(
        'Delete Parent', `Remove "${name}"?`,
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await axios.delete(`/users/${id}`);
                    setParents(p => p.filter(x => x._id !== id));
                } catch { Alert.alert('Error', 'Could not delete'); }
            }},
        ]
    );

    const openEdit = p => {
        setEditTarget(p);
        setFName(p.name || '');
        setFEmail(p.email || '');
        setFMobile(p.mobileNumber || p.parentProfile?.phone || '');
        setFInstitute(p.institute?._id || p.institute || '');
        setFStudent(p.parentProfile?.student?._id || p.parentProfile?.student || '');
        setFPassword('');
        setFRoles(p.allowedRoles?.length ? p.allowedRoles : [p.role || 'Parent']);
        setFControls({ ...DEFAULT_PARENT_CONTROLS, ...(p.parentProfile?.controls || {}) });
        setActiveTab('basic');
        setStudentSearch('');
        setShowStudentPicker(false);
        setShowInstPicker(false);
        setEditModal(true);
    };

    const saveEdit = async () => {
        if (!fName.trim()) { Alert.alert('Error', 'Name is required'); return; }
        setEditSaving(true);
        try {
            const payload = {
                name: fName.trim(),
                email: fEmail.trim(),
                institute: fInstitute || undefined,
                mobileNumber: fMobile.trim(),
                allowedRoles: fRoles,
                parentProfile: {
                    ...editTarget.parentProfile,
                    student: fStudent || undefined,
                    controls: fControls,
                },
            };
            if (fPassword.trim()) payload.password = fPassword.trim();

            await axios.put(`/users/${editTarget._id}`, payload);
            setParents(p => p.map(x => x._id === editTarget._id
                ? { ...x, name: fName.trim(), email: fEmail.trim(), mobileNumber: fMobile.trim(),
                    parentProfile: { ...x.parentProfile, student: fStudent ? { _id: fStudent, name: students.find(s => s._id === fStudent)?.name || fStudent } : x.parentProfile?.student, controls: fControls },
                    allowedRoles: fRoles }
                : x
            ));
            setEditModal(false);
            Alert.alert('✓ Updated', 'Parent updated successfully');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Could not update');
        } finally { setEditSaving(false); }
    };

    const toggleRole = role => {
        if (role === 'Parent') return; // default, can't remove
        setFRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const toggleControl = key => {
        setFControls(prev => ({
            ...prev,
            [key]: { ...prev[key], enabled: !(prev[key]?.enabled !== false) },
        }));
    };

    if (loading) return <LoadingScreen />;

    /* ── Filtered students for picker ── */
    const filteredStudents = students.filter(s =>
        [s.name, s.email].some(v => v?.toLowerCase().includes(studentSearch.toLowerCase()))
    );

    const selectedStudentName = fStudent
        ? (students.find(s => s._id === fStudent)?.name || fStudent)
        : null;

    const selectedInstName = fInstitute
        ? (institutes.find(i => i._id === fInstitute)?.name || fInstitute)
        : null;

    /* ══════════ RENDER ══════════ */
    return (
        <View style={ss.root}>
            <AppHeader
                title="Parents"
                showBack
                rightIcon="person-add-outline"
                rightAction={() => navigation.navigate('CreateUser', { defaultRole: 'Parent' })}
            />

            {/* Sub-header */}
            <View style={ss.subHeader}>
                <View>
                    <Text style={ss.subTitle}>Parents Management</Text>
                    <Text style={ss.subDesc}>Manage parent profiles and link them to students.</Text>
                </View>
                <View style={ss.totalPill}>
                    <Text style={ss.totalPillText}>Total: {filtered.length}</Text>
                </View>
            </View>

            {/* Search + Filter */}
            <View style={ss.toolRow}>
                <View style={ss.searchWrap}>
                    <Ionicons name="search-outline" size={16} color={C.muted} />
                    <TextInput
                        style={ss.searchInput}
                        placeholder="Search by name, email, student…"
                        placeholderTextColor={C.muted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={C.muted} /></TouchableOpacity> : null}
                </View>
                <TouchableOpacity
                    style={[ss.filterBtn, instFilter !== 'All' && ss.filterBtnActive]}
                    onPress={() => setInstModal(true)}
                >
                    <Ionicons name="filter-outline" size={14} color={instFilter !== 'All' ? C.indigo : C.sub} />
                    <Text style={[ss.filterBtnText, instFilter !== 'All' && { color: C.indigo }]} numberOfLines={1}>
                        {instFilter === 'All' ? 'All Institutes' : (institutes.find(i => i._id === instFilter)?.name || 'Filtered')}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={C.muted} />
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={paged}
                keyExtractor={i => i._id}
                contentContainerStyle={ss.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.indigo} />}
                ListEmptyComponent={<EmptyState icon="people-outline" title="No parents found" subtitle={search || instFilter !== 'All' ? 'Try adjusting your filters' : 'Add a parent to get started'} />}
                ListFooterComponent={
                    hasMore ? (
                        <TouchableOpacity style={ss.seeMoreBtn} onPress={() => setPage(p => p + 1)}>
                            <Ionicons name="add-circle-outline" size={18} color={C.indigo} />
                            <Text style={ss.seeMoreText}>See More ({filtered.length - paged.length} remaining)</Text>
                        </TouchableOpacity>
                    ) : filtered.length > PAGE_SIZE ? (
                        <Text style={ss.showingText}>Showing {paged.length} of {filtered.length} parents</Text>
                    ) : null
                }
                renderItem={({ item: p }) => {
                    const student = linkedStudent(p);
                    const active = p.isActive !== false;
                    const phone = p.mobileNumber || p.parentProfile?.phone || 'N/A';
                    return (
                        <View style={ss.card}>
                            <View style={ss.cardRow}>
                                <View style={ss.avatar}>
                                    <Text style={ss.avatarText}>{(p.name?.[0] || '?').toUpperCase()}</Text>
                                </View>
                                <View style={ss.cardInfo}>
                                    <Text style={ss.cardName}>{p.name}</Text>
                                    <Text style={ss.cardEmail} numberOfLines={1}>{p.email}</Text>
                                </View>
                                <TouchableOpacity style={[ss.toggle, { backgroundColor: active ? C.green : C.border }]} onPress={() => toggleStatus(p._id, p.isActive)}>
                                    <View style={[ss.toggleDot, { transform: [{ translateX: active ? 14 : 0 }] }]} />
                                </TouchableOpacity>
                            </View>

                            <View style={ss.detailRow}>
                                <View style={ss.detailItem}>
                                    <Ionicons name="call-outline" size={12} color={C.muted} />
                                    <Text style={ss.detailText}>{phone}</Text>
                                </View>
                                <View style={ss.detailItem}>
                                    <Ionicons name="person-outline" size={12} color={student ? C.indigo : C.muted} />
                                    <Text style={[ss.detailText, !student && { color: C.red, fontWeight: '700' }]}>
                                        {student || 'No student linked'}
                                    </Text>
                                </View>
                                {instName(p) !== '—' && (
                                    <View style={ss.detailItem}>
                                        <Ionicons name="business-outline" size={12} color={C.muted} />
                                        <Text style={ss.detailText} numberOfLines={1}>{instName(p)}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={ss.actionRow}>
                                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.indigoLight }]} onPress={() => openEdit(p)}>
                                    <Ionicons name="create-outline" size={14} color={C.indigo} />
                                    <Text style={[ss.actionBtnText, { color: C.indigo }]}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.redLight }]} onPress={() => deleteParent(p._id, p.name)}>
                                    <Ionicons name="trash-outline" size={14} color={C.red} />
                                    <Text style={[ss.actionBtnText, { color: C.red }]}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[ss.actionBtn, { flex: 1.5, backgroundColor: C.borderLight }]} onPress={() => navigation.navigate('UserDetail', { userId: p._id })}>
                                    <Ionicons name="eye-outline" size={14} color={C.sub} />
                                    <Text style={[ss.actionBtnText, { color: C.sub }]}>View Profile</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />

            {/* ══════════════ EDIT MODAL ══════════════ */}
            <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
                <View style={ss.overlay}>
                    <View style={ss.editSheet}>
                        {/* Gradient-style header (dark navy with pink accent) */}
                        <View style={ss.editHeader}>
                            <View>
                                <Text style={ss.editTitle}>Edit Parent: {editTarget?.name}</Text>
                            </View>
                            <TouchableOpacity style={ss.editCloseBtn} onPress={() => setEditModal(false)}>
                                <Text style={{ color: C.white, fontSize: 18, fontWeight: '700' }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={ss.editTabRow}>
                            {['basic', 'controls'].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[ss.editTab, activeTab === t && ss.editTabActive]}
                                    onPress={() => setActiveTab(t)}
                                >
                                    <Text style={[ss.editTabText, activeTab === t && ss.editTabTextActive]}>
                                        {t === 'basic' ? 'Basic Info' : 'Feature Controls'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Tab Content */}
                        <ScrollView contentContainerStyle={ss.editBody} showsVerticalScrollIndicator={false}>

                            {/* ── BASIC INFO TAB ── */}
                            {activeTab === 'basic' && (
                                <View>
                                    {/* Row: Full Name + Institute */}
                                    <View style={ss.formRow}>
                                        <View style={ss.formHalf}>
                                            <Text style={ss.fieldLabel}>FULL NAME</Text>
                                            <TextInput style={ss.fieldInput} value={fName} onChangeText={setFName} placeholder="Parent name" placeholderTextColor={C.muted} />
                                        </View>
                                        <View style={ss.formHalf}>
                                            <Text style={ss.fieldLabel}>INSTITUTE</Text>
                                            <TouchableOpacity style={ss.fieldInput} onPress={() => setShowInstPicker(true)}>
                                                <Text style={{ fontSize: fz.sm, color: selectedInstName ? C.text : C.muted, fontWeight: selectedInstName ? '700' : '400' }}>
                                                    {selectedInstName || 'Select Institute'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Row: Email + Mobile */}
                                    <View style={ss.formRow}>
                                        <View style={ss.formHalf}>
                                            <Text style={ss.fieldLabel}>EMAIL ADDRESS</Text>
                                            <TextInput style={ss.fieldInput} value={fEmail} onChangeText={setFEmail} placeholder="email@example.com" placeholderTextColor={C.muted} keyboardType="email-address" autoCapitalize="none" />
                                        </View>
                                        <View style={ss.formHalf}>
                                            <Text style={ss.fieldLabel}>MOBILE NUMBER</Text>
                                            <TextInput style={ss.fieldInput} value={fMobile} onChangeText={setFMobile} placeholder="+91 98765…" placeholderTextColor={C.muted} keyboardType="phone-pad" />
                                        </View>
                                    </View>

                                    {/* Linked Student */}
                                    <Text style={ss.fieldLabel}>LINKED STUDENT</Text>
                                    <TouchableOpacity style={[ss.fieldInput, { marginBottom: sp.md }]} onPress={() => setShowStudentPicker(true)}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: fz.sm, color: selectedStudentName ? C.text : C.muted, fontWeight: selectedStudentName ? '700' : '400' }}>
                                                {selectedStudentName || 'Select Enrolled Student'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={14} color={C.muted} />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Assign Other Role */}
                                    <Text style={ss.fieldLabel}>ASSIGN OTHER ROLE</Text>
                                    <View style={ss.roleBox}>
                                        {ALL_ROLES.map(role => {
                                            const isDefault = role === 'Parent';
                                            const checked = fRoles.includes(role);
                                            return (
                                                <TouchableOpacity
                                                    key={role}
                                                    style={ss.roleItem}
                                                    onPress={() => !isDefault && toggleRole(role)}
                                                    activeOpacity={isDefault ? 1 : 0.7}
                                                >
                                                    <View style={[ss.checkbox, checked && ss.checkboxActive]}>
                                                        {checked && <Ionicons name="checkmark" size={11} color={C.white} />}
                                                    </View>
                                                    <Text style={[ss.roleText, isDefault && { fontWeight: '800' }]}>{role}</Text>
                                                    {isDefault && (
                                                        <View style={ss.defaultBadge}>
                                                            <Text style={ss.defaultBadgeText}>Default</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Password */}
                                    <Text style={[ss.fieldLabel, { marginTop: sp.md }]}>UPDATE PASSWORD (OPTIONAL)</Text>
                                    <TextInput
                                        style={[ss.fieldInput, { marginBottom: sp.lg }]}
                                        value={fPassword}
                                        onChangeText={setFPassword}
                                        placeholder="Leave blank to keep current"
                                        placeholderTextColor={C.muted}
                                        secureTextEntry
                                    />
                                </View>
                            )}

                            {/* ── FEATURE CONTROLS TAB ── */}
                            {activeTab === 'controls' && (
                                <View>
                                    <Text style={ss.controlsHint}>
                                        Toggle which pages/features this parent can access.
                                    </Text>
                                    {Object.keys(DEFAULT_PARENT_CONTROLS).map(key => {
                                        const ctrl = fControls[key] || DEFAULT_PARENT_CONTROLS[key];
                                        const enabled = ctrl.enabled !== false;
                                        return (
                                            <View key={key} style={ss.controlRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={ss.controlLabel}>{CONTROL_LABELS[key] || key}</Text>
                                                    {ctrl.note ? <Text style={ss.controlNote}>{ctrl.note}</Text> : null}
                                                </View>
                                                <Switch
                                                    value={enabled}
                                                    onValueChange={() => toggleControl(key)}
                                                    trackColor={{ false: C.border, true: C.indigo }}
                                                    thumbColor={C.white}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Save Button */}
                            <TouchableOpacity style={[ss.saveBtn, editSaving && { opacity: 0.7 }]} onPress={saveEdit} disabled={editSaving}>
                                {editSaving
                                    ? <ActivityIndicator size="small" color={C.white} />
                                    : <>
                                        <Ionicons name="save-outline" size={18} color={C.white} />
                                        <Text style={ss.saveBtnText}>Update Details</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Student Picker Modal ── */}
            <Modal visible={showStudentPicker} transparent animationType="slide" onRequestClose={() => setShowStudentPicker(false)}>
                <View style={ss.overlay}>
                    <View style={ss.sheet}>
                        <View style={ss.sheetHandle} />
                        <View style={ss.sheetHeader}>
                            <Text style={ss.sheetTitle}>Select Student</Text>
                            <TouchableOpacity style={ss.closeBtn} onPress={() => setShowStudentPicker(false)}>
                                <Ionicons name="close" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                        <View style={[ss.searchWrap, { marginHorizontal: sp.md, marginBottom: sp.sm }]}>
                            <Ionicons name="search-outline" size={14} color={C.muted} />
                            <TextInput style={ss.searchInput} placeholder="Search students…" placeholderTextColor={C.muted} value={studentSearch} onChangeText={setStudentSearch} />
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            <TouchableOpacity style={[ss.instOption, !fStudent && ss.instOptionActive]} onPress={() => { setFStudent(''); setShowStudentPicker(false); }}>
                                <Text style={[ss.instOptionText, !fStudent && { color: C.indigo, fontWeight: '800' }]}>— None (unlink) —</Text>
                                {!fStudent && <Ionicons name="checkmark-circle" size={16} color={C.indigo} />}
                            </TouchableOpacity>
                            {filteredStudents.map(s => (
                                <TouchableOpacity key={s._id} style={[ss.instOption, fStudent === s._id && ss.instOptionActive]} onPress={() => { setFStudent(s._id); setShowStudentPicker(false); }}>
                                    <View>
                                        <Text style={[ss.instOptionText, fStudent === s._id && { color: C.indigo, fontWeight: '800' }]}>{s.name}</Text>
                                        <Text style={{ fontSize: fz.xs, color: C.muted }}>{s.email}</Text>
                                    </View>
                                    {fStudent === s._id && <Ionicons name="checkmark-circle" size={16} color={C.indigo} />}
                                </TouchableOpacity>
                            ))}
                            {filteredStudents.length === 0 && (
                                <Text style={{ textAlign: 'center', color: C.muted, padding: 24, fontWeight: '600' }}>No students found</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Institute Picker Modal (inside edit) ── */}
            <Modal visible={showInstPicker} transparent animationType="slide" onRequestClose={() => setShowInstPicker(false)}>
                <View style={ss.overlay}>
                    <View style={ss.sheet}>
                        <View style={ss.sheetHandle} />
                        <View style={ss.sheetHeader}>
                            <Text style={ss.sheetTitle}>Select Institute</Text>
                            <TouchableOpacity style={ss.closeBtn} onPress={() => setShowInstPicker(false)}>
                                <Ionicons name="close" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            {institutes.map(inst => (
                                <TouchableOpacity key={inst._id} style={[ss.instOption, fInstitute === inst._id && ss.instOptionActive]} onPress={() => { setFInstitute(inst._id); setShowInstPicker(false); }}>
                                    <Ionicons name="business-outline" size={15} color={fInstitute === inst._id ? C.indigo : C.muted} />
                                    <Text style={[ss.instOptionText, fInstitute === inst._id && { color: C.indigo, fontWeight: '800' }]}>{inst.name}</Text>
                                    {fInstitute === inst._id && <Ionicons name="checkmark-circle" size={16} color={C.indigo} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Institute Filter Modal ── */}
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
                                    <TouchableOpacity key={inst._id} style={[ss.instOption, sel && ss.instOptionActive]} onPress={() => { setInstFilter(inst._id); setInstModal(false); }}>
                                        <Ionicons name={inst._id === 'All' ? 'globe-outline' : 'business-outline'} size={15} color={sel ? C.indigo : C.muted} />
                                        <Text style={[ss.instOptionText, sel && { color: C.indigo, fontWeight: '800' }]}>{inst.name}</Text>
                                        {sel && <Ionicons name="checkmark-circle" size={16} color={C.indigo} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

/* ══════════════════════════════
   STYLES
══════════════════════════════ */
const ss = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    subHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingTop: 14, paddingBottom: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    subTitle: { fontSize: fz.md, fontWeight: '900', color: C.text, marginBottom: 2 },
    subDesc: { fontSize: fz.xs, color: C.muted, fontWeight: '500', maxWidth: 220 },
    totalPill: { backgroundColor: C.borderLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: r.full, marginTop: 2 },
    totalPillText: { fontSize: fz.xs, fontWeight: '800', color: C.sub },

    toolRow: { paddingHorizontal: sp.md, paddingVertical: sp.sm, gap: 8, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, height: 42 },
    searchInput: { flex: 1, fontSize: fz.sm, color: C.text, padding: 0 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: C.bg },
    filterBtnActive: { borderColor: C.indigo, backgroundColor: C.indigoLight },
    filterBtnText: { fontSize: fz.xs, fontWeight: '700', color: C.sub, maxWidth: 130 },

    list: { padding: sp.md, paddingBottom: 40 },
    card: { backgroundColor: C.card, borderRadius: r.lg, padding: sp.md, marginBottom: 10, borderWidth: 1, borderColor: C.borderLight, ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 } }) },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: fz.lg, fontWeight: '900', color: C.white },
    cardInfo: { flex: 1 },
    cardName: { fontSize: fz.sm, fontWeight: '800', color: C.text, marginBottom: 2 },
    cardEmail: { fontSize: fz.xs, color: C.muted, fontWeight: '500' },
    toggle: { width: 40, height: 22, borderRadius: 11, justifyContent: 'center', paddingHorizontal: 3 },
    toggleDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.white },
    detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingHorizontal: 2 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: fz.xs, color: C.sub, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 34, borderRadius: r.sm },
    actionBtnText: { fontSize: 11, fontWeight: '700' },

    seeMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, borderRadius: r.md, borderWidth: 1.5, borderColor: C.indigo, backgroundColor: C.indigoLight },
    seeMoreText: { fontSize: fz.sm, fontWeight: '800', color: C.indigo },
    showingText: { textAlign: 'center', fontSize: fz.xs, color: C.muted, fontWeight: '600', paddingVertical: 12 },

    /* ── Edit Modal ── */
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    editSheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, maxHeight: '92%', overflow: 'hidden' },
    editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingVertical: 18, paddingTop: 22, backgroundColor: '#1e1b4b' },
    editTitle: { fontSize: fz.md, fontWeight: '900', color: C.white },
    editCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

    editTabRow: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingHorizontal: sp.md },
    editTab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    editTabActive: { borderBottomColor: C.indigo },
    editTabText: { fontSize: fz.sm, fontWeight: '700', color: C.muted },
    editTabTextActive: { color: C.indigo },

    editBody: { padding: sp.md, paddingBottom: 40 },

    /* Form fields */
    formRow: { flexDirection: 'row', gap: sp.sm, marginBottom: sp.sm },
    formHalf: { flex: 1 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    fieldInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: fz.sm, color: C.text, fontWeight: '600', marginBottom: sp.md, justifyContent: 'center' },

    /* Role selection */
    roleBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, padding: 12, marginBottom: sp.md },
    roleItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    checkbox: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
    checkboxActive: { backgroundColor: C.indigo, borderColor: C.indigo },
    roleText: { fontSize: fz.xs, fontWeight: '600', color: C.text },
    defaultBadge: { backgroundColor: C.indigoLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: r.full },
    defaultBadgeText: { fontSize: 9, fontWeight: '800', color: C.indigo },

    /* Controls */
    controlsHint: { fontSize: fz.xs, color: C.muted, fontWeight: '600', marginBottom: sp.md },
    controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    controlLabel: { fontSize: fz.sm, fontWeight: '700', color: C.text },
    controlNote: { fontSize: fz.xs, color: C.muted, marginTop: 2 },

    /* Save button */
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, height: 52, borderRadius: r.md, marginTop: 8 },
    saveBtnText: { fontSize: fz.md, fontWeight: '800', color: C.white },

    /* Bottom sheet */
    sheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, maxHeight: '80%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginVertical: 12 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    sheetTitle: { fontSize: fz.md, fontWeight: '900', color: C.text },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
    instOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: sp.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    instOptionActive: { backgroundColor: C.indigoLight },
    instOptionText: { flex: 1, fontSize: fz.sm, fontWeight: '600', color: C.text },
});

export default ParentsScreen;
