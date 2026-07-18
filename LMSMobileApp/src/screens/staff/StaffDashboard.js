import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Alert,
    Dimensions,
    FlatList,
    Platform,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const StaffDashboard = ({ navigation }) => {
    const { user, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);
    const scrollRef = React.useRef(null);

    const [activeTab, setActiveTab] = useState('home'); // 'home' | 'tasks' | 'attendance' | 'salary'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [switcherVisible, setSwitcherVisible] = useState(false);

    // Tasks State
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');

    // Attendance State
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

    // Tasks CRUD
    const loadTasks = async () => {
        try {
            const stored = await AsyncStorage.getItem(`staff_tasks_${user?._id}`);
            if (stored) {
                setTasks(JSON.parse(stored));
            } else {
                setTasks([
                    { id: '1', title: 'Preparation for Daily Activities', description: 'Review scheduled classes/materials', status: 'pending' },
                    { id: '2', title: 'Log daily performance', description: 'Record student attendance & evaluation logs', status: 'pending' },
                ]);
            }
        } catch (e) {
            console.warn('Failed to load tasks:', e);
        }
    };

    const saveTasks = async (newTasks) => {
        try {
            await AsyncStorage.setItem(`staff_tasks_${user?._id}`, JSON.stringify(newTasks));
            setTasks(newTasks);
        } catch (e) {
            console.warn('Failed to save tasks:', e);
        }
    };

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) {
            Alert.alert('Error', 'Please enter task title');
            return;
        }
        const newTask = {
            id: Date.now().toString(),
            title: newTaskTitle.trim(),
            description: newTaskDesc.trim(),
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        const updated = [newTask, ...tasks];
        saveTasks(updated);
        setNewTaskTitle('');
        setNewTaskDesc('');
        Alert.alert('Success', 'Task created successfully');
    };

    const handleToggleTaskStatus = (id) => {
        const updated = tasks.map(t => {
            if (t.id === id) {
                return { ...t, status: t.status === 'done' ? 'pending' : 'done' };
            }
            return t;
        });
        saveTasks(updated);
    };

    const handleDeleteTask = (id) => {
        Alert.alert(
            'Confirm Delete',
            'Delete this task?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updated = tasks.filter(t => t.id !== id);
                        saveTasks(updated);
                    }
                }
            ]
        );
    };

    // Attendance history and leaves
    const fetchAttendanceAndHistory = async () => {
        try {
            if (user?._id) {
                const { data } = await axios.get(`/attendance/staff/${user._id}/history`);
                setAttendanceHistory(data.history || []);
            }
        } catch (e) {
            console.warn('Failed to load attendance history:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleApplyLeave = async () => {
        if (!leaveDate) {
            Alert.alert('Error', 'Please enter a leave date (YYYY-MM-DD)');
            return;
        }
        if (!leaveNote.trim()) {
            Alert.alert('Error', 'Please provide a leave reason');
            return;
        }
        try {
            setSubmittingLeave(true);
            const formData = new FormData();
            formData.append('date', leaveDate);
            formData.append('leaveNote', leaveNote.trim());

            await axios.post('/attendance/leave-application', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            Alert.alert('Success', 'Leave application submitted!');
            setLeaveDate('');
            setLeaveNote('');
            fetchAttendanceAndHistory();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to apply leave');
        } finally {
            setSubmittingLeave(false);
        }
    };

    const fetchData = async () => {
        await Promise.all([
            loadTasks(),
            fetchAttendanceAndHistory()
        ]);
    };

    useEffect(() => {
        fetchData();
    }, [user?._id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) return <LoadingScreen />;

    // Computed Stats
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyAttendance = attendanceHistory.filter(h => h.date?.startsWith(currentMonthStr));
    const presentDays = monthlyAttendance.filter(h => h.status === 'Present').length;
    const absentDays = monthlyAttendance.filter(h => h.status === 'Absent').length;
    const leaveDays = monthlyAttendance.filter(h => h.status === 'Leave').length;
    const totalMarked = presentDays + absentDays + leaveDays;
    const attendancePct = totalMarked > 0 ? `${Math.round((presentDays / totalMarked) * 100)}%` : 'N/A';

    const valuationPoints = (user?.staffProfile?.plusPoints || 0) - (user?.staffProfile?.minusPoints || 0);

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader
                title="Staff Workspace"
                rightIcon="person-circle-outline"
                rightAction={handleProfilePress}
                rightLongAction={() => setSwitcherVisible(true)}
            />

            {/* Quick Actions Top Tab Bar */}
            <View style={styles.topTabBar}>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => setActiveTab('home')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="home-outline" size={20} color={activeTab === 'home' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => setActiveTab('tasks')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="checkmark-done-circle-outline" size={20} color={activeTab === 'tasks' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'tasks' && styles.tabLabelActive]}>Tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => setActiveTab('attendance')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={20} color={activeTab === 'attendance' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'attendance' && styles.tabLabelActive]}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => setActiveTab('salary')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="card-outline" size={20} color={activeTab === 'salary' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'salary' && styles.tabLabelActive]}>Salary</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'home' && (
                <ScrollView
                    ref={scrollRef}
                    style={styles.container}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                >
                    {/* Welcome Banner */}
                    <View style={styles.welcomeBanner}>
                        <View style={styles.decorCircle1} />
                        <View style={styles.decorCircle2} />
                        <View style={styles.bannerContent}>
                            <View style={styles.badgeContainer}>
                                <Ionicons name="briefcase" size={12} color="#fef3c7" />
                                <Text style={styles.bannerBadgeText}>{user?.staffProfile?.designation || 'Staff Member'}</Text>
                            </View>
                            <Text style={styles.bannerTitle}>Staff Workspace Desk</Text>
                            <Text style={styles.bannerSub}>{user?.staffProfile?.department || 'Operations'} Department</Text>
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard title="Attendance" value={attendancePct} icon="trending-up-outline" color="#3b82f6" bg="#eff6ff" />
                        <StatCard title="Net Score" value={valuationPoints} icon="star-outline" color="#f59e0b" bg="#fffbeb" />
                    </View>

                    <View style={[styles.statsGrid, { marginTop: spacing.sm }]}>
                        <StatCard title="Present Days" value={presentDays} icon="checkmark-circle-outline" color="#10b981" bg="#ecfdf5" />
                        <StatCard title="Pending Tasks" value={tasks.filter(t => t.status === 'pending').length} icon="time-outline" color="#6366f1" bg="#f5f3ff" />
                    </View>

                    {/* Quick profile overview */}
                    <SectionCard style={{ marginTop: spacing.md }}>
                        <Text style={styles.sectionTitle}>Employee Information</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Designation</Text>
                            <Text style={styles.infoValue}>{user?.staffProfile?.designation || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Department</Text>
                            <Text style={styles.infoValue}>{user?.staffProfile?.department || 'N/A'}</Text>
                        </View>
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.infoLabel}>Salary Status</Text>
                            <Badge label={user?.staffProfile?.salaryStatus || 'Pending'} color={user?.staffProfile?.salaryStatus === 'Paid' ? '#10b981' : '#f59e0b'} />
                        </View>
                    </SectionCard>

                    <View style={{ height: 80 }} />
                </ScrollView>
            )}

            {activeTab === 'tasks' && (
                <View style={styles.workspaceBody}>
                    <SectionCard style={styles.addTaskCard}>
                        <Text style={styles.sectionTitle}>Create Staff Task</Text>
                        <TextInput
                            style={styles.inputField}
                            placeholder="Task title..."
                            placeholderTextColor={colors.textMuted}
                            value={newTaskTitle}
                            onChangeText={setNewTaskTitle}
                        />
                        <TextInput
                            style={[styles.inputField, { height: 60 }]}
                            placeholder="Task description (optional)..."
                            placeholderTextColor={colors.textMuted}
                            value={newTaskDesc}
                            onChangeText={setNewTaskDesc}
                            multiline
                        />
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
                                    <Ionicons
                                        name={item.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={22}
                                        color={item.status === 'done' ? '#10b981' : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.taskTitle, item.status === 'done' && styles.taskTitleDone]}>
                                        {item.title}
                                    </Text>
                                    {item.description ? (
                                        <Text style={styles.taskDesc}>{item.description}</Text>
                                    ) : null}
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
                        <TextInput
                            style={styles.inputField}
                            placeholder="Date (e.g. 2026-07-20)"
                            placeholderTextColor={colors.textMuted}
                            value={leaveDate}
                            onChangeText={setLeaveDate}
                        />
                        <TextInput
                            style={[styles.inputField, { height: 60 }]}
                            placeholder="Reason for leave..."
                            placeholderTextColor={colors.textMuted}
                            value={leaveNote}
                            onChangeText={setLeaveNote}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.addBtn, submittingLeave && { opacity: 0.5 }]}
                            onPress={handleApplyLeave}
                            disabled={submittingLeave}
                            activeOpacity={0.8}
                        >
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
                                    <Text style={styles.historyDetails}>
                                        {item.checkInTime ? `In: ${item.checkInTime}` : ''}
                                        {item.checkOutTime ? ` • Out: ${item.checkOutTime}` : ''}
                                    </Text>
                                </View>
                                <Badge
                                    label={item.status}
                                    color={item.status === 'Present' ? '#10b981' : item.status === 'Absent' ? '#ef4444' : '#f59e0b'}
                                />
                            </View>
                        )}
                        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No attendance logs found" />}
                        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
                    />
                </View>
            )}

            {activeTab === 'salary' && (
                <ScrollView style={styles.container}>
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Salary Ledger Information</Text>
                        <View style={styles.ledgerCard}>
                            <Text style={styles.salaryHeader}>Contract Base Salary</Text>
                            <Text style={styles.salaryAmt}>₹{Number(user?.staffProfile?.salary || 0).toLocaleString('en-IN')}</Text>
                            <View style={styles.ledgerRow}>
                                <Text style={styles.ledgerLabel}>Valuation Plus Points</Text>
                                <Text style={[styles.ledgerVal, { color: '#10b981' }]}>+{user?.staffProfile?.plusPoints || 0}</Text>
                            </View>
                            <View style={styles.ledgerRow}>
                                <Text style={styles.ledgerLabel}>Valuation Minus Points</Text>
                                <Text style={[styles.ledgerVal, { color: '#ef4444' }]}>-{user?.staffProfile?.minusPoints || 0}</Text>
                            </View>
                            <View style={[styles.ledgerRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.ledgerLabel}>Net Increment Base</Text>
                                <Text style={styles.ledgerVal}>{valuationPoints >= 0 ? `+${valuationPoints}` : valuationPoints}</Text>
                            </View>
                        </View>
                    </SectionCard>

                    <SectionCard style={{ marginTop: spacing.md }}>
                        <Text style={styles.sectionTitle}>Status</Text>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Salary Status</Text>
                            <Badge
                                label={user?.staffProfile?.salaryStatus || 'Pending'}
                                color={user?.staffProfile?.salaryStatus === 'Paid' ? '#10b981' : '#f59e0b'}
                            />
                        </View>
                    </SectionCard>
                    <View style={{ height: 80 }} />
                </ScrollView>
            )}

            {/* Sticky Bottom Tab Bar */}
            <View style={styles.bottomTabBar}>
                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('Drive')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cloud-upload-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Drive</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('Notes')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Notes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => {
                        setActiveTab('tasks');
                        Alert.alert('Tasks Workspace', 'Tasks lists view activated.');
                    }}
                    activeOpacity={0.75}
                >
                    <View style={styles.plusBtnCircle}>
                        <Ionicons name="add" size={28} color={colors.white} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('StudentPracticeTools')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="construct-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Tools</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('Chat')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubbles-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Chat</Text>
                </TouchableOpacity>
            </View>

            <ProfileBottomSheet visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
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
    tabLabelActive: {
        color: colors.accent,
    },
    container: { flex: 1, padding: spacing.md },
    welcomeBanner: {
        backgroundColor: '#064e3b',
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
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.1)',
    },
    bannerBadgeText: { fontSize: 9, fontWeight: '900', color: '#fef3c7', textTransform: 'uppercase' },
    bannerTitle: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.white },
    bannerSub: { fontSize: 11, color: '#a7f3d0', marginTop: 4, leadingHeight: 16, fontWeight: '500' },
    statsGrid: { flexDirection: 'row', gap: 8 },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text, marginBottom: spacing.sm },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    infoLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '500' },
    infoValue: { fontSize: fontSizes.sm, fontWeight: '750', color: colors.text },
    bottomTabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderTopWidth: 1.5,
        borderTopColor: colors.borderLight,
        paddingVertical: 8,
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 60,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    bottomTabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    bottomTabLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
        marginTop: 2,
    },
    plusBtnCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -18,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    workspaceBody: { flex: 1 },
    addTaskCard: { margin: spacing.md, marginBottom: spacing.sm },
    inputField: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        height: 40,
        fontSize: fontSizes.sm,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    addBtn: {
        backgroundColor: colors.accent,
        borderRadius: borderRadius.md,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtnText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '800' },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    checkWrapper: { marginRight: 10 },
    taskTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    taskTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    taskDesc: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    deleteBtn: { padding: 4 },
    leaveCard: { margin: spacing.md, marginBottom: spacing.sm },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    historyDate: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
    historyDetails: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    ledgerCard: {
        backgroundColor: colors.bgSecondary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.sm,
    },
    salaryHeader: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
    salaryAmt: { fontSize: fontSizes.xxl, fontWeight: '900', color: colors.accent, marginVertical: spacing.xs },
    ledgerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    ledgerLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: '600' },
    ledgerVal: { fontSize: fontSizes.xs, fontWeight: '750', color: colors.text },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600' },
});

export default StaffDashboard;
