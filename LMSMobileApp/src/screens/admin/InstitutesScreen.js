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
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    sub: '#475569',
    muted: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    accent: '#0f172a',
    indigo: '#6366f1',
    indigoLight: '#eef2ff',
    green: '#10b981',
    greenLight: '#ecfdf5',
    red: '#ef4444',
    redLight: '#fef2f2',
    amber: '#f59e0b',
    amberLight: '#fffbeb',
    white: '#ffffff',
};
const sp = { xs: 4, sm: 8, md: 16, lg: 24 };
const fz = { xs: 11, sm: 13, md: 15, lg: 18 };
const r = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

const DEFAULT_CONTROLS = {
    dashboard: { show: true, application: true, staffRequest: true },
    student:   { show: true, admissionOpen: true, addStudent: true, editStudent: true, dailyAttendanceLog: true, feeManagement: true, studentDirectory: true },
    teacher:   { show: true, hiring: true, addTeacher: true, editTeacher: true, teacherDirectory: true, dailyAttendanceLog: true },
    editor:    { show: true, hiring: true, addEditor: true, editEditor: true },
    accountant:{ show: true, addAccountant: true, editAccountant: true },
    staff:     { show: true, addStaff: true, staffDirectory: true, attendanceManagement: true, salaryPayouts: true },
    parent:    { show: true, addParent: true, editParent: true },
    course:    { show: true, addCourse: true, editCourse: true },
    chat:      { show: true },
};

const CONTROL_SECTIONS = [
    { id: 'dashboard', label: 'Dashboard Page', sub: [
        { key: 'application', label: 'Approve Pending Applications' },
        { key: 'staffRequest', label: 'Approve Staff Work/Hiring Requests' },
    ]},
    { id: 'student', label: 'Student Management', sub: [
        { key: 'admissionOpen', label: 'Admission Status On/Off' },
        { key: 'addStudent', label: 'Register New Student' },
        { key: 'editStudent', label: 'Edit Student Details' },
        { key: 'dailyAttendanceLog', label: 'Log Daily Attendance' },
        { key: 'feeManagement', label: 'Manage Fee Invoices' },
        { key: 'studentDirectory', label: 'Browse Student Directory' },
    ]},
    { id: 'teacher', label: 'Teacher Management', sub: [
        { key: 'hiring', label: 'Teacher Hiring Open/Off' },
        { key: 'addTeacher', label: 'Register New Teacher' },
        { key: 'editTeacher', label: 'Edit Teacher Details' },
        { key: 'teacherDirectory', label: 'Browse Teacher Directory' },
        { key: 'dailyAttendanceLog', label: 'Log Teacher Attendance' },
    ]},
    { id: 'editor', label: 'Editor Management', sub: [
        { key: 'hiring', label: 'Editor Hiring Open/Off' },
        { key: 'addEditor', label: 'Register New Editor' },
        { key: 'editEditor', label: 'Edit Editor Details' },
    ]},
    { id: 'accountant', label: 'Accountant Management', sub: [
        { key: 'addAccountant', label: 'Register New Accountant' },
        { key: 'editAccountant', label: 'Edit Accountant Details' },
    ]},
    { id: 'staff', label: 'Staff Management', sub: [
        { key: 'addStaff', label: 'Register New Staff' },
        { key: 'staffDirectory', label: 'Browse Staff Directory' },
        { key: 'attendanceManagement', label: 'Log Staff Attendance' },
        { key: 'salaryPayouts', label: 'Manage Salary Payouts' },
    ]},
    { id: 'parent', label: 'Parent Management', sub: [
        { key: 'addParent', label: 'Register New Parent' },
        { key: 'editParent', label: 'Edit Parent Details' },
    ]},
    { id: 'course', label: 'Course Management', sub: [
        { key: 'addCourse', label: 'Create New Course' },
        { key: 'editCourse', label: 'Edit Course Details' },
    ]},
    { id: 'chat', label: 'Chat Messaging System', sub: [] },
];

