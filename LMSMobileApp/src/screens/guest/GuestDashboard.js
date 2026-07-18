import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    SafeAreaView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const GuestDashboard = ({ navigation }) => {
    const { user, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);

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

    const demoCourseName = user?.guestProfile?.demoCourse?.name || user?.guestProfile?.demoCourse || 'Trial Demo Course';

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader
                title="Guest Workspace"
                rightIcon="person-circle-outline"
                rightAction={handleProfilePress}
                rightLongAction={() => setSwitcherVisible(true)}
            />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Welcome Banner */}
                <View style={styles.welcomeBanner}>
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />
                    <View style={styles.bannerContent}>
                        <View style={styles.badgeContainer}>
                            <Ionicons name="eye-outline" size={12} color="#fef3c7" />
                            <Text style={styles.bannerBadgeText}>Guest Trial Access</Text>
                        </View>
                        <Text style={styles.bannerTitle}>Welcome, {user?.name || 'Guest'}!</Text>
                        <Text style={styles.bannerSub}>Explore our learning dashboard and practice tools during your trial.</Text>
                    </View>
                </View>

                {/* Trial Course Information */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Demo Course Program</Text>
                    <View style={styles.demoCard}>
                        <Ionicons name="ribbon-outline" size={32} color={colors.accent} style={{ marginBottom: spacing.sm }} />
                        <Text style={styles.demoCourseTitle}>{demoCourseName}</Text>
                        <Text style={styles.demoCourseDesc}>
                            You have guest view rights to study materials, sample practice tests, chat messaging, and cloud drives.
                        </Text>
                    </View>
                </SectionCard>

                {/* Next Steps CTA */}
                <SectionCard style={{ marginTop: spacing.sm }}>
                    <Text style={styles.sectionTitle}>Upgrade to Full Access</Text>
                    <Text style={styles.ctaText}>
                        Contact your institute administrator or admission desk to complete registration and unlock complete courses, graded test evaluations, salary/ledger registers, and more.
                    </Text>
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
                    onPress={() => navigation.navigate('StudentPracticeTools')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="construct-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Tools</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => {
                        Alert.alert('Contact Support', 'Guest trial chat is available. Navigate to chat screen to talk to the support team.');
                    }}
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
    container: { flex: 1, padding: spacing.md },
    welcomeBanner: {
        backgroundColor: '#475569',
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
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        top: -40,
        right: -40,
    },
    decorCircle2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        bottom: -30,
        left: '25%',
    },
    bannerContent: { zIndex: 1 },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    bannerBadgeText: { fontSize: 9, fontWeight: '900', color: '#fef3c7', textTransform: 'uppercase' },
    bannerTitle: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.white },
    bannerSub: { fontSize: 11, color: '#cbd5e1', marginTop: 4, leadingHeight: 16, fontWeight: '500' },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text, marginBottom: spacing.sm },
    demoCard: {
        backgroundColor: colors.bgSecondary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    demoCourseTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
    demoCourseDesc: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center', leadingHeight: 18 },
    ctaText: { fontSize: fontSizes.xs, color: colors.textSecondary, leadingHeight: 18 },
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
});

export default GuestDashboard;
