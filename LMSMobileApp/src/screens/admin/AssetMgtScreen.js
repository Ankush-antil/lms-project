import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    RefreshControl, Alert, Modal, FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, EmptyState, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['IT Equipment', 'Furniture', 'Lab Equipment', 'Vehicle', 'Library', 'Other'];
const STATUSES = ['Active', 'Under Maintenance', 'Stock', 'Disposed'];

const DEFAULT_ASSETS = [
    {
        id: 'AST-001',
        name: 'HP ProBook 440 G9 Laptops (10x)',
        category: 'IT Equipment',
        serialNumber: 'HP-PB-440-G9-B1',
        purchaseDate: '2025-04-10',
        purchaseCost: 450000,
        assignedTo: 'Sunil Kumar (IT Dept)',
        status: 'Active',
        notes: 'Assigned to newly joined staff members. 3 year on-site warranty active.'
    },
    {
        id: 'AST-002',
        name: 'Epson EB-FH52 HD Projector',
        category: 'IT Equipment',
        serialNumber: 'EPS-PROJ-FH52-X9',
        purchaseDate: '2025-05-15',
        purchaseCost: 72000,
        assignedTo: 'Seminar Hall B',
        status: 'Under Maintenance',
        notes: 'Lamp replacement required. Screen flickering issue reported.'
    },
    {
        id: 'AST-003',
        name: 'Ergonomic Premium Chairs (25x)',
        category: 'Furniture',
        serialNumber: 'ERG-CHR-2025-BLK',
        purchaseDate: '2025-01-20',
        purchaseCost: 125000,
        assignedTo: 'Staff Room Level 2',
        status: 'Active',
        notes: 'Delivered and assembled by Godrej Interio.'
    }
];

