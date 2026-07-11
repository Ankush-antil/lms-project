import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, ScrollView, Dimensions
} from 'react-native';
import axios from 'axios';
import { AppHeader, EmptyState } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const AdminFeePortal = ({ navigation }) => {
    const [stats, setStats] = useState(null);
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const res = await axios.get('/fees/admin/dashboard-data');
            setStats(res.data?.stats || null);
            setReceipts(res.data?.recentReceipts || []);
        } catch (e) {
            console.error('[ADMIN_FEE_PORTAL] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatCurrency = (amount) => {
        return `₹${(amount || 0).toLocaleString('en-IN')}`;
    };

    const renderReceiptItem = ({ item }) => (
        <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
                <Text style={styles.studentName}>{item.student?.name || 'Student'}</Text>
                <Text style={styles.receiptAmount}>{formatCurrency(item.amountPaid)}</Text>
            </View>
            <View style={styles.receiptDetails}>
                <Text style={styles.detailText}>Receipt No: {item.receiptNo}</Text>
                <Text style={styles.detailText}>
                    Course: {item.student?.studentProfile?.course || 'N/A'} • Sec: {item.student?.studentProfile?.section || 'N/A'}
                </Text>
                <Text style={styles.detailText}>Payment Mode: {item.paymentMode}</Text>
                <Text style={styles.receiptDate}>
                    {new Date(item.paymentDate).toLocaleDateString()}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Fees Portal" 
                showBack
                rightIcon="card-outline"
                rightAction={() => {
                    // Open Accountant Fee Portal for fee collection!
                    navigation.navigate('AccountantFeePortal');
                }}
            />

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Collect Fees Action Header */}
                    <TouchableOpacity 
                        style={styles.collectBanner}
                        onPress={() => navigation.navigate('AccountantFeePortal')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.collectLeft}>
                            <Ionicons name="add-circle" size={24} color={colors.white} />
                            <View>
                                <Text style={styles.collectTitle}>Collect Fee</Text>
                                <Text style={styles.collectSub}>Record a student payment or fine</Text>
                            </View>
                        </View>
                        <Ionicons name="arrow-forward" size={20} color={colors.white} />
                    </TouchableOpacity>

                    {/* Stats Section */}
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statItem, { borderLeftColor: colors.success }]}>
                            <Text style={styles.statLabel}>Today's Collection</Text>
                            <Text style={[styles.statValue, { color: colors.success }]}>
                                {formatCurrency(stats?.todayCollection)}
                            </Text>
                        </View>
                        
                        <View style={[styles.statItem, { borderLeftColor: colors.accent }]}>
                            <Text style={styles.statLabel}>Monthly Collection</Text>
                            <Text style={[styles.statValue, { color: colors.accent }]}>
                                {formatCurrency(stats?.monthlyCollection)}
                            </Text>
                        </View>

                        <View style={[styles.statItem, { borderLeftColor: colors.danger }]}>
                            <Text style={styles.statLabel}>Outstanding Dues</Text>
                            <Text style={[styles.statValue, { color: colors.danger }]}>
                                {formatCurrency(stats?.outstandingDues)}
                            </Text>
                        </View>

                        <View style={[styles.statItem, { borderLeftColor: colors.warning }]}>
                            <Text style={styles.statLabel}>Active Students</Text>
                            <Text style={[styles.statValue, { color: colors.warning }]}>
                                {stats?.activeStudents || 0}
                            </Text>
                        </View>
                    </View>

                    {/* Recent Transactions */}
                    <Text style={styles.sectionTitle}>Recent Receipts</Text>
                    <FlatList
                        data={receipts}
                        keyExtractor={item => item._id}
                        renderItem={renderReceiptItem}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <EmptyState 
                                title="No Receipts Collected" 
                                subtitle="Tap 'Collect Fee' above to record a payment." 
                            />
                        }
                    />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { padding: spacing.md, paddingBottom: 80 },
    collectBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.accent,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        elevation: 2,
    },
    collectLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    collectTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.white,
    },
    collectSub: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 1,
    },
    sectionTitle: {
        fontSize: fontSizes.sm,
        fontWeight: '750',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        marginTop: spacing.sm,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: spacing.md,
    },
    statItem: {
        width: (Dimensions.get('window').width - spacing.md * 2 - 12) / 2,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: fontSizes.md + 2,
        fontWeight: '800',
    },
    receiptCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    receiptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    studentName: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    receiptAmount: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.success,
    },
    receiptDetails: {
        gap: 3,
    },
    detailText: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
    },
    receiptDate: {
        fontSize: 9,
        color: colors.textMuted,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AdminFeePortal;
