import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, TextInput, Dimensions, Alert, Modal, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const AdminDashboard = ({ navigation }) => {
    const { user, logout, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);
    const scrollRef = React.useRef(null);
    const isEditor = user?.role === 'Editor';
    const isInstitute = user?.role === 'Institute';
    
    const { width: screenWidth } = Dimensions.get('window');
    const cardWidth = (screenWidth - spacing.md * 2 - 16) / 3;
    
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [switcherVisible, setSwitcherVisible] = useState(false);
    const [contentMenuVisible, setContentMenuVisible] = useState(false);
    const [userMenuVisible, setUserMenuVisible] = useState(false);
    const [createMenuVisible, setCreateMenuVisible] = useState(false);
    const [servicesMenuVisible, setServicesMenuVisible] = useState(false);
    const [managementMenuVisible, setManagementMenuVisible] = useState(false);

    // Editor Staff View States
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

    // Editor Staff Tasks & Attendance Logic
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
        if (isEditor) {
            await Promise.all([loadTasks(), fetchAttendanceAndHistory()]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const { data } = await axios.get('/dashboard/stats');
            setStats(data.stats);
        } catch (e) { console.warn('Fetch stats error:', e.message); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <LoadingScreen />;

    const headerActions = [
        { label: 'Attendance', icon: 'calendar-outline', screen: 'TeacherAttendanceRegister', color: colors.teacher },
        { label: 'Courses', icon: 'book-outline', screen: 'CoursesList', color: colors.warning },
        { label: 'Subjects', icon: 'document-text-outline', screen: 'SubjectsList', color: '#8b5cf6' },
        { label: 'Drive', icon: 'cloud-upload-outline', screen: 'Drive', color: '#06b6d4' },
        { label: 'Notes', icon: 'create-outline', screen: 'Notes', color: '#ec4899' },
    ];

    const quickLinks = isEditor 
        ? [
            { label: 'Tests List', icon: 'document-text', screen: 'TestsList', color: colors.admin, bg: '#fef2f2' },
            { label: 'Test Builder', icon: 'add-circle', screen: 'TestBuilder', color: colors.success, bg: '#ecfdf5' },
          ]
        : (isInstitute
            ? [
                { label: 'Students', icon: 'person', screen: 'StudentsList', color: colors.student, bg: '#eef2ff' },
                { label: 'Teachers', icon: 'people', screen: 'TeachersList', color: colors.teacher, bg: '#ecfdf5' },
                { label: 'Editors', icon: 'create-outline', screen: 'EditorsList', color: colors.accent, bg: '#eef2ff' },
                { label: 'Accountants', icon: 'calculator-outline', screen: 'AccountantsList', color: '#b45309', bg: '#fef3c7' },
                { label: 'Marketers', icon: 'megaphone-outline', screen: 'MarketersList', color: '#0f766e', bg: '#ccfbf1' },
                { label: 'Tests', icon: 'document-text', screen: 'TestsList', color: colors.admin, bg: '#fef2f2' },
                { label: 'Test Builder', icon: 'add-circle', screen: 'TestBuilder', color: colors.success, bg: '#ecfdf5' },
                { label: 'Attendance Register', icon: 'calendar-outline', screen: 'TeacherAttendanceRegister', color: colors.teacher, bg: '#fef3c7' },
              ]
            : [
                { label: 'Students', icon: 'person', screen: 'StudentsList', color: colors.student, bg: '#eef2ff' },
                { label: 'Teachers', icon: 'people', screen: 'TeachersList', color: colors.teacher, bg: '#ecfdf5' },
                { label: 'Editors', icon: 'create-outline', screen: 'EditorsList', color: colors.accent, bg: '#eef2ff' },
                { label: 'Accountants', icon: 'calculator-outline', screen: 'AccountantsList', color: '#b45309', bg: '#fef3c7' },
                { label: 'Marketers', icon: 'megaphone-outline', screen: 'MarketersList', color: '#0f766e', bg: '#ccfbf1' },
                { label: 'Institutes', icon: 'business', screen: 'InstitutesList', color: colors.accent, bg: '#eef2ff' },
                { label: 'Tests', icon: 'document-text', screen: 'TestsList', color: colors.admin, bg: '#fef2f2' },
                { label: 'Test Builder', icon: 'add-circle', screen: 'TestBuilder', color: colors.success, bg: '#ecfdf5' },
                { label: 'Attendance Register', icon: 'calendar-outline', screen: 'TeacherAttendanceRegister', color: colors.teacher, bg: '#fef3c7' },
                { label: 'Fee Portal', icon: 'card-outline', screen: 'AdminFeePortal', color: '#06b6d4', bg: '#ecfdf5' },
              ]
          );

    const titleText = isEditor ? "Editor Dashboard" : (isInstitute ? "Institute Dashboard" : "Admin Dashboard");
    const bannerSub = isEditor ? "Create & manage test resources" : (isInstitute ? "Manage your institute resources" : "Manage your LMS system");
    const badgeText = isEditor ? "Editor" : (isInstitute ? "Institute" : "Admin");
    const badgeBg = isEditor ? '#eef2ff' : (isInstitute ? '#fffbeb' : '#fef2f2');
    const badgeColor = isEditor ? colors.accent : (isInstitute ? colors.warning : colors.admin);
    const badgeIcon = isEditor ? "create-outline" : (isInstitute ? "business-outline" : "shield-checkmark");

    // Computed display stats with fallback support for older backend versions
    const displayTotalUsers = stats?.totalUsers !== undefined ? stats.totalUsers : ((stats?.students || 0) + (stats?.teachers || 0) + (stats?.editors || 0));
    const displayRegisteredUsers = stats?.registeredUsers !== undefined ? stats.registeredUsers : ((stats?.students || 0) + (stats?.teachers || 0) + (stats?.editors || 0));
    const displayGuestUsers = stats?.guestUsers ?? 0;
    const displayLimitedUsers = stats?.limitedUsers ?? 0;
    const displayStudents = stats?.students ?? 0;
    const displayTeachers = stats?.teachers ?? 0;
    const displayEditors = stats?.editors ?? 0;
    const displayInstitutes = stats?.institutes ?? 0;
    const displayStaff = stats?.staff ?? 0;
    const displayAccountants = stats?.accountants ?? 0;
    const displayMarketers = stats?.marketers ?? 0;
    const displayParents = stats?.parents ?? 0;
    const displayCourses = stats?.courses ?? 0;
    const displaySubjects = stats?.subjects ?? 0;
    const displayActivities = stats?.tests ?? 0;
    const displayServices = stats?.services ?? 3;

    return (
        <View style={styles.container}>
            <AppHeader 
                title={titleText} 
                rightIcon="person-circle-outline" 
                rightAction={handleProfilePress} 
                rightLongAction={() => setSwitcherVisible(true)} 
            />

            {/* Quick Actions Top Tab Bar */}
            <View style={styles.topTabBar}>
                {isEditor ? (
                    <>
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
                    </>
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.tabBtn}
                            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="home-outline" size={20} color={colors.accent} />
                            <Text style={styles.tabLabel}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.tabBtn}
                            onPress={() => setUserMenuVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="people-outline" size={20} color={colors.student} />
                            <Text style={styles.tabLabel}>Users</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.tabBtn}
                            onPress={() => setContentMenuVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="albums-outline" size={20} color={colors.warning} />
                            <Text style={styles.tabLabel}>Content</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.tabBtn}
                            onPress={() => setManagementMenuVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="settings-outline" size={20} color={colors.teacher} />
                            <Text style={styles.tabLabel}>Management</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {(!isEditor || activeTab === 'home') && (
                <ScrollView
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={isEditor ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.admin} />}
                >
                    {/* 2-Column Ecosystem Stat Cards Grid */}
                    {!isEditor && (
                        <View style={styles.statsGrid}>
                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('UserDirectory')} activeOpacity={0.85}>
                                    <StatCard title="Total User" value={displayTotalUsers} icon="people-outline" color="#475569" bg="#f1f5f9" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('UserDirectory')} activeOpacity={0.85}>
                                    <StatCard title="Registered User" value={displayRegisteredUsers} icon="person-add-outline" color="#4f46e5" bg="#eef2ff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('UserDirectory')} activeOpacity={0.85}>
                                    <StatCard title="Guest User" value={displayGuestUsers} icon="person-outline" color="#d97706" bg="#fef3c7" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('UserDirectory')} activeOpacity={0.85}>
                                    <StatCard title="Limited User" value={displayLimitedUsers} icon="person-remove-outline" color="#e11d48" bg="#ffe4e6" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('StudentsList')} activeOpacity={0.85}>
                                    <StatCard title="Student" value={displayStudents} icon="school-outline" color="#3b82f6" bg="#eff6ff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('TeachersList')} activeOpacity={0.85}>
                                    <StatCard title="Teacher" value={displayTeachers} icon="checkmark-done-circle-outline" color="#10b981" bg="#ecfdf5" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('EditorsList')} activeOpacity={0.85}>
                                    <StatCard title="Editor" value={displayEditors} icon="create-outline" color="#ec4899" bg="#fdf2f8" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('InstitutesList')} activeOpacity={0.85}>
                                    <StatCard title="Institute" value={displayInstitutes} icon="business-outline" color="#f97316" bg="#fff7ed" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('AccountantsList')} activeOpacity={0.85}>
                                    <StatCard title="Accountants" value={displayAccountants} icon="calculator-outline" color="#0d9488" bg="#f0fdfa" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('MarketersList')} activeOpacity={0.85}>
                                    <StatCard title="Marketers" value={displayMarketers} icon="megaphone-outline" color="#eab308" bg="#fef9c3" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('ParentsList')} activeOpacity={0.85}>
                                    <StatCard title="Parents" value={displayParents} icon="heart-outline" color="#f43f5e" bg="#fff1f2" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('CoursesList')} activeOpacity={0.85}>
                                    <StatCard title="Courses" value={displayCourses} icon="book-outline" color="#06b6d4" bg="#ecfeff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('SubjectsList')} activeOpacity={0.85}>
                                    <StatCard title="Subjects" value={displaySubjects} icon="folder-open-outline" color="#8b5cf6" bg="#f5f3ff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => navigation.navigate('TeacherActivities')} activeOpacity={0.85}>
                                    <StatCard title="Activities" value={displayActivities} icon="document-text-outline" color="#a855f7" bg="#faf5ff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridCardCol} onPress={() => setServicesMenuVisible(true)} activeOpacity={0.85}>
                                    <StatCard title="Services" value={displayServices} icon="settings-outline" color="#65a30d" bg="#f7fee7" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Quick Links */}
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Manage</Text>
                        <View style={styles.quickLinks}>
                            {quickLinks.map(link => (
                                <TouchableOpacity
                                    key={link.label}
                                    style={styles.quickLink}
                                    onPress={() => navigation.navigate(link.screen)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.quickLinkIcon, { backgroundColor: link.bg }]}>
                                        <Ionicons name={link.icon} size={22} color={link.color} />
                                    </View>
                                    <Text style={styles.quickLinkLabel}>{link.label}</Text>
                                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </SectionCard>
                </ScrollView>
            )}

            {isEditor && activeTab === 'tasks' && (
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

            {isEditor && activeTab === 'attendance' && (
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

            {isEditor && activeTab === 'salary' && (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Salary Ledger Information</Text>
                        <View style={styles.ledgerCard}>
                            <Text style={styles.salaryHeader}>Contract Base Salary</Text>
                            <Text style={styles.salaryAmt}>₹{Number(user?.editorProfile?.salary || user?.staffProfile?.salary || 0).toLocaleString('en-IN')}</Text>
                        </View>
                    </SectionCard>
                    <SectionCard style={{ marginTop: spacing.md }}>
                        <Text style={styles.sectionTitle}>Status</Text>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Salary Status</Text>
                            <Badge label={user?.editorProfile?.salaryStatus || 'Paid'} color="#10b981" />
                        </View>
                    </SectionCard>
                    <View style={{ height: 80 }} />
                </ScrollView>
            )}

            {/* Sticky 5-Element Bottom Tab Bar - Refactored */}
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
                    onPress={() => setCreateMenuVisible(true)}
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

            {/* Content Selection Dropdown Modal */}
            <Modal
                visible={contentMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setContentMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setContentMenuVisible(false)}
                >
                    <View style={styles.dropdownContainer}>
                        <Text style={styles.dropdownTitle}>Content Management</Text>
                        
                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setContentMenuVisible(false);
                                navigation.navigate('CoursesList');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#fffbeb' }]}>
                                <Ionicons name="book-outline" size={22} color={colors.warning} />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Courses</Text>
                                <Text style={styles.dropdownItemSub}>Manage course categories & details</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setContentMenuVisible(false);
                                navigation.navigate('SubjectsList');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#f5f3ff' }]}>
                                <Ionicons name="document-text-outline" size={22} color="#8b5cf6" />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Subjects</Text>
                                <Text style={styles.dropdownItemSub}>Configure subjects & curriculum</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setContentMenuVisible(false);
                                navigation.navigate('TeacherActivities');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#eef2ff' }]}>
                                <Ionicons name="clipboard-outline" size={22} color={colors.accent} />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Activities</Text>
                                <Text style={styles.dropdownItemSub}>View activities & student submissions</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.closeDropdownBtn} 
                            onPress={() => setContentMenuVisible(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeDropdownText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Users Selection Dropdown Modal */}
            <Modal
                visible={userMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setUserMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setUserMenuVisible(false)}
                >
                    <View style={styles.dropdownContainer}>
                        <Text style={styles.dropdownTitle}>User Directory</Text>
                        
                        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('UserDirectory');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#f1f5f9' }]}>
                                    <Ionicons name="people-outline" size={22} color="#475569" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Users</Text>
                                    <Text style={styles.dropdownItemSub}>Ecosystem global user directory</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('StudentsList');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#eff6ff' }]}>
                                    <Ionicons name="school-outline" size={22} color="#3b82f6" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Students</Text>
                                    <Text style={styles.dropdownItemSub}>Manage student accounts & records</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('TeachersList');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#ecfdf5' }]}>
                                    <Ionicons name="checkmark-done-circle-outline" size={22} color="#10b981" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Teachers</Text>
                                    <Text style={styles.dropdownItemSub}>Manage faculty accounts & details</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('EditorsList');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#fdf2f8' }]}>
                                    <Ionicons name="create-outline" size={22} color="#ec4899" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Editors</Text>
                                    <Text style={styles.dropdownItemSub}>Manage content editor privileges</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('InstitutesList');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#fff7ed' }]}>
                                    <Ionicons name="business-outline" size={22} color="#f97316" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Institutes</Text>
                                    <Text style={styles.dropdownItemSub}>Manage educational branch offices</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('AccountantsList');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#f0fdfa' }]}>
                                    <Ionicons name="calculator-outline" size={22} color="#0d9488" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Accountants</Text>
                                    <Text style={styles.dropdownItemSub}>Manage accounting department users</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('MarketersList');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#fef9c3' }]}>
                                    <Ionicons name="megaphone-outline" size={22} color="#eab308" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Marketers</Text>
                                    <Text style={styles.dropdownItemSub}>Manage sales & marketing members</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setUserMenuVisible(false);
                                    navigation.navigate('ParentsList');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconContainer, { backgroundColor: '#fff1f2' }]}>
                                    <Ionicons name="heart-outline" size={22} color="#f43f5e" />
                                </View>
                                <View style={styles.dropdownTextContainer}>
                                    <Text style={styles.dropdownItemText}>Parents</Text>
                                    <Text style={styles.dropdownItemSub}>Manage parent accounts & links</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.closeDropdownBtn} 
                            onPress={() => setUserMenuVisible(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeDropdownText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Quick Create Bottom Sheet Modal */}
            <Modal
                visible={createMenuVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCreateMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.bottomSheetOverlay} 
                    activeOpacity={1} 
                    onPress={() => setCreateMenuVisible(false)}
                >
                    <View style={styles.bottomSheetContainer}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Quick Create</Text>
                            <TouchableOpacity onPress={() => setCreateMenuVisible(false)}>
                                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView contentContainerStyle={styles.bottomSheetGrid} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateUser', { role: 'Student' });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#eff6ff' }]}>
                                    <Ionicons name="school" size={22} color="#3b82f6" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Student</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateUser', { role: 'Teacher' });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#ecfdf5' }]}>
                                    <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Teacher</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateUser', { role: 'Editor' });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#fdf2f8' }]}>
                                    <Ionicons name="create" size={22} color="#ec4899" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Editor</Text>
                            </TouchableOpacity>



                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateUser', { role: 'Accountant' });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#f0fdfa' }]}>
                                    <Ionicons name="calculator" size={22} color="#0d9488" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Accountant</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateUser', { role: 'Marketer' });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#fef9c3' }]}>
                                    <Ionicons name="megaphone" size={22} color="#eab308" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Marketer</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateUser', { role: 'Parent' });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#fff1f2' }]}>
                                    <Ionicons name="heart" size={22} color="#f43f5e" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Parent</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateInstitute');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#fff7ed' }]}>
                                    <Ionicons name="business" size={22} color="#f97316" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Institute</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setCreateMenuVisible(false);
                                    navigation.navigate('CreateCourse');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.bottomSheetIcon, { backgroundColor: '#ecfeff' }]}>
                                    <Ionicons name="book" size={22} color="#06b6d4" />
                                </View>
                                <Text style={styles.bottomSheetLabel}>Course</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Services Selection Dropdown Modal */}
            <Modal
                visible={servicesMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setServicesMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setServicesMenuVisible(false)}
                >
                    <View style={styles.dropdownContainer}>
                        <Text style={styles.dropdownTitle}>Services Portal</Text>
                        
                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setServicesMenuVisible(false);
                                navigation.navigate('Drive');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#ecfeff' }]}>
                                <Ionicons name="cloud-upload-outline" size={22} color="#06b6d4" />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Drive</Text>
                                <Text style={styles.dropdownItemSub}>Access ecosystem shared files & drives</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setServicesMenuVisible(false);
                                navigation.navigate('Notes');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#fdf2f8' }]}>
                                <Ionicons name="create-outline" size={22} color="#ec4899" />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Notes</Text>
                                <Text style={styles.dropdownItemSub}>Write & manage study & class notes</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setServicesMenuVisible(false);
                                navigation.navigate('Chat');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#eef2ff' }]}>
                                <Ionicons name="chatbubbles-outline" size={22} color={colors.accent} />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Chat</Text>
                                <Text style={styles.dropdownItemSub}>Discuss with teachers, peers & admins</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.closeDropdownBtn} 
                            onPress={() => setServicesMenuVisible(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeDropdownText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Management Selection Dropdown Modal */}
            <Modal
                visible={managementMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setManagementMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setManagementMenuVisible(false)}
                >
                    <View style={styles.dropdownContainer}>
                        <Text style={styles.dropdownTitle}>Management Portal</Text>
                        
                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setManagementMenuVisible(false);
                                navigation.navigate('AssetMgt');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#eef2ff' }]}>
                                <Ionicons name="cube-outline" size={22} color={colors.accent} />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Asset Mgt</Text>
                                <Text style={styles.dropdownItemSub}>Track hardware, IT & office assets</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setManagementMenuVisible(false);
                                navigation.navigate('LeadMgt');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#fef3c7' }]}>
                                <Ionicons name="funnel-outline" size={22} color="#f59e0b" />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Lead Mgt</Text>
                                <Text style={styles.dropdownItemSub}>Track student leads & applications</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setManagementMenuVisible(false);
                                navigation.navigate('AdsMgt');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dropdownIconContainer, { backgroundColor: '#ecfdf5' }]}>
                                <Ionicons name="stats-chart-outline" size={22} color="#10b981" />
                            </View>
                            <View style={styles.dropdownTextContainer}>
                                <Text style={styles.dropdownItemText}>Ads Mgt</Text>
                                <Text style={styles.dropdownItemSub}>Manage meta/google campaigns & budgets</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.closeDropdownBtn} 
                            onPress={() => setManagementMenuVisible(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeDropdownText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 80 },
    welcomeBanner: {
        marginBottom: spacing.md,
    },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        marginBottom: 6,
    },
    adminBadgeText: { fontSize: fontSizes.xs, fontWeight: '800', textTransform: 'uppercase' },
    welcomeTitle: { fontSize: fontSizes.xxl, fontWeight: '900', color: colors.text },
    welcomeSub: { fontSize: fontSizes.sm, color: colors.textMuted },
    statsHorizontal: {
        marginBottom: spacing.md,
    },
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
    statsHorizontalContent: {
        paddingHorizontal: 2,
    },
    statCardWrapper: {
        marginRight: 8,
    },
    sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    quickLinks: {},
    quickLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    quickLinkIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLinkLabel: {
        flex: 1,
        fontSize: fontSizes.md,
        fontWeight: '600',
        color: colors.text,
    },
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
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    bottomTabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    bottomTabLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginTop: 2,
    },
    plusBtnCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        marginTop: -10,
    },
    headerActionsContainer: {
        marginBottom: spacing.md,
    },
    headerActionsScroll: {
        paddingHorizontal: spacing.xs,
        gap: 12,
    },
    headerActionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        minWidth: 84,
        elevation: 0.5,
    },
    headerActionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    headerActionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    dropdownContainer: {
        width: '90%',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    dropdownTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    dropdownIconContainer: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    dropdownTextContainer: {
        flex: 1,
    },
    dropdownItemText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    dropdownItemSub: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    closeDropdownBtn: {
        marginTop: spacing.lg,
        paddingVertical: 12,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    closeDropdownText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    statsGrid: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        gap: 12,
        marginBottom: spacing.md,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    gridCardCol: {
        flex: 1,
    },
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.lg,
        maxHeight: '65%',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    bottomSheetTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text,
    },
    bottomSheetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12,
        paddingBottom: 24,
    },
    bottomSheetItem: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 16,
    },
    bottomSheetIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    bottomSheetLabel: {
        fontSize: fontSizes.xs - 1,
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

export default AdminDashboard;
