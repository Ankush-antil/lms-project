import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { AppHeader, EmptyState, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const AssetMgtScreen = ({ navigation }) => {
    const [assets, setAssets] = useState([
        { id: '1', name: 'Smart Classroom Projector X1', category: 'Electronics', location: 'Lab 101', status: 'Active', value: '₹45,000' },
        { id: '2', name: 'Student Desktop PC Set (x20)', category: 'IT Hardware', location: 'Computer Lab B', status: 'Active', value: '₹6,0,000' },
        { id: '3', name: 'High-Speed WiFi Router Mesh', category: 'Networking', location: 'Main Campus', status: 'Maintenance', value: '₹18,000' },
        { id: '4', name: 'Ergonomic Faculty Chairs (x15)', category: 'Furniture', location: 'Staff Room', status: 'Active', value: '₹52,000' },
    ]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetCategory, setNewAssetCategory] = useState('');

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    const handleAddAsset = () => {
        if (!newAssetName.trim()) {
            Alert.alert('Required', 'Please enter asset name');
            return;
        }
        const item = {
            id: Date.now().toString(),
            name: newAssetName.trim(),
            category: newAssetCategory.trim() || 'General',
            location: 'Main Office',
            status: 'Active',
            value: '₹10,000'
        };
        setAssets([item, ...assets]);
        setNewAssetName('');
        setNewAssetCategory('');
        Alert.alert('Success', 'Asset registered successfully');
    };

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Asset Management" showBack rightIcon="cube-outline" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Overview Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTitle}>Institutional Assets</Text>
                        <Text style={styles.bannerSub}>Track hardware, IT equipment, lab devices, and inventory.</Text>
                    </View>
                </View>

                {/* Quick Add Asset Section */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Add New Asset</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Asset Name (e.g., Dell Server R740)"
                        placeholderTextColor={colors.textMuted}
                        value={newAssetName}
                        onChangeText={setNewAssetName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Category (e.g., Electronics, Furniture)"
                        placeholderTextColor={colors.textMuted}
                        value={newAssetCategory}
                        onChangeText={setNewAssetCategory}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddAsset} activeOpacity={0.8}>
                        <Text style={styles.addBtnText}>Register Asset</Text>
                    </TouchableOpacity>
                </SectionCard>

                {/* Search & List */}
                <SectionCard style={{ marginTop: spacing.md }}>
                    <Text style={styles.sectionTitle}>Asset Directory ({filteredAssets.length})</Text>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or category..."
                            placeholderTextColor={colors.textMuted}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>

                    {filteredAssets.length === 0 ? (
                        <EmptyState icon="cube-outline" title="No assets found" />
                    ) : (
                        filteredAssets.map(item => (
                            <View key={item.id} style={styles.assetCard}>
                                <View style={styles.assetHeader}>
                                    <View style={styles.assetIconBox}>
                                        <Ionicons name="cube" size={20} color={colors.accent} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.assetName}>{item.name}</Text>
                                        <Text style={styles.assetMeta}>{item.category} • {item.location}</Text>
                                    </View>
                                    <Badge
                                        label={item.status}
                                        color={item.status === 'Active' ? '#10b981' : '#f59e0b'}
                                    />
                                </View>
                                <View style={styles.assetFooter}>
                                    <Text style={styles.valueText}>Valuation: {item.value}</Text>
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
        backgroundColor: colors.accent,
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
        backgroundColor: colors.accent,
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
    assetCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    assetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    assetIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    assetName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    assetMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    assetFooter: {
        marginTop: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    valueText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.accent },
});

export default AssetMgtScreen;
