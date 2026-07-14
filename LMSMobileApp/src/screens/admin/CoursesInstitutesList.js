import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl,
    TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const CoursesList = ({ navigation }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/setup/courses');
            setCourses(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = courses.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.institute?.name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Courses" 
                showBack 
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateCourse')}
            />
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search courses..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>
            <Text style={styles.countText}>{filtered.length} Courses</Text>
            <FlatList
                data={filtered}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                ListEmptyComponent={<EmptyState icon="book-outline" title="No courses found" />}
                renderItem={({ item }) => (
                    <View style={styles.courseCard}>
                        <View style={styles.courseIcon}>
                            <Ionicons name="book" size={22} color={colors.warning} />
                        </View>
                        <View style={styles.courseInfo}>
                            <Text style={styles.courseName}>{item.name}</Text>
                            {item.description && <Text style={styles.courseDesc} numberOfLines={2}>{item.description}</Text>}
                            {item.institute?.name && (
                                <Badge label={item.institute.name} color={colors.accent} bg="#eef2ff" />
                            )}
                        </View>
                    </View>
                )}
            />
        </View>
    );
};


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
        { key: 'application', label: 'Applications Tab' },
        { key: 'staffRequest', label: 'Staff Requests Tab' },
    ]},
    { id: 'student', label: 'Student Page', sub: [
        { key: 'admissionOpen', label: 'Admission Toggle' },
        { key: 'addStudent', label: 'Add Student Button' },
        { key: 'editStudent', label: 'Edit Student Button' },
        { key: 'dailyAttendanceLog', label: 'Daily Attendance Log' },
        { key: 'feeManagement', label: 'Fee Management' },
        { key: 'studentDirectory', label: 'Student Directory' },
    ]},
    { id: 'teacher', label: 'Teacher Page', sub: [
        { key: 'hiring', label: 'Hiring Toggle' },
        { key: 'addTeacher', label: 'Add Teacher Button' },
        { key: 'editTeacher', label: 'Edit Teacher Button' },
        { key: 'teacherDirectory', label: 'Teacher Directory' },
        { key: 'dailyAttendanceLog', label: 'Daily Attendance Log' },
    ]},
    { id: 'editor', label: 'Editor Page', sub: [
        { key: 'hiring', label: 'Hiring Toggle' },
        { key: 'addEditor', label: 'Add Editor Button' },
        { key: 'editEditor', label: 'Edit Editor Button' },
    ]},
    { id: 'accountant', label: 'Accountant Page', sub: [
        { key: 'addAccountant', label: 'Add Accountant' },
        { key: 'editAccountant', label: 'Edit Accountant' },
    ]},
    { id: 'staff', label: 'My Staff Page', sub: [
        { key: 'addStaff', label: 'Add Staff' },
        { key: 'staffDirectory', label: 'Staff Directory' },
        { key: 'attendanceManagement', label: 'Attendance Management' },
        { key: 'salaryPayouts', label: 'Salary Payouts' },
    ]},
    { id: 'parent', label: 'Parents Page', sub: [
        { key: 'addParent', label: 'Add Parent' },
        { key: 'editParent', label: 'Edit Parent' },
    ]},
    { id: 'course', label: 'Course Page', sub: [
        { key: 'addCourse', label: 'Add Course' },
        { key: 'editCourse', label: 'Edit Course' },
    ]},
    { id: 'chat', label: 'Chat Page', sub: [] },
];