/* ══════════════════════════════
   MAIN SCREEN
══════════════════════════════ */
const InstitutesScreen = ({ navigation }) => {
    const [institutes, setInstitutes] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPending, setLoadingPending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Navigation & Tabs
    const [activeTab, setActiveTab] = useState('active'); // active | pending
    const [search, setSearch] = useState('');

    // Resolving Pending Registration
    const [resolvingId, setResolvingId] = useState(null);

    // Controls Modal
    const [controlsModal, setControlsModal] = useState(null);
    const [controlsData, setControlsData] = useState(null);
    const [savingControls, setSavingControls] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    // Edit Modal
    const [editModal, setEditModal] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', code: '', address: '', contactEmail: '', phone: '', helplineNumber: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    /* ── Fetch ── */
    const fetchData = useCallback(async () => {
        try {
            const { data } = await axios.get('/setup/institutes');
            setInstitutes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    const fetchPending = useCallback(async () => {
        try {
            setLoadingPending(true);
            const { data } = await axios.get('/registration-requests/admin');
            setPendingRequests(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoadingPending(false); }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPending();
        }
    }, [activeTab, fetchPending]);

    /* ── Derived List ── */
    const filtered = institutes.filter(i =>
        [i.name, i.address, i.contactEmail, i.code].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    );

    /* ── Actions ── */
    const handleDelete = (id, name) => {
        Alert.alert(
            'Delete Institute',
            `Are you sure you want to delete ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            await axios.delete(`/setup/institutes/${id}`);
                            setInstitutes(prev => prev.filter(i => i._id !== id));
                            Alert.alert('✓ Deleted', 'Institute deleted successfully!');
                        } catch { Alert.alert('Error', 'Could not delete institute'); }
                    }
                }
            ]
        );
    };

    const handleResolve = (id, name, status) => {
        Alert.alert(
            `${status} Request`,
            `Are you sure you want to ${status.toLowerCase()} "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: status,
                    style: status === 'Reject' ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            setResolvingId(id);
                            await axios.put(`/registration-requests/${id}/admin-resolve`, {
                                status: status === 'Approve' ? 'Approved' : 'Rejected'
                            });
                            Alert.alert('Success', `Institute request ${status.toLowerCase()}d successfully!`);
                            setPendingRequests(prev => prev.filter(r => r._id !== id));
                            if (status === 'Approve') fetchData();
                        } catch {
                            Alert.alert('Error', 'Failed to resolve request');
                        } finally { setResolvingId(null); }
                    }
                }
            ]
        );
    };

    // Edit Institute Handlers
    const openEdit = (inst) => {
        setEditForm({
            name: inst.name || '',
            code: inst.code || '',
            address: inst.address || '',
            contactEmail: inst.contactEmail || '',
            phone: inst.phone || '',
            helplineNumber: inst.helplineNumber || '',
        });
        setEditModal(inst);
    };

    const saveEdit = async () => {
        if (!editForm.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
        setSavingEdit(true);
        try {
            await axios.put(`/setup/institutes/${editModal._id}`, editForm);
            setInstitutes(prev => prev.map(i => i._id === editModal._id ? { ...i, ...editForm } : i));
            setEditModal(null);
            Alert.alert('✓ Updated', 'Institute details updated successfully!');
        } catch {
            Alert.alert('Error', 'Failed to update institute');
        } finally { setSavingEdit(false); }
    };

    // Controls Handlers
    const openControls = (inst) => {
        const merged = {};
        CONTROL_SECTIONS.forEach(sec => {
            merged[sec.id] = { ...DEFAULT_CONTROLS[sec.id], ...(inst.controls?.[sec.id] || {}) };
        });
        setControlsData(merged);
        setExpandedSections({});
        setControlsModal(inst);
    };

    const toggleControl = (sectionId, key) => {
        setControlsData(prev => ({
            ...prev,
            [sectionId]: {
                ...prev[sectionId],
                [key]: !(prev[sectionId]?.[key] !== false)
            }
        }));
    };

    const saveControls = async () => {
        setSavingControls(true);
        try {
            await axios.put(`/setup/institutes/${controlsModal._id}`, { controls: controlsData });
            setInstitutes(prev => prev.map(i => i._id === controlsModal._id ? { ...i, controls: controlsData } : i));
            setControlsModal(null);
            Alert.alert('✓ Saved', 'Access controls saved successfully!');
        } catch {
            Alert.alert('Error', 'Failed to save controls');
        } finally { setSavingControls(false); }
    };

    if (loading) return <LoadingScreen />;

    /* ══════════ RENDER ══════════ */
    return (
        <View style={ss.root}>
            <AppHeader
                title="Institutes"
                showBack
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateInstitute')}
            />

            {/* Sub Header */}
            <View style={ss.subHeader}>
                <View>
                    <Text style={ss.subTitle}>Institutes Management</Text>
                    <Text style={ss.subDesc}>Manage active educational campuses and new registration requests.</Text>
                </View>
                <View style={ss.totalPill}>
                    <Text style={ss.totalPillText}>Total: {activeTab === 'active' ? filtered.length : pendingRequests.length}</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={ss.tabBar}>
                <TouchableOpacity
                    style={[ss.tabItem, activeTab === 'active' && ss.tabItemActive]}
                    onPress={() => setActiveTab('active')}
                >
                    <Ionicons name="business-outline" size={16} color={activeTab === 'active' ? C.indigo : C.sub} />
                    <Text style={[ss.tabLabel, activeTab === 'active' && ss.tabLabelActive]}>Active Institutes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[ss.tabItem, activeTab === 'pending' && ss.tabItemActive]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Ionicons name="time-outline" size={16} color={activeTab === 'pending' ? C.amber : C.sub} />
                    <Text style={[ss.tabLabel, activeTab === 'pending' && { color: C.amber, fontWeight: '800' }]}>
                        Pending Approvals {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search (Active Tab Only) */}
            {activeTab === 'active' && (
                <View style={ss.toolRow}>
                    <View style={ss.searchWrap}>
                        <Ionicons name="search-outline" size={16} color={C.muted} />
                        <TextInput
                            style={ss.searchInput}
                            placeholder="Search by name, code, city…"
                            placeholderTextColor={C.muted}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={C.muted} /></TouchableOpacity> : null}
                    </View>
                </View>
            )}

            {/* ACTIVE TAB */}
            {activeTab === 'active' && (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item._id}
                    contentContainerStyle={ss.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.indigo} />}
                    ListEmptyComponent={<EmptyState icon="business-outline" title="No active institutes" />}
                    renderItem={({ item: i }) => (
                        <View style={ss.card}>
                            <View style={ss.cardRow}>
                                <View style={[ss.avatar, { backgroundColor: C.indigo }]}>
                                    <Ionicons name="business" size={20} color={C.white} />
                                </View>
                                <View style={ss.cardInfo}>
                                    <Text style={ss.cardName}>{i.name}</Text>
                                    <Text style={ss.cardEmail} numberOfLines={1}>{i.contactEmail || 'No email added'}</Text>
                                </View>
                            </View>

                            {/* Details row */}
                            <View style={ss.detailRow}>
                                <View style={ss.detailItem}>
                                    <Ionicons name="barcode-outline" size={12} color={C.muted} />
                                    <Text style={ss.detailText}>Code: {i.code || 'N/A'}</Text>
                                </View>
                                <View style={ss.detailItem}>
                                    <Ionicons name="book-outline" size={12} color={C.muted} />
                                    <Text style={ss.detailText}>Courses: {i.courseCount || 0}</Text>
                                </View>
                                <View style={ss.detailItem}>
                                    <Ionicons name="map-outline" size={12} color={C.muted} />
                                    <Text style={ss.detailText} numberOfLines={1}>Location: {i.address || 'N/A'}</Text>
                                </View>
                            </View>

                            {/* Actions row */}
                            <View style={ss.actionRow}>
                                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.indigoLight }]} onPress={() => navigation.navigate('InstituteDetail', { instituteId: i._id })}>
                                    <Ionicons name="eye-outline" size={14} color={C.indigo} />
                                    <Text style={[ss.actionBtnText, { color: C.indigo }]}>View</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.greenLight }]} onPress={() => openControls(i)}>
                                    <Ionicons name="shield-checkmark-outline" size={14} color={C.green} />
                                    <Text style={[ss.actionBtnText, { color: C.green }]}>Controls</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.borderLight }]} onPress={() => openEdit(i)}>
                                    <Ionicons name="create-outline" size={14} color={C.sub} />
                                    <Text style={[ss.actionBtnText, { color: C.sub }]}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.redLight }]} onPress={() => handleDelete(i._id, i.name)}>
                                    <Ionicons name="trash-outline" size={14} color={C.red} />
                                    <Text style={[ss.actionBtnText, { color: C.red }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* PENDING TAB */}
            {activeTab === 'pending' && (
                loadingPending ? <LoadingScreen /> : (
                    <FlatList
                        data={pendingRequests}
                        keyExtractor={item => item._id}
                        contentContainerStyle={ss.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={loadingPending} onRefresh={fetchPending} tintColor={C.amber} />}
                        ListEmptyComponent={<EmptyState icon="time-outline" title="No pending approvals" />}
                        renderItem={({ item: r }) => (
                            <View style={ss.card}>
                                <View style={ss.cardRow}>
                                    <View style={[ss.avatar, { backgroundColor: C.amber }]}>
                                        <Ionicons name="hourglass-outline" size={20} color={C.white} />
                                    </View>
                                    <View style={ss.cardInfo}>
                                        <Text style={ss.cardName}>{r.name}</Text>
                                        <Text style={ss.cardEmail} numberOfLines={1}>{r.email || 'No email'}</Text>
                                    </View>
                                </View>

                                {/* Details */}
                                <View style={ss.detailRow}>
                                    {r.instituteDetails?.code && (
                                        <View style={ss.detailItem}>
                                            <Ionicons name="barcode-outline" size={12} color={C.muted} />
                                            <Text style={ss.detailText}>Requested: {r.instituteDetails.code}</Text>
                                        </View>
                                    )}
                                    {r.phone && (
                                        <View style={ss.detailItem}>
                                            <Ionicons name="call-outline" size={12} color={C.muted} />
                                            <Text style={ss.detailText}>{r.phone}</Text>
                                        </View>
                                    )}
                                    {r.instituteDetails?.address && (
                                        <View style={ss.detailItem}>
                                            <Ionicons name="map-outline" size={12} color={C.muted} />
                                            <Text style={ss.detailText}>{r.instituteDetails.address}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Actions */}
                                <View style={ss.actionRow}>
                                    <TouchableOpacity
                                        style={[ss.actionBtn, { backgroundColor: C.greenLight }]}
                                        onPress={() => handleResolve(r._id, r.name, 'Approve')}
                                        disabled={resolvingId === r._id}
                                    >
                                        {resolvingId === r._id ? (
                                            <ActivityIndicator size="small" color={C.green} />
                                        ) : (
                                            <><Ionicons name="checkmark-circle-outline" size={14} color={C.green} /><Text style={[ss.actionBtnText, { color: C.green }]}>Approve</Text></>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[ss.actionBtn, { backgroundColor: C.redLight }]}
                                        onPress={() => handleResolve(r._id, r.name, 'Reject')}
                                        disabled={resolvingId === r._id}
                                    >
                                        <Ionicons name="close-circle-outline" size={14} color={C.red} />
                                        <Text style={[ss.actionBtnText, { color: C.red }]}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )
            )}

            {/* ══════════════ EDIT MODAL ══════════════ */}
            <Modal visible={!!editModal} transparent animationType="slide" onRequestClose={() => setEditModal(null)}>
                <View style={ss.overlay}>
                    <View style={ss.sheet}>
                        <View style={ss.sheetHandle} />
                        <View style={ss.sheetHeader}>
                            <View>
                                <Text style={ss.sheetTitle}>Edit Institute</Text>
                                <Text style={ss.sheetSub}>{editModal?.name}</Text>
                            </View>
                            <TouchableOpacity style={ss.closeBtn} onPress={() => setEditModal(null)}>
                                <Ionicons name="close" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: sp.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                            {[
                                { label: 'Institute Name *', key: 'name', placeholder: 'e.g. City College', icon: 'business-outline' },
                                { label: 'Institute Code', key: 'code', placeholder: 'e.g. CC001', icon: 'barcode-outline' },
                                { label: 'Address', key: 'address', placeholder: 'Full address', icon: 'map-outline' },
                                { label: 'Contact Email', key: 'contactEmail', placeholder: 'admin@institute.com', icon: 'mail-outline', keyboardType: 'email-address' },
                                { label: 'Phone', key: 'phone', placeholder: '+92 300 0000000', icon: 'call-outline', keyboardType: 'phone-pad' },
                                { label: 'Helpline / WhatsApp', key: 'helplineNumber', placeholder: 'Helpline Number', icon: 'chatbubble-ellipses-outline', keyboardType: 'phone-pad' },
                            ].map(f => (
                                <View key={f.key} style={ss.fieldWrap}>
                                    <Text style={ss.fieldLabel}>{f.label}</Text>
                                    <View style={ss.fieldRow}>
                                        <Ionicons name={f.icon} size={16} color={C.muted} />
                                        <TextInput
                                            style={ss.fieldInput}
                                            value={editForm[f.key]}
                                            onChangeText={val => setEditForm(prev => ({ ...prev, [f.key]: val }))}
                                            placeholder={f.placeholder}
                                            placeholderTextColor={C.muted}
                                            keyboardType={f.keyboardType || 'default'}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity style={[ss.saveBtn, { backgroundColor: C.indigo }]} onPress={saveEdit} disabled={savingEdit}>
                                {savingEdit ? (
                                    <ActivityIndicator size="small" color={C.white} />
                                ) : (
                                    <><Ionicons name="checkmark-circle-outline" size={18} color={C.white} /><Text style={ss.saveBtnText}>Save Changes</Text></>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ══════════════ ACCESS CONTROLS MODAL ══════════════ */}
            <Modal visible={!!controlsModal} transparent animationType="slide" onRequestClose={() => setControlsModal(null)}>
                <View style={ss.overlay}>
                    <View style={ss.sheet}>
                        <View style={ss.sheetHandle} />
                        <View style={ss.sheetHeader}>
                            <View>
                                <Text style={ss.sheetTitle}>Access Controls</Text>
                                <Text style={ss.sheetSub}>{controlsModal?.name}</Text>
                            </View>
                            <TouchableOpacity style={ss.closeBtn} onPress={() => setControlsModal(null)}>
                                <Ionicons name="close" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: sp.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                            <Text style={ss.controlsHint}>
                                Toggle the features and pages available to this institute's user dashboard panels.
                            </Text>

                            {CONTROL_SECTIONS.map(sec => {
                                const ctrl = controlsData?.[sec.id] || {};
                                const isExpanded = !!expandedSections[sec.id];
                                const mainEnabled = ctrl.show !== false;
                                return (
                                    <View key={sec.id} style={ss.ctrlSection}>
                                        <View style={ss.ctrlSectionRow}>
                                            <TouchableOpacity
                                                style={ss.ctrlSectionLeft}
                                                onPress={() => setExpandedSections(p => ({ ...p, [sec.id]: !isExpanded }))}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={C.sub} />
                                                <Text style={ss.ctrlSectionLabel}>{sec.label}</Text>
                                            </TouchableOpacity>
                                            <Switch
                                                value={mainEnabled}
                                                onValueChange={() => toggleControl(sec.id, 'show')}
                                                trackColor={{ false: C.border, true: C.indigo }}
                                                thumbColor={C.white}
                                            />
                                        </View>

                                        {isExpanded && sec.sub.length > 0 && (
                                            <View style={ss.ctrlSubList}>
                                                {sec.sub.map(sub => {
                                                    const subEnabled = ctrl[sub.key] !== false;
                                                    return (
                                                        <View key={sub.key} style={ss.ctrlSubRow}>
                                                            <Text style={ss.ctrlSubLabel}>{sub.label}</Text>
                                                            <Switch
                                                                value={subEnabled}
                                                                onValueChange={() => toggleControl(sec.id, sub.key)}
                                                                trackColor={{ false: C.border, true: C.indigo }}
                                                                thumbColor={C.white}
                                                                disabled={!mainEnabled}
                                                            />
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            <TouchableOpacity style={[ss.saveBtn, { backgroundColor: C.indigo }]} onPress={saveControls} disabled={savingControls}>
                                {savingControls ? (
                                    <ActivityIndicator size="small" color={C.white} />
                                ) : (
                                    <><Ionicons name="checkmark-circle-outline" size={18} color={C.white} /><Text style={ss.saveBtnText}>Save Controls</Text></>
                                )}
                            </TouchableOpacity>
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

    /* Sub Header */
    subHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingTop: 14, paddingBottom: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    subTitle: { fontSize: fz.md, fontWeight: '900', color: C.text, marginBottom: 2 },
    subDesc: { fontSize: fz.xs, color: C.muted, fontWeight: '500', maxWidth: 220 },
    totalPill: { backgroundColor: C.borderLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: r.full, marginTop: 2 },
    totalPillText: { fontSize: fz.xs, fontWeight: '800', color: C.sub },

    /* Tab Bar */
    tabBar: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingHorizontal: sp.md },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: C.indigo },
    tabLabel: { fontSize: fz.xs, fontWeight: '700', color: C.muted },
    tabLabelActive: { color: C.indigo },

    /* Search tool */
    toolRow: { paddingHorizontal: sp.md, paddingVertical: sp.sm, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, height: 42 },
    searchInput: { flex: 1, fontSize: fz.sm, color: C.text, padding: 0 },

    /* List & Cards */
    list: { padding: sp.md, paddingBottom: 40 },
    card: { backgroundColor: C.card, borderRadius: r.lg, padding: sp.md, marginBottom: 10, borderWidth: 1, borderColor: C.borderLight, ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 } }) },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardName: { fontSize: fz.sm, fontWeight: '800', color: C.text, marginBottom: 2 },
    cardEmail: { fontSize: fz.xs, color: C.muted, fontWeight: '500' },

    /* Detail Row */
    detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingHorizontal: 2 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: fz.xs, color: C.sub, fontWeight: '600' },

    /* Action buttons */
    actionRow: { flexDirection: 'row', gap: 6 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 34, borderRadius: r.sm },
    actionBtnText: { fontSize: 10, fontWeight: '800' },

    /* Modals overlay & sheet */
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, maxHeight: '90%', paddingBottom: 8 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginVertical: 12 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    sheetTitle: { fontSize: fz.md, fontWeight: '900', color: C.text },
    sheetSub: { fontSize: fz.xs, color: C.muted, fontWeight: '600', marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

    /* Form Fields */
    fieldWrap: { marginBottom: 14 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: C.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, height: 46 },
    fieldInput: { flex: 1, fontSize: fz.sm, color: C.text, padding: 0, fontWeight: '600' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: r.md, marginTop: 12 },
    saveBtnText: { fontSize: fz.md, fontWeight: '800', color: C.white },

    /* Access Controls sections */
    controlsHint: { fontSize: fz.xs, color: C.muted, fontWeight: '600', marginBottom: sp.md, lineHeight: 18 },
    ctrlSection: { borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingVertical: 10 },
    ctrlSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    ctrlSectionLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    ctrlSectionLabel: { fontSize: fz.sm, fontWeight: '800', color: C.text },
    ctrlSubList: { paddingLeft: 24, paddingVertical: 4, gap: 8, marginTop: sp.xs },
    ctrlSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    ctrlSubLabel: { fontSize: fz.xs, fontWeight: '600', color: C.sub },
});

export default InstitutesScreen;
