import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { AppHeader, EmptyState, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const AdsMgtScreen = ({ navigation }) => {
    const [campaigns, setCampaigns] = useState([
        { id: '1', name: 'Summer Bootcamp Ads', platform: 'Meta Ads', budget: '₹12,000', leads: 48, status: 'Running' },
        { id: '2', name: 'Coding for Kids Webinar', platform: 'Google Search', budget: '₹8,500', leads: 29, status: 'Running' },
        { id: '3', name: 'Institute Admission Drive', platform: 'Meta Ads', budget: '₹25,000', leads: 104, status: 'Paused' },
    ]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newCampName, setNewCampName] = useState('');
    const [newCampPlatform, setNewCampPlatform] = useState('');
    const [newCampBudget, setNewCampBudget] = useState('');

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    const handleAddCampaign = () => {
        if (!newCampName.trim() || !newCampPlatform.trim() || !newCampBudget.trim()) {
            Alert.alert('Required', 'Please fill in campaign name, platform, and budget');
            return;
        }
        const item = {
            id: Date.now().toString(),
            name: newCampName.trim(),
            platform: newCampPlatform.trim(),
            budget: `₹${Number(newCampBudget.replace(/[^0-9]/g, '')).toLocaleString('en-IN')}`,
            leads: 0,
            status: 'Running'
        };
        setCampaigns([item, ...campaigns]);
        setNewCampName('');
        setNewCampPlatform('');
        setNewCampBudget('');
        Alert.alert('Success', 'Campaign created successfully');
    };

    const filteredCampaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.platform.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Ads Management" showBack rightIcon="stats-chart-outline" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Overview Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTitle}>Marketing Campaigns</Text>
                        <Text style={styles.bannerSub}>Monitor performance, platforms, budgets, and marketing ROI.</Text>
                    </View>
                </View>

                {/* Quick Add Campaign Section */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Launch New Campaign</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Campaign Name (e.g., Python Bootcamp)"
                        placeholderTextColor={colors.textMuted}
                        value={newCampName}
                        onChangeText={setNewCampName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Platform (e.g., Meta Ads, Google, YouTube)"
                        placeholderTextColor={colors.textMuted}
                        value={newCampPlatform}
                        onChangeText={setNewCampPlatform}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Budget (e.g., 15000)"
                        placeholderTextColor={colors.textMuted}
                        value={newCampBudget}
                        keyboardType="numeric"
                        onChangeText={setNewCampBudget}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddCampaign} activeOpacity={0.8}>
                        <Text style={styles.addBtnText}>Launch Ads Campaign</Text>
                    </TouchableOpacity>
                </SectionCard>

                {/* Search & List */}
                <SectionCard style={{ marginTop: spacing.md }}>
                    <Text style={styles.sectionTitle}>Campaign Performance ({filteredCampaigns.length})</Text>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by campaign name or platform..."
                            placeholderTextColor={colors.textMuted}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>

                    {filteredCampaigns.length === 0 ? (
                        <EmptyState icon="stats-chart-outline" title="No campaigns found" />
                    ) : (
                        filteredCampaigns.map(item => (
                            <View key={item.id} style={styles.campCard}>
                                <View style={styles.campHeader}>
                                    <View style={styles.campIconBox}>
                                        <Ionicons name="megaphone" size={20} color="#10b981" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.campName}>{item.name}</Text>
                                        <Text style={styles.campMeta}>{item.platform} • Budget: {item.budget}</Text>
                                    </View>
                                    <Badge
                                        label={item.status}
                                        color={item.status === 'Running' ? '#10b981' : '#6b7280'}
                                    />
                                </View>
                                <View style={styles.campFooter}>
                                    <Text style={styles.leadsText}>Total Leads Acquired: {item.leads}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </SectionCard>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md },
    banner: {
        backgroundColor: '#10b981',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    bannerTitle: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
    bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.xs, marginTop: 4 },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    input: {
        backgroundColor: colors.bgCard,
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
        backgroundColor: '#10b981',
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    addBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.md,
        gap: 6,
    },
    searchInput: { flex: 1, height: 40, color: colors.text, fontSize: fontSizes.sm },
    campCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    campHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    campIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    campName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    campMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    campFooter: {
        marginTop: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    leadsText: { fontSize: fontSizes.xs, fontWeight: '600', color: '#10b981' },
});

export default AdsMgtScreen;
