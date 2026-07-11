import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const StudentFeePortalScreen = ({ navigation }) => {
    const feeBreakdown = [
        { title: 'Tuition Fee', amount: '₹42,000', percentage: '86.6%', color: '#6366f1' },
        { title: 'Lab & Internet Fee', amount: '₹3,500', percentage: '7.2%', color: '#0d9488' },
        { title: 'Exam & Library Fee', amount: '₹3,000', percentage: '6.2%', color: '#a855f7' }
    ];

    const transactions = [
        { receipt: 'ERP/REC/2026/1024', date: '15 Jan 2026', category: 'Tuition Fee', amount: '₹42,000', mode: 'Net Banking', status: 'SUCCESS' },
        { receipt: 'ERP/REC/2026/1089', date: '16 Jan 2026', category: 'Lab & Internet Fee', amount: '₹3,500', mode: 'UPI / GPay', status: 'SUCCESS' },
        { receipt: 'ERP/REC/2026/1105', date: '18 Jan 2026', category: 'Exam & Library Fee', amount: '₹3,000', mode: 'Credit Card', status: 'SUCCESS' }
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ERP Fee Portal</Text>
                <View style={styles.rightPlaceholder} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Account Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <View style={styles.statusTitleRow}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="card" size={20} color={colors.accent} />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Financial Ledger</Text>
                                <Text style={styles.cardSub}>Academic Year: 2026</Text>
                            </View>
                        </View>
                        <View style={styles.statusBadge}>
                            <View style={styles.dot} />
                            <Text style={styles.badgeText}>CLEARED</Text>
                        </View>
                    </View>

                    {/* Stats Rows */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Total Fee</Text>
                            <Text style={styles.statNum}>₹48,500</Text>
                        </View>
                        <View style={[styles.statBox, styles.statBoxPaid]}>
                            <Text style={[styles.statLabel, { color: colors.teacher }]}>Amount Paid</Text>
                            <Text style={[styles.statNum, { color: colors.teacher }]}>₹48,500</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Dues</Text>
                            <Text style={[styles.statNum, { color: '#0d9488' }]}>₹0</Text>
                        </View>
                    </View>
                </View>

                {/* Allocation breakdown */}
                <View style={styles.card}>
                    <Text style={styles.sectionHeader}>Fee Breakdown</Text>
                    
                    {/* Visual Meter Bar */}
                    <View style={styles.meterContainer}>
                        {feeBreakdown.map((item, idx) => (
                            <View 
                                key={idx} 
                                style={[
                                    styles.meterSegment, 
                                    { 
                                        width: item.percentage, 
                                        backgroundColor: item.color,
                                        borderTopLeftRadius: idx === 0 ? borderRadius.full : 0,
                                        borderBottomLeftRadius: idx === 0 ? borderRadius.full : 0,
                                        borderTopRightRadius: idx === feeBreakdown.length - 1 ? borderRadius.full : 0,
                                        borderBottomRightRadius: idx === feeBreakdown.length - 1 ? borderRadius.full : 0,
                                    }
                                ]} 
                            />
                        ))}
                    </View>

                    {/* Legend keys */}
                    <View style={styles.legendContainer}>
                        {feeBreakdown.map((item, idx) => (
                            <View key={idx} style={styles.legendRow}>
                                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                <Text style={styles.legendLabel}>{item.title} ({item.amount})</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Transactions Ledger */}
                <Text style={[styles.sectionHeader, { marginLeft: 4, marginTop: spacing.md }]}>Official Receipts</Text>
                {transactions.map((tx, idx) => (
                    <View key={idx} style={styles.transactionCard}>
                        <View style={styles.txHeader}>
                            <Text style={styles.receiptNo}>{tx.receipt}</Text>
                            <View style={styles.txStatusBadge}>
                                <Ionicons name="checkmark-circle" size={14} color={colors.teacher} />
                                <Text style={styles.txStatusText}>PAID</Text>
                            </View>
                        </View>
                        
                        <View style={styles.txDivider} />

                        <View style={styles.txRow}>
                            <View>
                                <Text style={styles.txCategory}>{tx.category}</Text>
                                <Text style={styles.txMeta}>{tx.date} • {tx.mode}</Text>
                            </View>
                            <Text style={styles.txAmount}>{tx.amount}</Text>
                        </View>
                    </View>
                ))}

                <View style={{ height: 60 }} />
            </ScrollView>
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
    rightPlaceholder: { width: 40 },
    container: { flex: 1, padding: spacing.md },
    statusCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
        elevation: 2,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    cardSub: { fontSize: 10, color: colors.textMuted, fontWeight: 'bold', marginTop: 1 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teacher },
    badgeText: { fontSize: 9, fontWeight: '900', color: '#047857' },
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: 10,
        alignItems: 'center',
    },
    statBoxPaid: { backgroundColor: '#ecfdf5' },
    statLabel: { fontSize: 9, fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase' },
    statNum: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text, marginTop: 4 },
    card: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
    },
    sectionHeader: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
    meterContainer: {
        height: 12,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.full,
        flexDirection: 'row',
        marginVertical: spacing.sm,
        overflow: 'hidden',
    },
    meterSegment: { height: '100%' },
    legendContainer: { gap: 6, marginTop: spacing.sm },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendColor: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary },
    transactionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
    txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    receiptNo: { fontSize: fontSizes.xs, fontWeight: 'bold', color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    txStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    txStatusText: { fontSize: 10, fontWeight: '900', color: colors.teacher },
    txDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    txCategory: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
    txMeta: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    txAmount: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text }
});

export default StudentFeePortalScreen;
