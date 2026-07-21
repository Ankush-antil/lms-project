import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl, Dimensions, ActivityIndicator, Alert
} from 'react-native';
import axios from 'axios';
import { AppHeader, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

const UserDirectoryScreen = ({ navigation }) => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'Admin';
    const isInstituteUser = currentUser?.role === 'Institute';

    // If logged in as Institute, pre-set their own institute as selected
    const initialInst = isInstituteUser ? { _id: currentUser.institute, name: currentUser.name } : null;
    const [selectedInstitute, setSelectedInstitute] = useState(initialInst);
    
    // Directory level states
    const [institutes, setInstitutes] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('Student');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const pageListRef = useRef(null);
    const tabs = ['Student', 'Teacher', 'Editor', 'Accountant', 'Marketer'];

    const getRoleColor = (role) => {
        switch (role) {
            case 'Admin': return colors.admin || '#ef4444';
            case 'Institute': return colors.warning || '#f59e0b';
            case 'Teacher': return colors.teacher || '#10b981';
            case 'Editor': return colors.accent || '#6366f1';
            case 'Accountant': return '#b45309';
            case 'Marketer': return '#0f766e';
            default: return colors.student || '#3b82f6';
        }
    };

    const getRoleBg = (role) => {
        switch (role) {
            case 'Admin': return '#fef2f2';
            case 'Institute': return '#fffbeb';
            case 'Teacher': return '#ecfdf5';
            case 'Editor': return '#eef2ff';
            case 'Accountant': return '#fef3c7';
            case 'Marketer': return '#ccfbf1';
            default: return '#eff6ff';
        }
    };

    const fetchInstitutes = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/setup/institutes');
            setInstitutes(data || []);
        } catch (e) {
            console.error('[DIRECTORY FETCH INSTITUTES ERROR]', e);
            setInstitutes([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchUsers = async () => {
        if (!selectedInstitute) return;
        setLoading(true);
        try {
            // Fetch all users for the institute in one call to optimize tab swiping
            const { data } = await axios.get(`/users?institute=${selectedInstitute._id}`);
            const list = Array.isArray(data) ? data : (data.users || data.students || data.teachers || []);
            setUsers(list);
        } catch (e) {
            console.error('[DIRECTORY FETCH USERS ERROR]', e);
            setUsers([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (selectedInstitute) {
            fetchUsers();
        } else {
            fetchInstitutes();
        }
    }, [selectedInstitute]);

    const handleRefresh = () => {
        setRefreshing(true);
        if (selectedInstitute) {
            fetchUsers();
        } else {
            fetchInstitutes();
        }
    };

    const filteredInstitutes = institutes.filter(inst =>
        inst.name?.toLowerCase().includes(search.toLowerCase()) ||
        inst.code?.toLowerCase().includes(search.toLowerCase()) ||
        inst.contactEmail?.toLowerCase().includes(search.toLowerCase())
    );

    const getFilteredUsersForRole = (role) => {
        return users.filter(u => {
            if (u.role !== role) return false;
            const query = search.toLowerCase();
            return u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query);
        });
    };

    const renderInstituteItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    setSearch('');
                    setSelectedInstitute(item);
                }}
                activeOpacity={0.8}
            >
                <View style={[styles.avatar, { backgroundColor: colors.warning }]}>
                    <Ionicons name="business" size={24} color={colors.white} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>Code: {item.code || 'N/A'}</Text>
                    <Text style={styles.email}>{item.contactEmail}</Text>
                </View>
                <TouchableOpacity
                    style={styles.infoIconBtn}
                    onPress={() => navigation.navigate('InstituteDetail', { instituteId: item._id })}
                    activeOpacity={0.7}
                >
                    <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderUserItem = ({ item }) => {
        const color = getRoleColor(item.role);
        const bg = getRoleBg(item.role);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('UserDetail', { userId: item._id })}
                activeOpacity={0.8}
            >
                <View style={[styles.avatar, { backgroundColor: color }]}>
                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    {item.institute?.name && (
                        <Text style={[styles.subText, { color: colors.textSecondary }]}>
                            Institute: {item.institute.name}
                        </Text>
                    )}
                    {item.studentProfile?.course && (
                        <Text style={[styles.subText, { color }]}>
                            Course: {typeof item.studentProfile.course === 'object' ? item.studentProfile.course.name : item.studentProfile.course}
                        </Text>
                    )}
                    {item.teacherProfile?.subject && (
                        <Text style={[styles.subText, { color }]}>
                            Subject: {typeof item.teacherProfile.subject === 'object' ? item.teacherProfile.subject.name : item.teacherProfile.subject}
                        </Text>
                    )}
                </View>
                <View style={styles.right}>
                    <Badge label={item.role} color={color} bg={bg} />
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
                </View>
            </TouchableOpacity>
        );
    };

    const handleTabPress = (tabName, index) => {
        setActiveTab(tabName);
        pageListRef.current?.scrollToIndex({ index, animated: true });
    };

    const handleMomentumScrollEnd = (e) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
        if (index >= 0 && index < tabs.length) {
            setActiveTab(tabs[index]);
        }
    };

    // If no institute is selected (Admin viewing the main list)
    if (!selectedInstitute) {
        return (
            <View style={styles.container}>
                <AppHeader 
                    title="Institutes List" 
                    rightIcon="add-outline"
                    rightAction={() => navigation.navigate('CreateInstitute')}
                />
                
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search institutes..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredInstitutes}
                        keyExtractor={item => item._id}
                        renderItem={renderInstituteItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
                        ListEmptyComponent={
                            <EmptyState 
                                title="No Institutes Found" 
                                subtitle="Tap the '+' button in the top-right to create one." 
                            />
                        }
                    />
                )}
            </View>
        );
    }

    // Drill down inside selected institute with swipeable view pages
    return (
        <View style={styles.container}>
            <AppHeader 
                title={selectedInstitute.name} 
                showBack={!isInstituteUser}
                backAction={() => {
                    setSearch('');
                    setSelectedInstitute(null);
                }}
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateUser', { role: activeTab, instituteId: selectedInstitute._id })}
            />

            {/* Horizontal Tabs */}
            <View style={styles.tabsContainer}>
                <FlatList
                    horizontal
                    data={tabs}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            style={[
                                styles.tab, 
                                activeTab === item && { borderBottomColor: getRoleColor(item) }
                            ]}
                            onPress={() => handleTabPress(item, index)}
                        >
                            <Text style={[
                                styles.tabText, 
                                activeTab === item && { color: getRoleColor(item), fontWeight: 'bold' }
                            ]}>
                                {item}s
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${activeTab.toLowerCase()}s...`}
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Swipeable View Pages */}
            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={getRoleColor(activeTab)} />
                </View>
            ) : (
                <FlatList
                    ref={pageListRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    data={tabs}
                    keyExtractor={item => item}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    renderItem={({ item: tabName }) => {
                        const tabUsers = getFilteredUsersForRole(tabName);
                        return (
                            <View style={styles.pageWrapper}>
                                <FlatList
                                    data={tabUsers}
                                    keyExtractor={item => item._id}
                                    renderItem={renderUserItem}
                                    contentContainerStyle={styles.listContent}
                                    refreshControl={
                                        <RefreshControl 
                                            refreshing={refreshing} 
                                            onRefresh={handleRefresh} 
                                            tintColor={getRoleColor(tabName)} 
                                        />
                                    }
                                    ListEmptyComponent={
                                        <EmptyState 
                                            title={`No ${tabName}s Found`} 
                                            subtitle={`No registered ${tabName.toLowerCase()}s in this institute.`} 
                                        />
                                    }
                                />
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    tabsContainer: {
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        height: 48,
    },
    tab: {
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        height: '100%',
    },
    tabText: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        fontWeight: '500',
    },
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
    listContent: { padding: spacing.md, paddingBottom: 80 },
    pageWrapper: {
        width: screenWidth,
        flex: 1,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white },
    info: { flex: 1 },
    name: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    email: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
    subText: { fontSize: 10, fontWeight: '600', marginTop: 3 },
    right: { alignItems: 'flex-end' },
    infoIconBtn: {
        padding: 8,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default UserDirectoryScreen;
