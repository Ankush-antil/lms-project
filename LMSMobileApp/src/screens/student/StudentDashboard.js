import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Alert,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const StudentDashboard = ({ navigation }) => {
    const { user, logout, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);
    const scrollRef = React.useRef(null);
    const [profile, setProfile] = useState(null);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [missedCalls, setMissedCalls] = useState([]);
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
        try {
            const [profileRes, testsRes, subsRes, missedRes] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/tests'),
                axios.get('/submissions'),
                axios.get('/calls/missed').catch(() => ({ data: [] })),
            ]);
            setProfile(profileRes.data);
            setTests(testsRes.data);
            setSubmissions(subsRes.data);
            setMissedCalls(missedRes.data);
        } catch (error) {
            console.warn('Dashboard fetch error:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const clearMissedCall = async (id) => {
        try {
            await axios.post(`/calls/missed/${id}/read`);
            setMissedCalls(prev => prev.filter(c => c._id !== id));
        } catch (e) { }
    };

    if (loading) return <LoadingScreen />;

    const submittedIds = new Set(submissions.map(s => s.test?._id || s.test));
    const pendingTests = tests.filter(t => !submittedIds.has(t._id));
    const completedTests = tests.filter(t => submittedIds.has(t._id));
    const upcomingTests = pendingTests.slice(0, 5);

    const firstName = profile?.name?.split(' ')[0] || 'Student';

    return (
        <View style={styles.container}>
            <AppHeader
                title="Student Dashboard"
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
                    <Ionicons name="home-outline" size={20} color="#3b82f6" />
                    <Text style={styles.tabLabel}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('StudentAttendanceHistory')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.tabLabel}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('StudentFeePortal')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="card-outline" size={20} color="#f59e0b" />
                    <Text style={styles.tabLabel}>Fees</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('ScanAttendance')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="qr-code-outline" size={20} color="#10b981" />
                    <Text style={styles.tabLabel}>QR Scanner</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            >
                {/* Tags */}
                <View style={styles.tagsRow}>
                    {profile?.studentProfile?.subject && (
                        <Badge label={profile.studentProfile.subject} color={colors.accent} bg="#eef2ff" />
                    )}
                    {profile?.studentProfile?.course?.name && (
                        <Badge label={profile.studentProfile.course.name} color={colors.textSecondary} bg={colors.bgSecondary} />
                    )}
                </View>

                {/* Stat Cards */}
                <View style={styles.statsRow}>
                    <StatCard
                        title="Pending Tests"
                        value={pendingTests.length}
                        icon="time-outline"
                        color={colors.orange}
                        bg="#fff7ed"
                    />
                    <StatCard
                        title="Completed"
                        value={completedTests.length}
                        icon="checkmark-circle-outline"
                        color={colors.success}
                        bg="#ecfdf5"
                    />
                </View>

                {/* Profile Info */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>My Profile</Text>
                    <View style={styles.profileRow}>
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileAvatarText}>{profile?.name?.[0]}</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{profile?.name}</Text>
                            <Text style={styles.profileEmail}>{profile?.email}</Text>
                        </View>
                    </View>
                    <View style={styles.profileDetails}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Institute</Text>
                            <Text style={styles.detailValue}>{profile?.institute?.name || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Subject</Text>
                            <Text style={styles.detailValue}>{profile?.studentProfile?.subject || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Enrolled</Text>
                            <Text style={styles.detailValue}>
                                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                            </Text>
                        </View>
                        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <Badge label="Active" color={colors.success} bg="#ecfdf5" />
                        </View>
                    </View>
                </SectionCard>
            </ScrollView>

            {/* Sticky Bottom Tab Bar (YouTube/Facebook Style) */}
            <View style={styles.bottomTabBar}>
                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('Drive')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cloud-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Drive</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('Notes')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Notes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('StudentTests')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="clipboard-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Activities</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('StudentPracticeTools')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="construct-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Tools</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('ContactTeacher')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubbles-outline" size={20} color={colors.textSecondary} />
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
    welcomeBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    welcomeLeft: {},
    welcomeGreeting: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.text,
    },
    welcomeSub: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: 2,
    },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.white,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.md,
    },
    missedCallsCard: {
        borderColor: '#fecaca',
        borderWidth: 1,
        backgroundColor: '#fff5f5',
    },
    missedCallTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.danger,
    },
    sectionTitleDanger: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.danger,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    missedCallItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    missedCallerName: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.text,
    },
    missedCallTime: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
    },
    dismissBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.text,
    },
    viewAll: {
        fontSize: fontSizes.sm,
        color: colors.accent,
        fontWeight: '600',
    },
    testItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    testIcon: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    testInfo: { flex: 1 },
    testTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    testMeta: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    startBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: borderRadius.md,
    },
    startBtnText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '700',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileAvatarText: {
        fontSize: fontSizes.xxl,
        fontWeight: '800',
        color: colors.white,
    },
    profileInfo: { flex: 1 },
    profileName: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.text,
    },
    profileEmail: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
    },
    profileDetails: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    detailLabel: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
    },
    detailValue: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.text,
    },
    chatBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#eef2ff',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1.5,
        borderColor: '#e0e7ff',
    },
    chatBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 4,
    },
    chatIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatBannerTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text,
    },
    chatBannerSub: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        marginTop: 2,
    },
});

export default StudentDashboard;
