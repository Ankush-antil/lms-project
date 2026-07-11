import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform, KeyboardAvoidingView } from 'react-native';
import axios from 'axios';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../components/common/UIComponents';

const AccountantFeePortal = ({ navigation }) => {
    const [students, setStudents] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Pending'

    // Course and Section filters
    const [selectedCourse, setSelectedCourse] = useState('All');
    const [selectedSection, setSelectedSection] = useState('All');

    // Collect Fee Modal States
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [collectModalVisible, setCollectModalVisible] = useState(false);
    const [collectAmount, setCollectAmount] = useState('');
    const [collectMode, setCollectMode] = useState('Cash'); // 'Cash' | 'UPI' | 'Bank' | 'Card' | 'Cheque'
    const [refNo, setRefNo] = useState('');
    const [remark, setRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Cash Denominations
    const [denomCounts, setDenomCounts] = useState({
        500: '',
        200: '',
        100: '',
        50: '',
        20: '',
        10: '',
        5: '',
        2: '',
        1: ''
    });

    // Extra Charges
    const [hasExtraCharge, setHasExtraCharge] = useState(false);
    const [extraAmount, setExtraAmount] = useState('');
    const [extraLabel, setExtraLabel] = useState('');
    const [extraRemark, setExtraRemark] = useState('');

    const fetchData = async () => {
        try {
            const res = await axios.get('/fees/admin/dashboard-data');
            setStudents(res.data.students || []);
            setReceipts(res.data.receipts || []);
        } catch (e) {
            console.error('Error fetching fee portal records:', e);
            Alert.alert('Error', 'Failed to fetch fee records.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleOpenCollect = (record) => {
        setSelectedRecord(record);
        setCollectAmount(String(record.pendingAmount || ''));
        setCollectMode('Cash');
        setRefNo('');
        setRemark('');
        setHasExtraCharge(false);
        setExtraAmount('');
        setExtraLabel('');
        setExtraRemark('');
        setDenomCounts({
            500: '',
            200: '',
            100: '',
            50: '',
            20: '',
            10: '',
            5: '',
            2: '',
            1: ''
        });
        setCollectModalVisible(true);
    };

    const handleDenomChange = (val, denom) => {
        const updated = { ...denomCounts, [denom]: val };
        setDenomCounts(updated);

        // Sum up total cash
        const total = Object.entries(updated).reduce((acc, [d, c]) => acc + (Number(d) * (Number(c) || 0)), 0);
        setCollectAmount(String(total));
    };

    const handleCollectFee = async () => {
        const amt = Number(collectAmount) || 0;
        const hasExtra = hasExtraCharge && Number(extraAmount) > 0;

        if (amt <= 0 && !hasExtra) {
            Alert.alert('Invalid Input', 'Enter a valid payment amount or extra charge.');
            return;
        }

        setSubmitting(true);
        try {
            // Build reference string for Cash mode notes count breakdown
            let finalRefNo = refNo;
            if (collectMode === 'Cash') {
                const parts = Object.entries(denomCounts)
                    .filter(([_, c]) => Number(c) > 0)
                    .map(([d, c]) => `${d}x${c}`);
                finalRefNo = parts.length > 0 ? parts.join(', ') : 'Cash Collected';
            }

            const body = {
                studentId: selectedRecord.student?._id,
                amount: amt,
                paymentMode: collectMode,
                referenceNo: finalRefNo,
                remark: remark
            };

            if (hasExtra) {
                body.extraCharge = {
                    amount: Number(extraAmount),
                    label: extraLabel || 'Extra Charge',
                    remark: extraRemark
                };
            }

            await axios.post('/fees/admin/collect', body);
            Alert.alert('Success', 'Payment register submitted successfully!');
            setCollectModalVisible(false);
            fetchData();
        } catch (e) {
            console.error('Fee collection error:', e);
            Alert.alert('Collection Failed', e.response?.data?.message || 'Failed to submit payment.');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter logic
    const filteredStudents = students.filter(r => {
        const name = r.student?.name?.toLowerCase() || '';
        const adm = r.student?.admissionNo?.toLowerCase() || '';
        const matchesQuery = name.includes(searchQuery.toLowerCase()) || adm.includes(searchQuery.toLowerCase());

        if (!matchesQuery) return false;
        if (selectedTab !== 'All' && r.status !== selectedTab) return false;
        if (selectedCourse !== 'All' && r.course !== selectedCourse) return false;
        if (selectedSection !== 'All' && r.batch !== selectedSection) return false;
        return true;
    });

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

    // Get unique courses & sections dynamically
    const coursesList = ['All', ...new Set(students.map(s => s.course).filter(Boolean))];
    const sectionsList = ['All', ...new Set(students.map(s => s.batch).filter(Boolean))];

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ERP Fee Manager</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or admission number..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Course Filter Row */}
            <View style={styles.filterGroup}>
                <Text style={styles.filterTitle}>Course</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {coursesList.map(course => (
                        <TouchableOpacity
                            key={course}
                            onPress={() => setSelectedCourse(course)}
                            style={[styles.filterPill, selectedCourse === course && styles.filterPillActive]}
                        >
                            <Text style={[styles.filterPillText, selectedCourse === course && styles.filterPillTextActive]}>{course}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Section Filter Row */}
            <View style={styles.filterGroup}>
                <Text style={styles.filterTitle}>Section</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {sectionsList.map(sec => (
                        <TouchableOpacity
                            key={sec}
                            onPress={() => setSelectedSection(sec)}
                            style={[styles.filterPill, selectedSection === sec && styles.filterPillActive]}
                        >
                            <Text style={[styles.filterPillText, selectedSection === sec && styles.filterPillTextActive]}>
                                {sec === 'All' ? 'All' : `Sec ${sec}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.tabsRow}>
                {['All', 'Paid', 'Partial', 'Pending'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setSelectedTab(tab)}
                        style={[styles.statusTabBtn, selectedTab === tab && styles.statusTabBtnActive]}
                    >
                        <Text style={[styles.statusTabText, selectedTab === tab && styles.statusTabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingWrapper}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={(item) => item._id}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="card-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No matching fee records found</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const statusColor = item.status === 'Paid' ? colors.teacher : (item.status === 'Partial' ? '#d97706' : colors.danger);
                        const statusBg = item.status === 'Paid' ? '#ecfdf5' : (item.status === 'Partial' ? '#fffbeb' : '#fff5f5');

                        return (
                            <View style={styles.recordCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.studentName}>{item.student?.name}</Text>
                                        <Text style={styles.studentMeta}>Adm: {item.student?.admissionNo} • Sec: {item.batch}</Text>
                                    </View>
                                    <Badge label={item.status} color={statusColor} bg={statusBg} />
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.detailsRow}>
                                    <View>
                                        <Text style={styles.detailLabel}>Course</Text>
                                        <Text style={styles.detailVal}>{item.course || 'N/A'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.detailLabel}>Pending Dues</Text>
                                        <Text style={[styles.detailVal, { color: item.pendingAmount > 0 ? colors.danger : colors.text, fontWeight: '900' }]}>
                                            {fmt(item.pendingAmount)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.detailsRow, { marginTop: spacing.xs }]}>
                                    <View>
                                        <Text style={styles.detailLabel}>Paid Amount</Text>
                                        <Text style={[styles.detailVal, { color: colors.teacher }]}>{fmt(item.paidAmount)}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.detailLabel}>Total Fee</Text>
                                        <Text style={styles.detailVal}>{fmt(item.totalFee)}</Text>
                                    </View>
                                </View>

                                {item.pendingAmount > 0 && (
                                    <TouchableOpacity
                                        style={styles.collectBtn}
                                        onPress={() => handleOpenCollect(item)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="cash-outline" size={16} color={colors.white} />
                                        <Text style={styles.collectBtnText}>Collect Payment</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }}
                />
            )}

            {/* Collect Fee Modal */}
            <Modal
                visible={collectModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCollectModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Collect Payment</Text>
                            <TouchableOpacity onPress={() => setCollectModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalStudentName}>{selectedRecord?.student?.name}</Text>
                            <Text style={styles.modalStudentMeta}>Admission No: {selectedRecord?.student?.admissionNo}</Text>
                            <Text style={[styles.modalStudentMeta, { marginBottom: spacing.md }]}>Course: {selectedRecord?.course}</Text>

                            {/* Mode selection */}
                            <Text style={styles.inputLabel}>Payment Mode</Text>
                            <View style={styles.modePickerContainer}>
                                {['Cash', 'UPI', 'Bank', 'Card', 'Cheque'].map(mode => (
                                    <TouchableOpacity
                                        key={mode}
                                        onPress={() => setCollectMode(mode)}
                                        style={[styles.modePill, collectMode === mode && styles.modePillActive]}
                                    >
                                        <Text style={[styles.modeText, collectMode === mode && styles.modeTextActive]}>{mode}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Cash Denominations Notes Counter */}
                            {collectMode === 'Cash' && (
                                <View style={styles.denomContainer}>
                                    <Text style={styles.denomHeader}>Notes Counter Breakdown</Text>
                                    <View style={styles.denomGrid}>
                                        {[500, 200, 100, 50, 20, 10, 5, 2, 1].map(denom => (
                                            <View key={denom} style={styles.denomRow}>
                                                <Text style={styles.denomLabel}>₹{denom}</Text>
                                                <Ionicons name="close" size={10} color={colors.textMuted} />
                                                <TextInput
                                                    style={styles.denomInput}
                                                    placeholder="0"
                                                    placeholderTextColor={colors.textMuted}
                                                    keyboardType="numeric"
                                                    value={String(denomCounts[denom] || '')}
                                                    onChangeText={(val) => handleDenomChange(val, denom)}
                                                />
                                                <Text style={styles.denomSubtotal}>
                                                    = ₹{Number(denom) * (Number(denomCounts[denom]) || 0)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Amount Input */}
                            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Collected Amount (₹)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter amount to collect"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                                value={collectAmount}
                                onChangeText={setCollectAmount}
                                editable={collectMode !== 'Cash'} // cash updates automatically via note counter
                            />

                            {/* Reference Number */}
                            {collectMode !== 'Cash' && (
                                <>
                                    <Text style={styles.inputLabel}>Reference / Transaction Number</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. UPI Ref / Transaction ID"
                                        placeholderTextColor={colors.textMuted}
                                        value={refNo}
                                        onChangeText={setRefNo}
                                    />
                                </>
                            )}

                            {/* Extra Charge Form */}
                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setHasExtraCharge(!hasExtraCharge)}
                                activeOpacity={0.7}
                            >
                                <Ionicons 
                                    name={hasExtraCharge ? "checkbox" : "square-outline"} 
                                    size={20} 
                                    color={hasExtraCharge ? colors.accent : colors.textSecondary} 
                                />
                                <Text style={styles.checkboxLabel}>Add Extra Charge (Fine, late fees)?</Text>
                            </TouchableOpacity>

                            {hasExtraCharge && (
                                <View style={styles.extraChargeBox}>
                                    <Text style={styles.inputLabel}>Extra Amount (₹)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. 200"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="numeric"
                                        value={extraAmount}
                                        onChangeText={setExtraAmount}
                                    />

                                    <Text style={styles.inputLabel}>Extra Label</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Late Fine / Party / Exam Fee"
                                        placeholderTextColor={colors.textMuted}
                                        value={extraLabel}
                                        onChangeText={setExtraLabel}
                                    />

                                    <Text style={styles.inputLabel}>Remarks / Description</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Reason for extra charge"
                                        placeholderTextColor={colors.textMuted}
                                        value={extraRemark}
                                        onChangeText={setExtraRemark}
                                    />
                                </View>
                            )}

                            {/* Remark */}
                            <Text style={styles.inputLabel}>Remarks / Notes</Text>
                            <TextInput
                                style={[styles.textInput, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                                placeholder="Add payment note or description..."
                                placeholderTextColor={colors.textMuted}
                                multiline={true}
                                value={remark}
                                onChangeText={setRemark}
                            />

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleCollectFee}
                                disabled={submitting}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-done" size={20} color={colors.white} />
                                        <Text style={styles.submitBtnText}>Submit Collection</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        ...Platform.select({
            ios: { marginTop: 0 },
            android: { marginTop: 24 }
        })
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: fontSizes.lg, fontWeight: '900', color: colors.text },
    refreshBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        height: 46,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: fontSizes.sm, color: colors.text },
    filterGroup: { marginBottom: 6, paddingHorizontal: spacing.md },
    filterTitle: { fontSize: 10, fontWeight: '850', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
    filterScroll: { gap: 6, paddingVertical: 2 },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterPillText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    filterPillTextActive: { color: colors.white },
    tabsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: 6, marginVertical: spacing.sm },
    statusTabBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    statusTabBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    statusTabText: { fontSize: fontSizes.xs, fontWeight: '750', color: colors.textSecondary },
    statusTabTextActive: { color: colors.white },
    loadingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: spacing.md, paddingBottom: 40 },
    emptyState: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyText: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 12, fontWeight: '700' },
    recordCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    studentName: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    studentMeta: { fontSize: 10, color: colors.textMuted, fontWeight: 'bold', marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    detailVal: { fontSize: fontSizes.xs, color: colors.text, fontWeight: '800', marginTop: 2 },
    collectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.accent,
        borderRadius: borderRadius.md,
        paddingVertical: 10,
        marginTop: spacing.md,
    },
    collectBtnText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '750' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: borderRadius.lg + 10,
        borderTopRightRadius: borderRadius.lg + 10,
        maxHeight: '90%',
        paddingBottom: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalTitle: { fontSize: fontSizes.lg, fontWeight: '900', color: colors.text },
    closeBtn: { width: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
    modalForm: { padding: spacing.md },
    modalStudentName: { fontSize: fontSizes.lg, fontWeight: '900', color: colors.text },
    modalStudentMeta: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: 'bold', marginTop: 2 },
    inputLabel: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
    textInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 46,
        fontSize: fontSizes.sm,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    modePickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: spacing.xs },
    modePill: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modePillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    modeText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
    modeTextActive: { color: colors.white },
    denomContainer: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    denomHeader: { fontSize: 11, fontWeight: '850', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm },
    denomGrid: { gap: 6 },
    denomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    denomLabel: { width: 45, fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
    denomInput: {
        width: 70,
        height: 32,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: 6,
        fontSize: fontSizes.xs,
        color: colors.text,
        textAlign: 'center',
    },
    denomSubtotal: { width: 85, fontSize: fontSizes.xs, fontWeight: '750', color: colors.textSecondary, textAlign: 'right' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, paddingVertical: 4 },
    checkboxLabel: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
    extraChargeBox: {
        backgroundColor: '#fffbeb',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: '#fef0d1',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.teacher,
        borderRadius: borderRadius.md,
        height: 50,
        marginTop: 24,
        marginBottom: 40,
    },
    submitBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '900' }
});

export default AccountantFeePortal;
