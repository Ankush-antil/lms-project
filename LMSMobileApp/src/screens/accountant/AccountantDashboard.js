import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView, Platform, ActivityIndicator, TextInput, FlatList, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Badge, EmptyState, SectionCard } from '../../components/common/UIComponents';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const AccountantDashboard = ({ navigation }) => {
    const { user, logout, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);
    const [stats, setStats] = useState(null);
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [switcherVisible, setSwitcherVisible] = useState(false);

    // Staff Features States
    const [activeTab, setActiveTab] = useState('home'); // 'home' | 'tasks' | 'attendance' | 'salary'
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [leaveDate, setLeaveDate] = useState('');
    const [leaveNote, setLeaveNote] = useState('');
    const [submittingLeave, setSubmittingLeave] = useState(false);

    const handleQuickSwitch = async () => {
        if (savedAccounts && savedAccounts.length > 1) {
            const currentIndex = savedAccounts.findIndex(acc => acc.user?.email === user?.email);
            const nextIndex = (currentIndex + 1) % savedAccounts.length;
            const nextAcc = savedAccounts[nextIndex];
            if (nextAcc) {
                await switchAccount(nextAcc.token, nextAcc.user);
            }
        } else {
            Alert.alert('No other saved accounts', 'Please login to another account first to use quick switch.');
        }
    };

    const handleProfilePress = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
            handleQuickSwitch();
        } else {
            lastTapRef.current = now;
            tapTimeoutRef.current = setTimeout(() => {
                navigation.navigate('Profile');
            }, DOUBLE_PRESS_DELAY);
        }
    };

    // Staff tasks & attendance logic
    const loadTasks = async () => {
        try {
            const stored = await AsyncStorage.getItem(`staff_tasks_${user?._id}`);
            if (stored) setTasks(JSON.parse(stored));
            else setTasks([
                { id: '1', title: 'Preparation for Daily Activities', description: 'Review scheduled materials', status: 'pending' },
            ]);
        } catch (e) {}
    };

    const saveTasks = async (newTasks) => {
        try {
            await AsyncStorage.setItem(`staff_tasks_${user?._id}`, JSON.stringify(newTasks));
            setTasks(newTasks);
        } catch (e) {}
    };

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) { Alert.alert('Error', 'Please enter task title'); return; }
        const newTask = { id: Date.now().toString(), title: newTaskTitle.trim(), description: newTaskDesc.trim(), status: 'pending' };
        saveTasks([newTask, ...tasks]);
        setNewTaskTitle(''); setNewTaskDesc('');
        Alert.alert('Success', 'Task created successfully');
    };

    const handleToggleTaskStatus = (id) => {
        saveTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t));
    };

    const handleDeleteTask = (id) => {
        Alert.alert('Delete Task', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => saveTasks(tasks.filter(t => t.id !== id)) }
        ]);
    };

    const fetchAttendanceAndHistory = async () => {
        try {
            if (user?._id) {
                const { data } = await axios.get(`/attendance/staff/${user._id}/history`);
                setAttendanceHistory(data.history || []);
            }
        } catch (e) {}
    };

    const handleApplyLeave = async () => {
        if (!leaveDate || !leaveNote.trim()) { Alert.alert('Error', 'Please fill in leave date & reason'); return; }
        try {
            setSubmittingLeave(true);
            const formData = new FormData();
            formData.append('date', leaveDate);
            formData.append('leaveNote', leaveNote.trim());
            await axios.post('/attendance/leave-application', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            Alert.alert('Success', 'Leave application submitted!');
            setLeaveDate(''); setLeaveNote(''); fetchAttendanceAndHistory();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to submit leave');
        } finally { setSubmittingLeave(false); }
    };

    const fetchData = async () => {
        try {
            const res = await axios.get('/fees/admin/dashboard-data');
            setStats(res.data?.stats || {});
            setReceipts(res.data?.receipts || []);
        } catch (e) {
            console.error('Accountant dashboard fetch error:', e);
        }

        try {
            await loadTasks();
            await fetchAttendanceAndHistory();
        } catch (e) {}

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Loading workspace...</Text>
            </SafeAreaView>
        );
    }

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Accountant Workspace</Text>
                <TouchableOpacity 
                    onPress={handleProfilePress} 
                    onLongPress={() => setSwitcherVisible(true)}
                    delayLongPress={500}
                    style={styles.logoutBtn}
                >
                    <Ionicons name="person-circle-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Quick Actions top tab bar */}
            <View style={styles.topTabBar}>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('home')} activeOpacity={0.7}>
                    <Ionicons name="home-outline" size={20} color={activeTab === 'home' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('tasks')} activeOpacity={0.7}>
                    <Ionicons name="checkmark-done-circle-outline" size={20} color={activeTab === 'tasks' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'tasks' && styles.tabLabelActive]}>Tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('attendance')} activeOpacity={0.7}>
                    <Ionicons name="calendar-outline" size={20} color={activeTab === 'attendance' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'attendance' && styles.tabLabelActive]}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('salary')} activeOpacity={0.7}>
                    <Ionicons name="card-outline" size={20} color={activeTab === 'salary' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'salary' && styles.tabLabelActive]}>Salary</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'home' && (
                <ScrollView
                    style={styles.container}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                >
                    {/* Finance Banner */}
                    <View style={styles.financeBanner}>
                        <View style={styles.decorCircle1} />
                        <View style={styles.decorCircle2} />
                        <View style={styles.bannerContent}>
                            <View style={styles.badgeContainer}>
                                <Ionicons name="sparkles" size={12} color="#fef3c7" />
                                <Text style={styles.bannerBadgeText}>Finance & Accounts</Text>
                            </View>
                            <Text style={styles.bannerTitle}>Finance Control Desk</Text>
                            <Text style={styles.bannerSub}>Monitor collections, pending dues, ledger receipts and fee collections.</Text>
                        </View>
                    </View>

                    {/* Collections Overview Stats */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <View style={[styles.iconCircle, { backgroundColor: '#eef2ff' }]}>
                                <Ionicons name="today" size={18} color={colors.accent} />
                            </View>
                            <Text style={styles.statLabel}>Today's Collection</Text>
                            <Text style={[styles.statValue, { color: colors.accent }]}>{fmt(stats?.todayCollection)}</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
                                <Ionicons name="wallet" size={18} color={colors.teacher} />
                            </View>
                            <Text style={styles.statLabel}>This Month</Text>
                            <Text style={[styles.statValue, { color: colors.teacher }]}>{fmt(stats?.monthlyCollection)}</Text>
                        </View>
                    </View>

                    <View style={[styles.statsGrid, { marginTop: spacing.sm }]}>
                        <View style={styles.statCard}>
                            <View style={[styles.iconCircle, { backgroundColor: '#fff5f5' }]}>
                                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                            </View>
                            <Text style={styles.statLabel}>Outstanding Dues</Text>
                            <Text style={[styles.statValue, { color: colors.danger }]}>{fmt(stats?.totalPending)}</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.iconCircle, { backgroundColor: '#fffbeb' }]}>
                                <Ionicons name="people" size={18} color="#d97706" />
                            </View>
                            <Text style={styles.statLabel}>Active Students</Text>
                            <Text style={[styles.statValue, { color: '#d97706' }]}>{stats?.totalStudents || 0}</Text>
                        </View>
                    </View>

                    {/* Primary CTA */}
                    <TouchableOpacity
                        style={styles.collectCTA}
                        onPress={() => navigation.navigate('AccountantFeePortal')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.ctaLeft}>
                            <View style={styles.ctaIcon}>
                                <Ionicons name="card" size={22} color={colors.white} />
                            </View>
                            <View>
                                <Text style={styles.ctaTitle}>Collect Fees</Text>
                                <Text style={styles.ctaSub}>Manage ledgers & register student fee receipts</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.white} />
                    </TouchableOpacity>

                    {/* Recent Receipts Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Receipts</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AccountantFeePortal')}>
                            <Text style={styles.viewAllText}>Manage All →</Text>
                        </TouchableOpacity>
                    </View>

                    {receipts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No recent payments registered</Text>
                        </View>
                    ) : (
                        receipts.slice(0, 5).map((tx, idx) => (
                            <View key={idx} style={styles.txItem}>
                                <View style={styles.txLeft}>
                                    <View style={styles.txAvatar}>
                                        <Text style={styles.txAvatarText}>{tx.studentName?.[0] || 'S'}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.txName}>{tx.studentName}</Text>
                                        <Text style={styles.txMeta}>{tx.receiptNo} • {tx.paymentMode}</Text>
                                    </View>
                                </View>
                                <View style={styles.txRight}>
                                    <Text style={styles.txAmount}>{fmt(tx.amount)}</Text>
                                    <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                                </View>
                            </View>
                        ))
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            )}

            {activeTab === 'tasks' && (
                <View style={styles.workspaceBody}>
                    <SectionCard style={styles.addTaskCard}>
                        <Text style={styles.sectionTitle}>Create Task</Text>
                        <TextInput style={styles.inputField} placeholder="Task title..." placeholderTextColor={colors.textMuted} value={newTaskTitle} onChangeText={setNewTaskTitle} />
                        <TextInput style={[styles.inputField, { height: 60 }]} placeholder="Task description..." placeholderTextColor={colors.textMuted} value={newTaskDesc} onChangeText={setNewTaskDesc} multiline />
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddTask} activeOpacity={0.8}>
                            <Text style={styles.addBtnText}>Create Task</Text>
                        </TouchableOpacity>
                    </SectionCard>
                    <FlatList
                        data={tasks}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.taskItem}>
                                <TouchableOpacity onPress={() => handleToggleTaskStatus(item.id)} style={styles.checkWrapper}>
                                    <Ionicons name={item.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.status === 'done' ? '#10b981' : colors.textSecondary} />
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.taskTitle, item.status === 'done' && styles.taskTitleDone]}>{item.title}</Text>
                                    {item.description ? <Text style={styles.taskDesc}>{item.description}</Text> : null}
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteTask(item.id)} style={styles.deleteBtn}>
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={<EmptyState icon="clipboard-outline" title="No tasks registered" />}
                        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
                    />
                </View>
            )}

            {activeTab === 'attendance' && (
                <View style={styles.workspaceBody}>
                    <SectionCard style={styles.leaveCard}>
                        <Text style={styles.sectionTitle}>Apply Leave</Text>
                        <TextInput style={styles.inputField} placeholder="Date (e.g. 2026-07-20)" placeholderTextColor={colors.textMuted} value={leaveDate} onChangeText={setLeaveDate} />
                        <TextInput style={[styles.inputField, { height: 60 }]} placeholder="Reason for leave..." placeholderTextColor={colors.textMuted} value={leaveNote} onChangeText={setLeaveNote} multiline />
                        <TouchableOpacity style={[styles.addBtn, submittingLeave && { opacity: 0.5 }]} onPress={handleApplyLeave} disabled={submittingLeave} activeOpacity={0.8}>
                            {submittingLeave ? <ActivityIndicator color={colors.white} /> : <Text style={styles.addBtnText}>Submit Leave</Text>}
                        </TouchableOpacity>
                    </SectionCard>
                    <FlatList
                        data={attendanceHistory}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.historyItem}>
                                <View>
                                    <Text style={styles.historyDate}>{item.date}</Text>
                                    <Text style={styles.historyDetails}>{item.checkInTime ? `In: ${item.checkInTime}` : ''}{item.checkOutTime ? ` • Out: ${item.checkOutTime}` : ''}</Text>
                                </View>
                                <Badge label={item.status} color={item.status === 'Present' ? '#10b981' : item.status === 'Absent' ? '#ef4444' : '#f59e0b'} />
                            </View>
                        )}
                        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No attendance logs found" />}
                        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
                    />
                </View>
            )}

            {activeTab === 'salary' && (
                <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Salary Ledger Information</Text>
                        <View style={styles.ledgerCard}>
                            <Text style={styles.salaryHeader}>Contract Base Salary</Text>
                            <Text style={styles.salaryAmt}>₹{Number(user?.accountantProfile?.salary || user?.staffProfile?.salary || 0).toLocaleString('en-IN')}</Text>
                        </View>
                    </SectionCard>
                    <SectionCard style={{ marginTop: spacing.md }}>
                        <Text style={styles.sectionTitle}>Status</Text>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Salary Status</Text>
                            <Badge label={user?.accountantProfile?.salaryStatus || 'Paid'} color="#10b981" />
                        </View>
                    </SectionCard>
                    <View style={{ height: 80 }} />
                </ScrollView>
            )}
            <ProfileBottomSheet visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        ...Platform.select({
            ios: { marginTop: 0 },
            android: { marginTop: 24 }
        })
    },
    headerTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text },
    logoutBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    loadingText: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 10, fontWeight: '600' },
    container: { flex: 1, padding: spacing.md },
    financeBanner: {
        backgroundColor: '#78350f',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    decorCircle1: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        top: -40,
        right: -40,
    },
    decorCircle2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        bottom: -30,
        left: '25%',
    },
    bannerContent: { zIndex: 1 },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(245, 158, 11, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    bannerBadgeText: { fontSize: 9, fontWeight: '900', color: '#fef3c7', textTransform: 'uppercase' },
    bannerTitle: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.white },
    bannerSub: { fontSize: 11, color: '#fcd34d', marginTop: 4, leadingHeight: 16, fontWeight: '500' },
    statsGrid: { flexDirection: 'row', gap: 8 },
    statCard: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
    statValue: { fontSize: fontSizes.md + 2, fontWeight: '900', marginTop: 4 },
    collectCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.accent,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginVertical: spacing.md,
        elevation: 2,
    },
    ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ctaIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.white },
    ctaSub: { fontSize: 10, color: '#e0e7ff', marginTop: 2, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifySelf: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.md, paddingHorizontal: 2 },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text },
    viewAllText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.accent },
    emptyState: { alignItems: 'center', padding: 24, backgroundColor: colors.bgCard, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight },
    emptyText: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 8, fontWeight: '700' },
    txItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    txAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#78350f',
        alignItems: 'center',
        justifyContent: 'center',
    },
    txAvatarText: { color: colors.white, fontSize: fontSizes.md, fontWeight: 'bold' },
    txName: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
    txMeta: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: 'bold' },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: fontSizes.sm, fontWeight: '900', color: colors.text },
    txDate: { fontSize: 9, color: colors.textMuted, marginTop: 2, fontWeight: 'bold' },
    topTabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingVertical: 8,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    tabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 3,
    },
    tabLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        textAlign: 'center',
    },
    tabLabelActive: { color: colors.accent, fontWeight: '800' },
    workspaceBody: { flex: 1, padding: spacing.md },
    addTaskCard: { marginBottom: spacing.md },
    inputField: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        color: colors.text,
        fontSize: fontSizes.sm,
        marginBottom: spacing.sm,
    },
    addBtn: {
        backgroundColor: colors.accent,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    addBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    checkWrapper: { padding: 2 },
    taskTitle: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
    taskTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    taskDesc: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    deleteBtn: { padding: 4 },
    leaveCard: { marginBottom: spacing.md },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    historyDate: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    historyDetails: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    ledgerCard: {
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    salaryHeader: { fontSize: fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase' },
    salaryAmt: { fontSize: fontSizes.xxl, fontWeight: '900', color: colors.accent, marginVertical: spacing.xs },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusLabel: { fontSize: fontSizes.sm, color: colors.textSecondary },
});

export default AccountantDashboard;
