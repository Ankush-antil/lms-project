import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, TextInput, Dimensions, Alert
} from 'react-native';
import axios from 'axios';
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

    const fetchData = async () => {
        if (isEditor) {
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
              ]
          );

    const titleText = isEditor ? "Editor Dashboard" : (isInstitute ? "Institute Dashboard" : "Admin Dashboard");
    const bannerSub = isEditor ? "Create & manage test resources" : (isInstitute ? "Manage your institute resources" : "Manage your LMS system");
    const badgeText = isEditor ? "Editor" : (isInstitute ? "Institute" : "Admin");
    const badgeBg = isEditor ? '#eef2ff' : (isInstitute ? '#fffbeb' : '#fef2f2');
    const badgeColor = isEditor ? colors.accent : (isInstitute ? colors.warning : colors.admin);
    const badgeIcon = isEditor ? "create-outline" : (isInstitute ? "business-outline" : "shield-checkmark");

    return (
        <View style={styles.container}>
            <AppHeader 
                title={titleText} 
                rightIcon="person-circle-outline" 
                rightAction={handleProfilePress} 
                rightLongAction={() => setSwitcherVisible(true)} 
            />

            {/* Quick Actions Top Tab Bar (like Teacher Dashboard) */}
            <View style={styles.topTabBar}>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('TeacherAttendanceRegister')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={20} color={colors.teacher} />
                    <Text style={styles.tabLabel}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('CoursesList')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="book-outline" size={20} color={colors.warning} />
                    <Text style={styles.tabLabel}>Courses</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('SubjectsList')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="document-text-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.tabLabel}>Subjects</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('Drive')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cloud-upload-outline" size={20} color="#06b6d4" />
                    <Text style={styles.tabLabel}>Drive</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('Notes')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={20} color="#ec4899" />
                    <Text style={styles.tabLabel}>Notes</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={isEditor ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.admin} />}
            >

                {/* Stat Cards */}
                {!isEditor && (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.statsHorizontal}
                        contentContainerStyle={styles.statsHorizontalContent}
                    >
                        <View style={[styles.statCardWrapper, { width: cardWidth }]}>
                            <StatCard title="Students" value={stats?.students} icon="person" color={colors.student} bg="#eef2ff" />
                        </View>
                        <View style={[styles.statCardWrapper, { width: cardWidth }]}>
                            <StatCard title="Teachers" value={stats?.teachers} icon="people" color={colors.teacher} bg="#ecfdf5" />
                        </View>
                        <View style={[styles.statCardWrapper, { width: cardWidth }]}>
                            <StatCard title="Editors" value={stats?.editors} icon="create-outline" color={colors.accent} bg="#eef2ff" />
                        </View>
                        <View style={[styles.statCardWrapper, { width: cardWidth }]}>
                            <StatCard title="Tests" value={stats?.tests} icon="document-text" color={colors.admin} bg="#fef2f2" />
                        </View>
                        <View style={[styles.statCardWrapper, { width: cardWidth }]}>
                            <StatCard title="Courses" value={stats?.courses} icon="book" color={colors.warning} bg="#fef3c7" />
                        </View>
                        {!isInstitute && (
                            <View style={[styles.statCardWrapper, { width: cardWidth }]}>
                                <StatCard title="Institutes" value={stats?.institutes} icon="business" color={colors.accent} bg="#eef2ff" />
                            </View>
                        )}
                    </ScrollView>
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

            {/* Sticky 5-Element Bottom Tab Bar */}
            <View style={styles.bottomTabBar}>
                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                    activeOpacity={0.7}
                >
                    <Ionicons name="home" size={22} color={colors.accent} />
                    <Text style={[styles.bottomTabLabel, { color: colors.accent }]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('UserDirectory')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="people-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Users</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('CreateUser')}
                    activeOpacity={0.75}
                >
                    <View style={styles.plusBtnCircle}>
                        <Ionicons name="add" size={28} color={colors.white} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('AdminFeePortal')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="card-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Fees</Text>
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
});

export default AdminDashboard;
