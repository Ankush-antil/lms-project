import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, TextInput, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { AppHeader } from '../../components/common/UIComponents';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const toolMeta = {
    'form-builder': { label: 'Form Builder Tool', icon: 'create-outline', color: '#f97316', bg: '#fff7ed' },
    'database-creator': { label: 'Database Creator Tool', icon: 'server-outline', color: '#3b82f6', bg: '#eff6ff', isComingSoon: true },
    'voice-recorder': { label: 'Voice Recorder', icon: 'mic-outline', color: '#0284c7', bg: '#f0f9ff' },
    'video-recorder': { label: 'Video Recorder', icon: 'videocam-outline', color: '#a855f7', bg: '#faf5ff' },
    'screenshot': { label: 'Screenshot Tool', icon: 'camera-outline', color: '#6366f1', bg: '#eef2ff' },
    'screen-recorder': { label: 'Screen Recorder', icon: 'tv-outline', color: '#10b981', bg: '#ecfdf5' },
};

const AdminToolsAnalyticsScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [analyticsData, setAnalyticsData] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('All');

    const fetchAnalytics = async () => {
        try {
            const { data } = await axios.get('/api/practice-files/analytics');
            setAnalyticsData(data);
        } catch (err) {
            console.error('[Fetch Tools Analytics Error]', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const formatBytes = (bytes = 0) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const practiceToolStats = (analyticsData?.toolStats || []).filter(
        s => s._id !== 'web-calling' && s._id !== 'file-uploader'
    );

    const totalPracticeActions = practiceToolStats.reduce((sum, t) => sum + t.count, 0);
    const totalBytesUsed = practiceToolStats.reduce((sum, t) => sum + t.totalSizeBytes, 0);
    const totalActiveUsers = (analyticsData?.userSummary || []).length;
    const formBuilderCount = analyticsData?.otherTools?.formBuilder || 0;

    const filteredUserToolStats = (analyticsData?.userToolStats || [])
        .filter(item => item.toolType !== 'web-calling' && item.toolType !== 'file-uploader')
        .filter(item => {
            const matchesSearch = 
                item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.toolType?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesRole = selectedRole === 'All' || item.userRole === selectedRole;

            return matchesSearch && matchesRole;
        });

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Tools Analytics" 
                showBack={true} 
                onBack={() => navigation.goBack()} 
            />

            {loading ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={colors.admin} />
                    <Text style={styles.loadingText}>Loading analytics...</Text>
                </View>
            ) : (
                <ScrollView 
                    style={styles.scroll} 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} tintColor={colors.admin} />}
                >
                    {/* Top Stats Cards */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="layers-outline" size={22} color="#6366f1" />
                            <Text style={styles.statValue}>{totalPracticeActions}</Text>
                            <Text style={styles.statLabel}>Total Uses</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="cloud-outline" size={22} color="#10b981" />
                            <Text style={styles.statValue}>{formatBytes(totalBytesUsed)}</Text>
                            <Text style={styles.statLabel}>Storage</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="people-outline" size={22} color="#3b82f6" />
                            <Text style={styles.statValue}>{totalActiveUsers}</Text>
                            <Text style={styles.statLabel}>Users</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="create-outline" size={22} color="#f97316" />
                            <Text style={styles.statValue}>{formBuilderCount}</Text>
                            <Text style={styles.statLabel}>Forms</Text>
                        </View>
                    </View>

                    {/* Tool Summary Cards */}
                    <Text style={styles.sectionHeader}>🛠️ Tool Wise Usage Summary</Text>
                    <View style={styles.toolsList}>
                        {Object.keys(toolMeta).map(toolKey => {
                            const meta = toolMeta[toolKey];

                            let count = 0;
                            let sizeBytes = 0;

                            if (toolKey === 'form-builder') {
                                count = formBuilderCount;
                            } else if (toolKey === 'database-creator') {
                                count = 0;
                            } else {
                                const stat = practiceToolStats.find(s => s._id === toolKey) || { count: 0, totalSizeBytes: 0 };
                                count = stat.count;
                                sizeBytes = stat.totalSizeBytes;
                            }

                            return (
                                <View key={toolKey} style={styles.toolCard}>
                                    <View style={[styles.toolIconBg, { backgroundColor: meta.bg }]}>
                                        <Ionicons name={meta.icon} size={22} color={meta.color} />
                                    </View>
                                    <View style={styles.toolCardInfo}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.toolName}>{meta.label}</Text>
                                            {meta.isComingSoon && (
                                                <Text style={styles.soonBadge}>SOON</Text>
                                            )}
                                        </View>
                                        <Text style={styles.toolStatsText}>
                                            {count} {toolKey === 'form-builder' ? 'forms' : 'uses'} • {meta.isComingSoon ? 'N/A' : formatBytes(sizeBytes)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* User Breakdown Section */}
                    <Text style={styles.sectionHeader}>👤 User Wise Usage ("Kisne Kitna Use Kiya")</Text>

                    {/* Search & Filter */}
                    <View style={styles.filterRow}>
                        <View style={styles.searchBox}>
                            <Ionicons name="search-outline" size={16} color="#94a3b8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search user or tool..."
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                    </View>

                    {/* User Usage Cards */}
                    {filteredUserToolStats.length === 0 ? (
                        <Text style={styles.emptyText}>No tool usage records found.</Text>
                    ) : (
                        filteredUserToolStats.map((item, idx) => {
                            const meta = toolMeta[item.toolType] || { label: item.toolType, icon: 'construct-outline', color: '#64748b', bg: '#f1f5f9' };
                            return (
                                <View key={idx} style={styles.userCard}>
                                    <View style={styles.userCardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.userName}>{item.userName || 'User'}</Text>
                                            <Text style={styles.userEmail}>{item.userEmail || '-'}</Text>
                                        </View>
                                        <View style={styles.roleBadge}>
                                            <Text style={styles.roleBadgeText}>{item.userRole || 'User'}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.userCardFooter}>
                                        <View style={styles.toolBadge}>
                                            <Ionicons name={meta.icon} size={14} color={meta.color} />
                                            <Text style={[styles.toolBadgeText, { color: meta.color }]}>{meta.label}</Text>
                                        </View>
                                        <Text style={styles.usageText}>{item.count} times ({formatBytes(item.totalSizeBytes)})</Text>
                                    </View>

                                    <Text style={styles.dateText}>Last active: {formatDate(item.lastUsedAt)}</Text>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: '600' },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md },
    statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statCard: { flex: 1, backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 10, borderBottomWidth: 3, borderBottomColor: colors.admin, elevation: 1, alignItems: 'center' },
    statValue: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginTop: 4 },
    statLabel: { fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
    sectionHeader: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginTop: 10, marginBottom: 12 },
    toolsList: { gap: 10, marginBottom: 20 },
    toolCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: borderRadius.lg, elevation: 1 },
    toolIconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    toolCardInfo: { marginLeft: 12, flex: 1 },
    toolName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    soonBadge: { fontSize: 8, fontWeight: '900', color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
    toolStatsText: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
    filterRow: { marginBottom: 12 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: borderRadius.md, paddingHorizontal: 12, height: 40, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 12, fontWeight: '600', color: '#1e293b' },
    userCard: { backgroundColor: '#fff', padding: 14, borderRadius: borderRadius.lg, marginBottom: 10, elevation: 1 },
    userCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    userName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    userEmail: { fontSize: 11, fontWeight: '600', color: '#64748b' },
    roleBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    roleBadgeText: { fontSize: 10, fontWeight: '800', color: colors.accent },
    userCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    toolBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    toolBadgeText: { fontSize: 12, fontWeight: '800' },
    usageText: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
    dateText: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
    emptyText: { textAlign: 'center', color: '#94a3b8', marginVertical: 20, fontSize: 12, fontWeight: '600' }
});

export default AdminToolsAnalyticsScreen;