const InstitutesList = ({ navigation }) => {
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'pending'

    // Pending Approvals
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);

    // Controls Modal
    const [controlsModal, setControlsModal] = useState(null);
    const [controlsData, setControlsData] = useState(null);
    const [savingControls, setSavingControls] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    // Edit Modal
    const [editModal, setEditModal] = useState(null); // institute object or null
    const [editForm, setEditForm] = useState({ name: '', code: '', address: '', contactEmail: '', phone: '', helplineNumber: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/setup/institutes');
            setInstitutes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const fetchPending = async () => {
        try {
            setLoadingPending(true);
            const { data } = await axios.get('/registration-requests/admin');
            setPendingRequests(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoadingPending(false); }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (activeTab === 'pending') fetchPending(); }, [activeTab]);

    const handleDeleteInstitute = (instituteId, instituteName) => {
        Alert.alert(
            'Delete Institute',
            `Are you sure you want to delete ${instituteName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/setup/institutes/${instituteId}`);
                            Alert.alert('Success', 'Institute deleted successfully!');
                            fetchData();
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.message || 'Failed to delete institute');
                        }
                    }
                }
            ]
        );
    };

    const handleResolveRequest = (id, name, status) => {
        Alert.alert(
            `${status} Institute`,
            `Are you sure you want to ${status.toLowerCase()} "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: status,
                    style: status === 'Reject' ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            setResolvingId(id);
                            await axios.put(`/registration-requests/${id}/admin-resolve`, { status: status === 'Approve' ? 'Approved' : 'Rejected' });
                            Alert.alert('Success', `Institute request ${status.toLowerCase()}d successfully!`);
                            setPendingRequests(prev => prev.filter(r => r._id !== id));
                            if (status === 'Approve') fetchData();
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.message || `Failed to ${status.toLowerCase()} request`);
                        } finally {
                            setResolvingId(null);
                        }
                    }
                }
            ]
        );
    };

    const openControlsModal = (inst) => {
        const merged = {};
        CONTROL_SECTIONS.forEach(sec => {
            merged[sec.id] = { ...DEFAULT_CONTROLS[sec.id], ...(inst.controls?.[sec.id] || {}) };
        });
        setControlsData(merged);
        setExpandedSections({});
        setControlsModal(inst);
    };

    const openEditModal = (inst) => {
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

    const handleSaveEdit = async () => {
        if (!editForm.name.trim()) { Alert.alert('Error', 'Institute name is required'); return; }
        try {
            setSavingEdit(true);
            await axios.put(`/setup/institutes/${editModal._id}`, editForm);
            Alert.alert('Success', 'Institute updated successfully!');
            setInstitutes(prev => prev.map(i => i._id === editModal._id ? { ...i, ...editForm } : i));
            setEditModal(null);
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to update institute');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleControlChange = (sectionId, key, value) => {
        setControlsData(prev => ({
            ...prev,
            [sectionId]: { ...prev[sectionId], [key]: value }
        }));
    };

    const handleSaveControls = async () => {
        if (!controlsModal) return;
        try {
            setSavingControls(true);
            await axios.put(`/setup/institutes/${controlsModal._id}`, { controls: controlsData });
            Alert.alert('Success', 'Access controls saved successfully!');
            setInstitutes(prev => prev.map(i => i._id === controlsModal._id ? { ...i, controls: controlsData } : i));
            setControlsModal(null);
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to save controls');
        } finally {
            setSavingControls(false);
        }
    };

    const toggleSection = (id) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filtered = institutes.filter(i =>
        i.name?.toLowerCase().includes(search.toLowerCase()) ||
        i.address?.toLowerCase().includes(search.toLowerCase()) ||
        i.contactEmail?.toLowerCase().includes(search.toLowerCase()) ||
        i.code?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Institutes Management"
                showBack
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateInstitute')}
            />

            {/* Sub Tabs */}
            <View style={styles.subTabBar}>
                <TouchableOpacity
                    style={[styles.subTabItem, activeTab === 'active' && styles.subTabActive]}
                    onPress={() => setActiveTab('active')}
                >
                    <Ionicons name="business-outline" size={16} color={activeTab === 'active' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.subTabLabel, activeTab === 'active' && styles.subTabLabelActive]}>Active Institutes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.subTabItem, activeTab === 'pending' && styles.subTabActive]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Ionicons name="time-outline" size={16} color={activeTab === 'pending' ? '#f59e0b' : colors.textSecondary} />
                    <Text style={[styles.subTabLabel, activeTab === 'pending' && { color: '#f59e0b', fontWeight: '800' }]}>
                        Pending Approvals
                        {pendingRequests.length > 0 && ` (${pendingRequests.length})`}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar (Active tab only) */}
            {activeTab === 'active' && (
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search institutes..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            )}

            {/* ACTIVE INSTITUTES TAB */}
            {activeTab === 'active' && (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    ListEmptyComponent={<EmptyState icon="business-outline" title="No institutes found" />}
                    ListHeaderComponent={<Text style={styles.countText}>{filtered.length} Institutes</Text>}
                    renderItem={({ item }) => {
                        const shortId = item.code || '';
                        const coursesCount = item.courseCount || 0;
                        return (
                            <View style={styles.instituteCard}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                                        <Ionicons name="business" size={20} color={colors.white} />
                                    </View>
                                    <View style={styles.headerInfo}>
                                        <Text style={styles.userName}>{item.name}</Text>
                                        <Text style={styles.userEmail}>{item.contactEmail || 'No email'}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardDetails}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="barcode-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailLabel}>Code: <Text style={styles.detailValue}>{shortId || 'N/A'}</Text></Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="book-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailLabel}>Courses: <Text style={styles.detailValue}>{coursesCount}</Text></Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="map-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailLabel}>Location: <Text style={styles.detailValue}>{item.address || 'N/A'}</Text></Text>
                                    </View>
                                </View>

                                <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]}
                                        onPress={() => navigation.navigate('InstituteDetail', { instituteId: item._id })}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="eye-outline" size={15} color={colors.accent} />
                                        <Text style={[styles.actionBtnText, { color: colors.accent }]}>View</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]}
                                        onPress={() => openControlsModal(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="shield-checkmark-outline" size={15} color="#16a34a" />
                                        <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Controls</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]}
                                        onPress={() => openEditModal(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="pencil-outline" size={15} color="#475569" />
                                        <Text style={[styles.actionBtnText, { color: '#475569' }]}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#ffe4e6' }]}
                                        onPress={() => handleDeleteInstitute(item._id, item.name)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={15} color="#e11d48" />
                                        <Text style={[styles.actionBtnText, { color: '#e11d48' }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* PENDING APPROVALS TAB */}
            {activeTab === 'pending' && (
                loadingPending ? <LoadingScreen /> : (
                    <FlatList
                        data={pendingRequests}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={loadingPending} onRefresh={fetchPending} />}
                        ListEmptyComponent={<EmptyState icon="time-outline" title="No pending institute registration requests" />}
                        ListHeaderComponent={<Text style={styles.countText}>{pendingRequests.length} Pending Requests</Text>}
                        renderItem={({ item }) => (
                            <View style={styles.instituteCard} key={item._id}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.avatar, { backgroundColor: '#f59e0b' }]}>
                                        <Ionicons name="time" size={20} color={colors.white} />
                                    </View>
                                    <View style={styles.headerInfo}>
                                        <Text style={styles.userName}>{item.name}</Text>
                                        <Text style={styles.userEmail}>{item.email}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardDetails}>
                                    {item.instituteDetails?.code ? (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="barcode-outline" size={14} color={colors.textMuted} />
                                            <Text style={styles.detailLabel}>Requested Code: <Text style={styles.detailValue}>{item.instituteDetails.code}</Text></Text>
                                        </View>
                                    ) : null}
                                    {item.phone ? (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                                            <Text style={styles.detailLabel}>Phone: <Text style={styles.detailValue}>{item.phone}</Text></Text>
                                        </View>
                                    ) : null}
                                    {item.instituteDetails?.address ? (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="map-outline" size={14} color={colors.textMuted} />
                                            <Text style={styles.detailLabel}>Address: <Text style={styles.detailValue}>{item.instituteDetails.address}</Text></Text>
                                        </View>
                                    ) : null}
                                    {item.instituteDetails?.contactEmail ? (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                                            <Text style={styles.detailLabel}>Contact Email: <Text style={styles.detailValue}>{item.instituteDetails.contactEmail}</Text></Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#ecfdf5', flex: 1.5 }]}
                                        onPress={() => handleResolveRequest(item._id, item.name, 'Approve')}
                                        disabled={resolvingId === item._id}
                                        activeOpacity={0.7}
                                    >
                                        {resolvingId === item._id ? (
                                            <ActivityIndicator size="small" color="#10b981" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" />
                                                <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Approve</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#ffe4e6', flex: 1 }]}
                                        onPress={() => handleResolveRequest(item._id, item.name, 'Reject')}
                                        disabled={resolvingId === item._id}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="close-circle-outline" size={15} color="#e11d48" />
                                        <Text style={[styles.actionBtnText, { color: '#e11d48' }]}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )
            )}

            {/* ====== EDIT INSTITUTE MODAL ====== */}
            <Modal
                visible={!!editModal}
                animationType="slide"
                transparent
                onRequestClose={() => setEditModal(null)}
            >
                <View style={styles.ctrlOverlay}>
                    <View style={styles.ctrlSheet}>
                        {/* Header */}
                        <View style={styles.ctrlHeader}>
                            <View style={styles.ctrlHeaderLeft}>
                                <View style={[styles.ctrlShieldIcon, { backgroundColor: '#fff7ed' }]}>
                                    <Ionicons name="pencil" size={18} color="#ea580c" />
                                </View>
                                <View>
                                    <Text style={styles.ctrlTitle}>Edit Institute</Text>
                                    <Text style={styles.ctrlSubtitle}>{editModal?.name}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setEditModal(null)}>
                                <Ionicons name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Form */}
                        <ScrollView style={styles.ctrlBody} showsVerticalScrollIndicator={false}>
                            {[
                                { label: 'Institute Name *', key: 'name', placeholder: 'e.g. City College', icon: 'business-outline' },
                                { label: 'Institute Code', key: 'code', placeholder: 'e.g. CC001', icon: 'barcode-outline' },
                                { label: 'Address', key: 'address', placeholder: 'Full address', icon: 'map-outline' },
                                { label: 'Contact Email', key: 'contactEmail', placeholder: 'admin@institute.com', icon: 'mail-outline', keyboardType: 'email-address' },
                                { label: 'Phone', key: 'phone', placeholder: '+92 300 0000000', icon: 'call-outline', keyboardType: 'phone-pad' },
                                { label: 'Helpline Number', key: 'helplineNumber', placeholder: 'Helpline / WhatsApp', icon: 'chatbubble-ellipses-outline', keyboardType: 'phone-pad' },
                            ].map(field => (
                                <View key={field.key} style={styles.editFieldGroup}>
                                    <Text style={styles.editFieldLabel}>{field.label}</Text>
                                    <View style={styles.editFieldRow}>
                                        <Ionicons name={field.icon} size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={styles.editFieldInput}
                                            value={editForm[field.key]}
                                            onChangeText={val => setEditForm(prev => ({ ...prev, [field.key]: val }))}
                                            placeholder={field.placeholder}
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType={field.keyboardType || 'default'}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>
                            ))}
                            <View style={{ height: 16 }} />
                        </ScrollView>

                        {/* Footer */}
                        <View style={styles.ctrlFooter}>
                            <TouchableOpacity style={styles.ctrlCancelBtn} onPress={() => setEditModal(null)}>
                                <Text style={styles.ctrlCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.ctrlSaveBtn, { backgroundColor: '#ea580c' }]}
                                onPress={handleSaveEdit}
                                disabled={savingEdit}
                                activeOpacity={0.85}
                            >
                                {savingEdit ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={16} color={colors.white} />
                                        <Text style={styles.ctrlSaveText}>Save Changes</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ====== MANAGE CONTROLS MODAL ====== */}
            <Modal
                visible={!!controlsModal}
                animationType="slide"
                transparent
                onRequestClose={() => setControlsModal(null)}
            >
                <View style={styles.ctrlOverlay}>
                    <View style={styles.ctrlSheet}>
                        {/* Modal Header */}
                        <View style={styles.ctrlHeader}>
                            <View style={styles.ctrlHeaderLeft}>
                                <View style={styles.ctrlShieldIcon}>
                                    <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                                </View>
                                <View>
                                    <Text style={styles.ctrlTitle}>{controlsModal?.name}</Text>
                                    <Text style={styles.ctrlSubtitle}>Manage Access Controls</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setControlsModal(null)}>
                                <Ionicons name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Info Banner */}
                        <View style={styles.ctrlInfoBanner}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.accent} />
                            <Text style={styles.ctrlInfoText}>Uncheck items to hide them from this institute's admin panel.</Text>
                        </View>

                        {/* Controls Sections */}
                        <ScrollView style={styles.ctrlBody} showsVerticalScrollIndicator={false}>
                            {CONTROL_SECTIONS.map(sec => {
                                const ctrl = controlsData?.[sec.id] || {};
                                const isExpanded = !!expandedSections[sec.id];
                                return (
                                    <View key={sec.id} style={styles.ctrlSection}>
                                        {/* Section Row */}
                                        <View style={styles.ctrlSectionRow}>
                                            <TouchableOpacity
                                                style={styles.ctrlSectionLeft}
                                                onPress={() => toggleSection(sec.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={16}
                                                    color={colors.textMuted}
                                                />
                                                <Text style={styles.ctrlSectionLabel}>{sec.label}</Text>
                                            </TouchableOpacity>
                                            {/* Page-level Show Toggle */}
                                            <TouchableOpacity
                                                style={[styles.ctrlCheckbox, ctrl.show !== false && styles.ctrlCheckboxChecked]}
                                                onPress={() => handleControlChange(sec.id, 'show', ctrl.show === false ? true : false)}
                                            >
                                                {ctrl.show !== false && <Ionicons name="checkmark" size={12} color={colors.white} />}
                                            </TouchableOpacity>
                                        </View>

                                        {/* Sub-controls (expanded) */}
                                        {isExpanded && sec.sub.length > 0 && (
                                            <View style={styles.ctrlSubList}>
                                                {sec.sub.map(sub => (
                                                    <TouchableOpacity
                                                        key={sub.key}
                                                        style={styles.ctrlSubRow}
                                                        onPress={() => handleControlChange(sec.id, sub.key, ctrl[sub.key] === false ? true : false)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[styles.ctrlCheckbox, ctrl[sub.key] !== false && styles.ctrlCheckboxChecked]}>
                                                            {ctrl[sub.key] !== false && <Ionicons name="checkmark" size={12} color={colors.white} />}
                                                        </View>
                                                        <Text style={styles.ctrlSubLabel}>{sub.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={styles.ctrlFooter}>
                            <TouchableOpacity style={styles.ctrlCancelBtn} onPress={() => setControlsModal(null)}>
                                <Text style={styles.ctrlCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.ctrlSaveBtn}
                                onPress={handleSaveControls}
                                disabled={savingControls}
                                activeOpacity={0.85}
                            >
                                {savingControls ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={16} color={colors.white} />
                                        <Text style={styles.ctrlSaveText}>Save Controls</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};





const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgCard,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    countText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '600',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    list: { paddingHorizontal: spacing.md, paddingBottom: 32 },
    courseCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    courseIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    courseInfo: { flex: 1, gap: 4 },
    courseName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    courseDesc: { fontSize: fontSizes.sm, color: colors.textMuted },
    
    // Institute specific styles
    instituteCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: { flex: 1 },
    userName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    userEmail: { fontSize: fontSizes.xs, color: colors.textMuted },
    cardDetails: {
        backgroundColor: '#f8fafc',
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    detailValue: {
        fontWeight: '700',
        color: colors.text,
    },
    cardActions: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: 2,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 34,
        borderRadius: borderRadius.sm,
    },
    actionBtnText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },

    // Sub-tab bar
    subTabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    subTabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
    },
    subTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: colors.accent,
    },
    subTabLabel: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    subTabLabelActive: {
        color: colors.accent,
        fontWeight: '800',
    },

    // Controls Modal
    ctrlOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    ctrlSheet: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '88%',
        paddingBottom: 24,
    },
    ctrlHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    ctrlHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    ctrlShieldIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctrlTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text,
    },
    ctrlSubtitle: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
    },
    ctrlInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#eef2ff',
        marginHorizontal: spacing.md,
        marginTop: 12,
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.sm,
    },
    ctrlInfoText: {
        fontSize: fontSizes.xs,
        color: colors.accent,
        flex: 1,
        flexWrap: 'wrap',
    },
    ctrlBody: {
        paddingHorizontal: spacing.md,
        paddingTop: 8,
    },
    ctrlSection: {
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
        overflow: 'hidden',
        backgroundColor: colors.bg,
    },
    ctrlSectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: colors.bgCard,
    },
    ctrlSectionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    ctrlSectionLabel: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.text,
    },
    ctrlCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgCard,
    },
    ctrlCheckboxChecked: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    ctrlSubList: {
        paddingHorizontal: 12,
        paddingBottom: 10,
        gap: 2,
    },
    ctrlSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    ctrlSubLabel: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        flex: 1,
    },
    ctrlFooter: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: 8,
    },
    ctrlCancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    ctrlCancelText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    ctrlSaveBtn: {
        flex: 2,
        height: 46,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.accent,
    },
    ctrlSaveText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.white,
    },

    // Edit Modal Form
    editFieldGroup: {
        marginBottom: 14,
    },
    editFieldLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    editFieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: 12,
        height: 46,
    },
    editFieldInput: {
        flex: 1,
        fontSize: fontSizes.sm,
        color: colors.text,
    },
});

export { CoursesList, InstitutesList };
export default CoursesList;