const AssetMgtScreen = ({ navigation }) => {
    const [assets, setAssets] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

    // Form inputs state matching Web Application
    const [form, setForm] = useState({
        name: '',
        category: 'IT Equipment',
        serialNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: '',
        assignedTo: '',
        status: 'Active',
        notes: ''
    });

    const loadAssets = async () => {
        try {
            const stored = await AsyncStorage.getItem('@lms_assets');
            if (stored) {
                setAssets(JSON.parse(stored));
            } else {
                setAssets(DEFAULT_ASSETS);
                await AsyncStorage.setItem('@lms_assets', JSON.stringify(DEFAULT_ASSETS));
            }
        } catch (e) {
            console.error('[Load Assets Error]', e);
        }
    };

    useEffect(() => {
        loadAssets();
    }, []);

    const saveAssets = async (updatedList) => {
        try {
            setAssets(updatedList);
            await AsyncStorage.setItem('@lms_assets', JSON.stringify(updatedList));
        } catch (e) {
            console.error('[Save Assets Error]', e);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadAssets().finally(() => setRefreshing(false));
    };

    const handleOpenAddModal = () => {
        setForm({
            name: '',
            category: 'IT Equipment',
            serialNumber: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchaseCost: '',
            assignedTo: '',
            status: 'Active',
            notes: ''
        });
        setModalVisible(true);
    };

    const handleAddAsset = () => {
        if (!form.name.trim()) {
            Alert.alert('Required', 'Please enter asset name');
            return;
        }
        if (!form.purchaseCost.trim() || isNaN(form.purchaseCost)) {
            Alert.alert('Required', 'Please enter a valid purchase cost');
            return;
        }

        const newId = `AST-${String(assets.length + 1).padStart(3, '0')}`;
        const newAsset = {
            id: newId,
            name: form.name.trim(),
            category: form.category,
            serialNumber: form.serialNumber.trim() || 'N/A',
            purchaseDate: form.purchaseDate,
            purchaseCost: parseFloat(form.purchaseCost) || 0,
            assignedTo: form.assignedTo.trim() || 'Unassigned',
            status: form.status,
            notes: form.notes.trim() || ''
        };

        const updated = [newAsset, ...assets];
        saveAssets(updated);
        setModalVisible(false);
        Alert.alert('Success', `Asset ${newId} registered successfully`);
    };

    const handleDeleteAsset = (id) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to remove this asset?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updated = assets.filter(a => a.id !== id);
                        saveAssets(updated);
                        setSelectedAssetDetail(null);
                    }
                }
            ]
        );
    };

    const filteredAssets = assets.filter(a => {
        const matchesSearch = 
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.serialNumber && a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.assignedTo && a.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCat = categoryFilter === 'All' || a.category === categoryFilter;

        return matchesSearch && matchesCat;
    });

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return '#10b981';
            case 'Under Maintenance': return '#f59e0b';
            case 'Stock': return '#3b82f6';
            case 'Disposed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Asset Management" showBack rightIcon="cube-outline" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Banner & Add Button */}
                <View style={styles.banner}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.bannerTitle}>Institutional Assets</Text>
                        <Text style={styles.bannerSub}>Manage inventory, IT hardware, vehicles & furniture</Text>
                    </View>
                    <TouchableOpacity style={styles.addNavBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={styles.addNavBtnText}>Add Asset</Text>
                    </TouchableOpacity>
                </View>

                {/* Category Pills Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilterScroll}>
                    <TouchableOpacity
                        style={[styles.catPill, categoryFilter === 'All' && styles.catPillActive]}
                        onPress={() => setCategoryFilter('All')}
                    >
                        <Text style={[styles.catPillText, categoryFilter === 'All' && styles.catPillTextActive]}>All</Text>
                    </TouchableOpacity>
                    {CATEGORIES.map((cat, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.catPill, categoryFilter === cat && styles.catPillActive]}
                            onPress={() => setCategoryFilter(cat)}
                        >
                            <Text style={[styles.catPillText, categoryFilter === cat && styles.catPillTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Search Box */}
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, category, serial no..."
                        placeholderTextColor={colors.textMuted}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm !== '' && (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Assets List */}
                <SectionCard style={{ marginTop: spacing.sm }}>
                    <Text style={styles.sectionTitle}>Asset Directory ({filteredAssets.length})</Text>

                    {filteredAssets.length === 0 ? (
                        <EmptyState icon="cube-outline" title="No assets found" />
                    ) : (
                        filteredAssets.map(item => (
                            <TouchableOpacity 
                                key={item.id} 
                                style={styles.assetCard}
                                activeOpacity={0.8}
                                onPress={() => setSelectedAssetDetail(item)}
                            >
                                <View style={styles.assetHeader}>
                                    <View style={styles.assetIconBox}>
                                        <Ionicons name="cube" size={20} color={colors.accent} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.assetId}>[{item.id}]</Text>
                                            <Text style={styles.assetName} numberOfLines={1}>{item.name}</Text>
                                        </View>
                                        <Text style={styles.assetMeta}>{item.category} • {item.assignedTo || 'Unassigned'}</Text>
                                    </View>
                                    <Badge
                                        label={item.status}
                                        color={getStatusColor(item.status)}
                                    />
                                </View>
                                <View style={styles.assetFooter}>
                                    <Text style={styles.valueText}>Cost: {formatCurrency(item.purchaseCost)}</Text>
                                    <Text style={styles.dateText}>S/N: {item.serialNumber || 'N/A'}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </SectionCard>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add New Inventory Asset Modal (Matching Web Form) */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Inventory Asset</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                            {/* ASSET NAME */}
                            <Text style={styles.label}>ASSET NAME *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Dell UltraSharp 27 Monitor"
                                placeholderTextColor={colors.textMuted}
                                value={form.name}
                                onChangeText={(val) => setForm({ ...form, name: val })}
                            />

                            {/* CATEGORY */}
                            <Text style={styles.label}>CATEGORY *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {CATEGORIES.map((cat, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.selectChip, form.category === cat && styles.selectChipActive]}
                                        onPress={() => setForm({ ...form, category: cat })}
                                    >
                                        <Text style={[styles.selectChipText, form.category === cat && styles.selectChipTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* SERIAL / MODEL NO. */}
                            <Text style={styles.label}>SERIAL / MODEL NO.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. SN-89271-X"
                                placeholderTextColor={colors.textMuted}
                                value={form.serialNumber}
                                onChangeText={(val) => setForm({ ...form, serialNumber: val })}
                            />

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {/* PURCHASE COST */}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>PURCHASE COST (INR) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 15000"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="numeric"
                                        value={form.purchaseCost}
                                        onChangeText={(val) => setForm({ ...form, purchaseCost: val })}
                                    />
                                </View>

                                {/* PURCHASE DATE */}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>PURCHASE DATE *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={colors.textMuted}
                                        value={form.purchaseDate}
                                        onChangeText={(val) => setForm({ ...form, purchaseDate: val })}
                                    />
                                </View>
                            </View>

                            {/* ASSIGNED TO */}
                            <Text style={styles.label}>ASSIGNED TO (USER/LOCATION)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. IT Department / Classroom 101"
                                placeholderTextColor={colors.textMuted}
                                value={form.assignedTo}
                                onChangeText={(val) => setForm({ ...form, assignedTo: val })}
                            />

                            {/* STATUS */}
                            <Text style={styles.label}>STATUS</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {STATUSES.map((st, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.selectChip, form.status === st && styles.selectChipActive]}
                                        onPress={() => setForm({ ...form, status: st })}
                                    >
                                        <Text style={[styles.selectChipText, form.status === st && styles.selectChipTextActive]}>{st}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* NOTES / DESCRIPTION */}
                            <Text style={styles.label}>NOTES / DESCRIPTION</Text>
                            <TextInput
                                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                                placeholder="Add warranty, setup guide, or spec details..."
                                placeholderTextColor={colors.textMuted}
                                multiline={true}
                                value={form.notes}
                                onChangeText={(val) => setForm({ ...form, notes: val })}
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity 
                                    style={styles.cancelBtn} 
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.submitBtn} 
                                    onPress={handleAddAsset}
                                >
                                    <Text style={styles.submitBtnText}>Add Asset</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Asset Detail Bottom Sheet Modal */}
            {selectedAssetDetail && (
                <Modal
                    visible={!!selectedAssetDetail}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setSelectedAssetDetail(null)}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay} 
                        activeOpacity={1} 
                        onPress={() => setSelectedAssetDetail(null)}
                    >
                        <View style={styles.detailContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedAssetDetail.name}</Text>
                                <TouchableOpacity onPress={() => setSelectedAssetDetail(null)}>
                                    <Ionicons name="close" size={22} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Asset ID:</Text>
                                <Text style={styles.detailValue}>{selectedAssetDetail.id}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Category:</Text>
                                <Text style={styles.detailValue}>{selectedAssetDetail.category}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Serial / Model No:</Text>
                                <Text style={styles.detailValue}>{selectedAssetDetail.serialNumber || 'N/A'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Purchase Cost:</Text>
                                <Text style={[styles.detailValue, { color: colors.accent, fontWeight: '800' }]}>{formatCurrency(selectedAssetDetail.purchaseCost)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Purchase Date:</Text>
                                <Text style={styles.detailValue}>{selectedAssetDetail.purchaseDate || 'N/A'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Assigned To:</Text>
                                <Text style={styles.detailValue}>{selectedAssetDetail.assignedTo || 'Unassigned'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Status:</Text>
                                <Badge label={selectedAssetDetail.status} color={getStatusColor(selectedAssetDetail.status)} />
                            </View>
                            {selectedAssetDetail.notes ? (
                                <View style={styles.notesBox}>
                                    <Text style={styles.detailLabel}>Notes / Specs:</Text>
                                    <Text style={styles.notesText}>{selectedAssetDetail.notes}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity 
                                style={styles.deleteBtn}
                                onPress={() => handleDeleteAsset(selectedAssetDetail.id)}
                            >
                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                <Text style={styles.deleteBtnText}>Remove Asset</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
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
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bannerTitle: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '800' },
    bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.xs, marginTop: 2 },
    addNavBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.md,
        gap: 4,
    },
    addNavBtnText: { color: '#fff', fontWeight: '800', fontSize: fontSizes.xs },
    catFilterScroll: { marginBottom: spacing.sm },
    catPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    catPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    catPillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    catPillTextActive: { color: '#fff' },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        gap: 6,
    },
    searchInput: { flex: 1, height: 40, color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' },
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
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    assetId: { fontSize: fontSizes.xs, fontWeight: '900', color: colors.accent },
    assetName: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text, flex: 1 },
    assetMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    assetFooter: {
        flexDirection: 'row',
        justify: 'space-between',
        marginTop: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    valueText: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.accent },
    dateText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textMuted },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.xl,
        width: '100%',
        maxHeight: '85%',
        padding: spacing.md,
    },
    detailContainer: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.xl,
        width: '100%',
        padding: spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 10,
        marginBottom: 12,
    },
    modalTitle: { fontSize: fontSizes.md, fontWeight: '900', color: '#1e293b' },
    modalFormScroll: { flexGrow: 0 },
    label: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        color: '#1e293b',
        fontSize: fontSizes.sm,
        fontWeight: '600',
        marginBottom: 12,
    },
    selectChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    selectChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    selectChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
    selectChipTextActive: { color: '#fff' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: borderRadius.md, backgroundColor: '#f1f5f9' },
    cancelBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
    submitBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: borderRadius.md, backgroundColor: '#0f172a' },
    submitBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
    detailLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    detailValue: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
    notesBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginTop: 10 },
    notesText: { fontSize: 11, color: '#475569', marginTop: 4 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 14, backgroundColor: '#fef2f2', borderRadius: 8 },
    deleteBtnText: { fontSize: 12, fontWeight: '800', color: '#ef4444' }
});

export default AssetMgtScreen;
