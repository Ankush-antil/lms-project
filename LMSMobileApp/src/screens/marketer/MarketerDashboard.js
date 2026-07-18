import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    TextInput,
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const MarketerDashboard = ({ navigation }) => {
    const { user, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);
    const scrollRef = React.useRef(null);

    const [activeTab, setActiveTab] = useState('home'); // 'home' | 'leads'
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
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

    const fetchApplications = async () => {
        try {
            const { data } = await axios.get('/setup/institute-applications');
            setApplications(data || []);
        } catch (error) {
            console.warn('Error fetching applications for marketer:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchApplications();
    };

    const handleUpdateAppStatus = async (id, status) => {
        try {
            await axios.put(`/setup/applications/${id}/status`, { status });
            Alert.alert('Success', `Lead status updated to ${status}`);
            setApplications(prev => prev.map(app => app._id === id ? { ...app, status } : app));
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDeleteApplication = (id) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this lead?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/setup/applications/${id}`);
                            Alert.alert('Success', 'Lead deleted successfully');
                            setApplications(prev => prev.filter(app => app._id !== id));
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.message || 'Failed to delete lead');
                        }
                    }
                }
            ]
        );
    };

    if (loading) return <LoadingScreen />;

    // Calculate Stats
    const totalLeads = applications.length;
    const pendingLeads = applications.filter(app => app.status === 'Applied' || app.status === 'Under Review').length;
    const activeDemos = applications.filter(app => app.status === 'Accepted').length;
    const registeredCount = applications.filter(app => app.status === 'Registered').length;

    // Filter Leads
    const filteredLeads = applications.filter(app => {
        const matchesSearch =
            (app.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.guestEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.guestPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.course?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Registered':
                return { text: '#10b981', bg: '#ecfdf5' };
            case 'Accepted': // Active Demo
                return { text: '#3b82f6', bg: '#eff6ff' };
            case 'Under Review':
                return { text: '#f59e0b', bg: '#fffbeb' };
            case 'Applied':
                return { text: '#6366f1', bg: '#f5f3ff' };
            case 'Rejected':
                return { text: '#ef4444', bg: '#fef2f2' };
            default:
                return { text: colors.textSecondary, bg: colors.bgSecondary };
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader
                title="Marketer Workspace"
                rightIcon="person-circle-outline"
                rightAction={handleProfilePress}
                rightLongAction={() => setSwitcherVisible(true)}
            />

            {/* Quick Actions Top Tab Bar */}
            <View style={styles.topTabBar}>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => {
                        setActiveTab('home');
                        scrollRef.current?.scrollTo({ y: 0, animated: true });
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="home-outline" size={20} color={activeTab === 'home' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => setActiveTab('leads')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="people-outline" size={20} color={activeTab === 'leads' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'leads' && styles.tabLabelActive]}>Leads Desk</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'home' ? (
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
                                <Ionicons name="sparkles" size={12} color="#fef3c7" />
                                <Text style={styles.bannerBadgeText}>Marketer Workspace</Text>
                            </View>
                            <Text style={styles.bannerTitle}>Marketing Control Desk</Text>
                            <Text style={styles.bannerSub}>Track leads, coordinate demo tests, and check affiliate referral programs.</Text>
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard title="Total Leads" value={totalLeads} icon="people-outline" color="#3b82f6" bg="#eff6ff" />
                        <StatCard title="Pending" value={pendingLeads} icon="time-outline" color="#f59e0b" bg="#fffbeb" />
                    </View>
                    <View style={[styles.statsGrid, { marginTop: spacing.sm }]}>
                        <StatCard title="Active Demos" value={activeDemos} icon="play-circle-outline" color="#6366f1" bg="#f5f3ff" />
                        <StatCard title="Registered" value={registeredCount} icon="checkmark-circle-outline" color="#10b981" bg="#ecfdf5" />
                    </View>

                    {/* Recent Leads Preview */}
                    <SectionCard style={{ marginTop: spacing.md }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Leads ({applications.slice(0, 5).length})</Text>
                            <TouchableOpacity onPress={() => setActiveTab('leads')}>
                                <Text style={styles.viewAllText}>View All →</Text>
                            </TouchableOpacity>
                        </View>

                        {applications.length === 0 ? (
                            <EmptyState icon="people-outline" title="No leads found" />
                        ) : (
                            applications.slice(0, 5).map((lead, idx) => {
                                const colorsStatus = getStatusColor(lead.status);
                                return (
                                    <View key={idx} style={styles.leadItemPreview}>
                                        <View style={styles.leadLeft}>
                                            <View style={styles.leadAvatar}>
                                                <Text style={styles.leadAvatarText}>{lead.guestName?.[0] || 'L'}</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.leadName}>{lead.guestName}</Text>
                                                <Text style={styles.leadCourse}>{lead.course?.name || 'No Course'}</Text>
                                            </View>
                                        </View>
                                        <Badge label={lead.status} color={colorsStatus.text} bg={colorsStatus.bg} />
                                    </View>
                                );
                            })
                        )}
                    </SectionCard>

                    <View style={{ height: 80 }} />
                </ScrollView>
            ) : (
                <View style={styles.leadsContainer}>
                    {/* Search and Filters */}
                    <View style={styles.searchFilterBar}>
                        <View style={styles.searchWrapper}>
                            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search leads by name, phone..."
                                placeholderTextColor={colors.textMuted}
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                            {searchTerm ? (
                                <TouchableOpacity onPress={() => setSearchTerm('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Status Filter Horizontal Selector */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                            {['All', 'Applied', 'Under Review', 'Accepted', 'Registered', 'Rejected'].map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                                    onPress={() => setStatusFilter(status)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.filterChipLabel, statusFilter === status && styles.filterChipLabelActive]}>
                                        {status}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Leads List */}
                    <FlatList
                        data={filteredLeads}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item, index }) => {
                            const colorsStatus = getStatusColor(item.status);
                            return (
                                <SectionCard style={styles.leadCard}>
                                    <View style={styles.leadHeaderRow}>
                                        <View style={styles.leadLeft}>
                                            <View style={styles.leadAvatarLarge}>
                                                <Text style={styles.leadAvatarTextLarge}>{item.guestName?.[0] || 'L'}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.leadNameLarge}>{item.guestName}</Text>
                                                <Text style={styles.leadMetaText}><Ionicons name="mail-outline" size={12} /> {item.guestEmail}</Text>
                                                {item.guestPhone ? (
                                                    <Text style={styles.leadMetaText}><Ionicons name="phone-portrait-outline" size={12} /> {item.guestPhone}</Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        <Badge label={item.status} color={colorsStatus.text} bg={colorsStatus.bg} />
                                    </View>

                                    <View style={styles.leadDetailsRow}>
                                        <Text style={styles.detailsLabel}>Course: <Text style={styles.detailsValue}>{item.course?.name || 'N/A'}</Text></Text>
                                        {item.createdAt ? (
                                            <Text style={styles.detailsLabel}>Applied: <Text style={styles.detailsValue}>{new Date(item.createdAt).toLocaleDateString()}</Text></Text>
                                        ) : null}
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={styles.leadActionsRow}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: '#10b981' }]}
                                            onPress={() => handleUpdateAppStatus(item._id, 'Accepted')}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Accept Demo</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: '#f59e0b' }]}
                                            onPress={() => handleUpdateAppStatus(item._id, 'Under Review')}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Review</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: '#ef4444' }]}
                                            onPress={() => handleUpdateAppStatus(item._id, 'Rejected')}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: colors.danger, backgroundColor: '#fef2f2' }]}
                                            onPress={() => handleDeleteApplication(item._id)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </SectionCard>
                            );
                        }}
                        ListEmptyComponent={<EmptyState icon="people-outline" title="No matching leads" />}
                        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                    />
                </View>
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
                        setActiveTab('leads');
                        Alert.alert('Leads Active', 'Workspace leads view activated.');
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
        backgroundColor: '#1e1b4b',
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
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
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
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.1)',
    },
    bannerBadgeText: { fontSize: 9, fontWeight: '900', color: '#fef3c7', textTransform: 'uppercase' },
    bannerTitle: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.white },
    bannerSub: { fontSize: 11, color: '#e0e7ff', marginTop: 4, leadingHeight: 16, fontWeight: '500' },
    statsGrid: { flexDirection: 'row', gap: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text },
    viewAllText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.accent },
    leadItemPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    leadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    leadAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leadAvatarText: { color: colors.accent, fontWeight: 'bold', fontSize: fontSizes.sm },
    leadName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    leadCourse: { fontSize: fontSizes.xs - 1, color: colors.textMuted, marginTop: 1 },
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
    leadsContainer: { flex: 1 },
    searchFilterBar: {
        padding: spacing.md,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: fontSizes.sm, color: colors.text },
    filterScroll: { marginTop: spacing.sm, paddingVertical: 2 },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    filterChipLabel: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
    filterChipLabelActive: { color: colors.white },
    leadCard: { marginHorizontal: 0, marginBottom: spacing.sm },
    leadHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    leadAvatarLarge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leadAvatarTextLarge: { color: colors.accent, fontWeight: '800', fontSize: fontSizes.md },
    leadNameLarge: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginBottom: 2 },
    leadMetaText: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    leadDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    detailsLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: '500' },
    detailsValue: { fontWeight: '700', color: colors.text },
    leadActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: spacing.md,
    },
    actionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: { fontSize: 10, fontWeight: '800' },
});

export default MarketerDashboard;
