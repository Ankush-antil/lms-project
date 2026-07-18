import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const ParentDashboard = ({ navigation }) => {
    const { user, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);
    const scrollRef = React.useRef(null);

    const [studentProfile, setStudentProfile] = useState(null);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [switcherVisible, setSwitcherVisible] = useState(false);

    const studentId = user?.parentProfile?.student?._id || user?.parentProfile?.student;

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
        try {
            if (!studentId) {
                setLoading(false);
                return;
            }
            const [profileRes, testsRes, subsRes] = await Promise.all([
                axios.get(`/users/view/${studentId}`),
                axios.get('/tests'),
                axios.get('/submissions'),
            ]);
            setStudentProfile(profileRes.data);
            setTests(testsRes.data);
            setSubmissions(subsRes.data);
        } catch (error) {
            console.warn("Error fetching child's dashboard data:", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [studentId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) return <LoadingScreen />;

    if (!studentId) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <AppHeader
                    title="Parent Workspace"
                    rightIcon="person-circle-outline"
                    rightAction={handleProfilePress}
                    rightLongAction={() => setSwitcherVisible(true)}
                />
                <View style={styles.noChildContainer}>
                    <Ionicons name="shield-alert-outline" size={60} color={colors.danger} style={{ marginBottom: 16 }} />
                    <Text style={styles.noChildTitle}>No Linked Student</Text>
                    <Text style={styles.noChildText}>
                        Please contact the administrator to link your parent account with your child's student profile.
                    </Text>
                </View>
                <ProfileBottomSheet visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
            </SafeAreaView>
        );
    }

    const submittedTestIds = new Set(submissions.map(s => s.test?._id || s.test));
    const pendingTestsCount = tests.filter(t => !submittedTestIds.has(t._id)).length;
    const completedTestsCount = tests.filter(t => submittedTestIds.has(t._id)).length;
    const recentSubmissions = submissions.slice(0, 5);

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader
                title="Parent Workspace"
                rightIcon="person-circle-outline"
                rightAction={handleProfilePress}
                rightLongAction={() => setSwitcherVisible(true)}
            />

            {/* Quick Actions Top Tab Bar */}
            <View style={styles.topTabBar}>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                    activeOpacity={0.7}
                >
                    <Ionicons name="home-outline" size={20} color={colors.accent} />
                    <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('StudentAttendanceHistory')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.tabLabel}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('StudentFeePortal')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.tabLabel}>Fee Status</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            >
                {/* Child Name & Welcome Banner */}
                <View style={styles.welcomeBanner}>
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />
                    <View style={styles.bannerContent}>
                        <View style={styles.badgeContainer}>
                            <Ionicons name="people" size={12} color="#fef3c7" />
                            <Text style={styles.bannerBadgeText}>Parent Desk</Text>
                        </View>
                        <Text style={styles.bannerTitle}>Welcome, {user?.name?.split(' ')[0]}!</Text>
                        <Text style={styles.bannerSub}>Monitor academic progress for your child, {studentProfile?.name}.</Text>
                    </View>
                </View>

                {/* Child Stats */}
                <View style={styles.statsGrid}>
                    <StatCard title="Pending Tests" value={pendingTestsCount} icon="time-outline" color="#f59e0b" bg="#fffbeb" />
                    <StatCard title="Completed" value={completedTestsCount} icon="checkmark-circle-outline" color="#10b981" bg="#ecfdf5" />
                </View>

                {/* Child's Recent Submissions */}
                <SectionCard style={{ marginTop: spacing.md }}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Submissions</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('StudentTests')}>
                            <Text style={styles.viewAllText}>View All →</Text>
                        </TouchableOpacity>
                    </View>

                    {recentSubmissions.length > 0 ? (
                        recentSubmissions.map((sub, index) => (
                            <View key={sub._id || index} style={styles.subItem}>
                                <View style={styles.subLeft}>
                                    <View style={styles.subIcon}>
                                        <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.subTitle} numberOfLines={1}>{sub.test?.title}</Text>
                                        <Text style={styles.subMeta}>
                                            {sub.test?.subject} • {sub.status ? sub.status.toUpperCase() : 'SUBMITTED'}
                                        </Text>
                                    </View>
                                </View>
                                {sub.score !== undefined ? (
                                    <Badge label={`${sub.score}/${sub.totalScore || 100}`} color="#10b981" bg="#ecfdf5" />
                                ) : null}
                            </View>
                        ))
                    ) : (
                        <EmptyState icon="document-outline" title="No test submissions recorded" />
                    )}
                </SectionCard>

                {/* Child profile details */}
                <SectionCard style={{ marginTop: spacing.sm }}>
                    <Text style={styles.sectionTitle}>Child Information Details</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Course</Text>
                        <Text style={styles.infoValue}>{studentProfile?.studentProfile?.course?.name || studentProfile?.studentProfile?.course || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Assigned Subject</Text>
                        <Text style={styles.infoValue}>{studentProfile?.studentProfile?.subject || 'N/A'}</Text>
                    </View>
                    <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.infoLabel}>Status</Text>
                        <Badge label="Active" color="#10b981" bg="#ecfdf5" />
                    </View>
                </SectionCard>

                <View style={{ height: 80 }} />
            </ScrollView>

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
                    onPress={() => navigation.navigate('StudentTests')}
                    activeOpacity={0.75}
                >
                    <View style={styles.plusBtnCircle}>
                        <Ionicons name="clipboard-outline" size={24} color={colors.white} />
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
    noChildContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    noChildTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text, marginBottom: 8 },
    noChildText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', leadingHeight: 20 },
    welcomeBanner: {
        backgroundColor: '#1e3a8a',
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
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
        backgroundColor: 'rgba(59, 130, 246, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    bannerBadgeText: { fontSize: 9, fontWeight: '900', color: '#fef3c7', textTransform: 'uppercase' },
    bannerTitle: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.white },
    bannerSub: { fontSize: 11, color: '#bfdbfe', marginTop: 4, leadingHeight: 16, fontWeight: '500' },
    statsGrid: { flexDirection: 'row', gap: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text, marginBottom: spacing.sm },
    viewAllText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.accent },
    subItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    subLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    subIcon: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.accent + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    subMeta: { fontSize: fontSizes.xs - 1, color: colors.textMuted, marginTop: 1 },
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
});

export default ParentDashboard;
