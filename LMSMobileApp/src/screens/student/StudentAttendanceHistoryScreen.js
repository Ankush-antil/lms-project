import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Image, Modal, ScrollView, Platform, StatusBar,
    TextInput, Alert
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const StudentAttendanceHistoryScreen = ({ navigation, route }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    // Leave Application States
    const [leaveModalVisible, setLeaveModalVisible] = useState(false);
    const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
    const [leaveNote, setLeaveNote] = useState('');
    const [submittingLeave, setSubmittingLeave] = useState(false);

    const fetchAttendanceHistory = async () => {
        try {
            const { data } = await axios.get('/attendance/my-records');
            setRecords(data || []);
        } catch (error) {
            console.error("Error fetching student attendance history:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLeaveSubmit = async () => {
        if (!leaveDate) {
            Alert.alert("Error", "Please select a date.");
            return;
        }
        if (!leaveNote.trim()) {
            Alert.alert("Error", "Please write a reason / note.");
            return;
        }

        setSubmittingLeave(true);
        try {
            await axios.post('/attendance/leave-application', {
                date: leaveDate,
                leaveNote: leaveNote.trim()
            });
            Alert.alert("Success", "Leave application submitted successfully!");
            setLeaveModalVisible(false);
            setLeaveNote('');
            fetchAttendanceHistory();
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Failed to submit leave request.");
        } finally {
            setSubmittingLeave(false);
        }
    };

    useEffect(() => {
        fetchAttendanceHistory();
        if (route?.params?.openLeaveModal) {
            setLeaveModalVisible(true);
        }
    }, [route?.params]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAttendanceHistory();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            return date.toLocaleDateString('en-US', {
                weekday: 'long', // Displays full name (e.g., Saturday)
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        return dateStr;
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        const date = new Date(timeStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getGroupedRecords = () => {
        const groups = {};
        records.forEach(record => {
            const dateKey = record.date || (record.createdAt ? record.createdAt.split('T')[0] : 'N/A');
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(record);
        });
        
        return Object.keys(groups)
            .map(date => ({
                date,
                data: groups[date]
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const groupedRecords = getGroupedRecords();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance History</Text>
                <TouchableOpacity onPress={() => setLeaveModalVisible(true)} style={styles.applyLeaveHeaderBtn}>
                    <Text style={styles.applyLeaveHeaderBtnText}>Apply Leave</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={groupedRecords}
                keyExtractor={item => item.date}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No attendance records found.</Text>
                        <Text style={styles.emptySubtext}>Your check-in and check-out logs will appear here once you mark attendance.</Text>
                    </View>
                }
                renderItem={({ item: group }) => (
                    <View style={styles.dayGroupContainer}>
                        {/* Day Header */}
                        <View style={styles.dayHeader}>
                            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                            <Text style={styles.dayHeaderText}>{formatDate(group.date)}</Text>
                        </View>
                        
                        {/* Day's Card holding all subject entries */}
                        <View style={styles.dayCard}>
                            {group.data.map((item, index) => {
                                const status = item.status || 'Absent';
                                const leaveStatus = item.leaveStatus || 'Pending';
                                let badgeStyle = styles.badgeAbsent;
                                let badgeText = 'Absent';
                                if (status === 'Present') { badgeStyle = styles.badgePresent; badgeText = 'Present'; }
                                else if (status === 'In') { badgeStyle = styles.badgeIn; badgeText = 'Checked-In'; }
                                else if (status === 'Leave') {
                                    if (leaveStatus === 'Pending') {
                                        badgeStyle = styles.badgePending;
                                        badgeText = 'Pending';
                                    } else {
                                        badgeStyle = styles.badgeLeave;
                                        badgeText = 'Leave';
                                    }
                                }
                                else if (status === 'Holiday') { badgeStyle = styles.badgeHoliday; badgeText = 'Holiday'; }

                                const subjectName = item.session?.subject || 'Class';
                                const teacherName = item.session?.teacher?.name || 'Instructor';

                                return (
                                    <View key={item._id}>
                                        {index > 0 && <View style={styles.dayDivider} />}
                                        <View style={styles.recordItemRow}>
                                            <View style={styles.cardHeader}>
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                    <Text style={styles.subjectText}>{subjectName}</Text>
                                                    <Text style={styles.teacherText}>Taught by {teacherName}</Text>
                                                </View>
                                                <View style={[styles.statusBadge, badgeStyle]}>
                                                    <Text style={styles.badgeLabel}>{badgeText}</Text>
                                                </View>
                                            </View>

                                            {/* Show time details only if checked-in/present via QR scan */}
                                            {(item.checkInTime || item.checkOutTime) && (
                                                <View style={styles.timeRow}>
                                                    <View style={styles.timeItem}>
                                                        <Text style={styles.timeLabel}>In Time</Text>
                                                        <Text style={styles.timeVal}>{formatTime(item.checkInTime)}</Text>
                                                    </View>
                                                    <View style={styles.timeItem}>
                                                        <Text style={styles.timeLabel}>Out Time</Text>
                                                        <Text style={styles.timeVal}>{formatTime(item.checkOutTime)}</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Teacher Note Display */}
                                            {item.teacherNote ? (
                                                <View style={styles.noteContainer}>
                                                    <Ionicons name="book" size={12} color="#4f46e5" style={{ marginTop: 2 }} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.noteTitle}>Teacher Note:</Text>
                                                        <Text style={styles.noteText}>{item.teacherNote}</Text>
                                                    </View>
                                                </View>
                                            ) : null}

                                            {/* Leave Note Display */}
                                            {item.leaveNote ? (
                                                <View style={[styles.noteContainer, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
                                                    <Ionicons name="mail" size={12} color="#d97706" style={{ marginTop: 2 }} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.noteTitle, { color: '#b45309' }]}>
                                                            My Leave Application ({item.leaveStatus || 'Pending'}):
                                                        </Text>
                                                        <Text style={[styles.noteText, { color: '#78350f' }]}>{item.leaveNote}</Text>
                                                    </View>
                                                </View>
                                            ) : null}

                                            {/* Selfies Previews if present */}
                                            {(item.checkInPhoto || item.checkOutPhoto) && (
                                                <View style={styles.photoPrevsRow}>
                                                    <Text style={styles.photosLabel}>Selfies:</Text>
                                                    <View style={styles.photosList}>
                                                        {item.checkInPhoto && (
                                                            <TouchableOpacity 
                                                                style={styles.photoPill}
                                                                onPress={() => setSelectedPhoto({
                                                                    title: 'Check-In Selfie',
                                                                    uri: `${BASE_URL}${item.checkInPhoto}`
                                                                })}
                                                            >
                                                                <Ionicons name="image-outline" size={13} color={colors.primary} />
                                                                <Text style={styles.photoPillText}>Check-In</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {item.checkOutPhoto && (
                                                            <TouchableOpacity 
                                                                style={styles.photoPill}
                                                                onPress={() => setSelectedPhoto({
                                                                    title: 'Check-Out Selfie',
                                                                    uri: `${BASE_URL}${item.checkOutPhoto}`
                                                                })}
                                                            >
                                                                <Ionicons name="image-outline" size={13} color={colors.primary} />
                                                                <Text style={styles.photoPillText}>Check-Out</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
            />

            {/* Selfie Preview Modal */}
            <Modal
                visible={!!selectedPhoto}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedPhoto(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.photoModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedPhoto?.title}</Text>
                            <TouchableOpacity onPress={() => setSelectedPhoto(null)} style={styles.modalCloseBtn}>
                                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            {selectedPhoto?.uri && (
                                <Image
                                    source={{ uri: selectedPhoto.uri }}
                                    style={styles.selfiePreviewImage}
                                    resizeMode="cover"
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Leave Application Modal */}
            <Modal
                visible={leaveModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setLeaveModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.leaveModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Apply for Leave</Text>
                            <TouchableOpacity onPress={() => setLeaveModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
                            <Text style={styles.fieldLabel}>Leave Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={leaveDate}
                                onChangeText={setLeaveDate}
                                placeholder="e.g. 2026-07-04"
                                placeholderTextColor="#94a3b8"
                            />

                            <Text style={styles.fieldLabel}>Reason / Leave Note</Text>
                            <TextInput
                                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                                value={leaveNote}
                                onChangeText={setLeaveNote}
                                placeholder="Explain the reason for your leave..."
                                placeholderTextColor="#94a3b8"
                                multiline={true}
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, submittingLeave && { opacity: 0.7 }]}
                                onPress={handleLeaveSubmit}
                                disabled={submittingLeave}
                                activeOpacity={0.8}
                            >
                                {submittingLeave ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text style={styles.submitBtnText}>Submit Leave Application</Text>
                                )}
                            </TouchableOpacity>
                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
        height: Platform.OS === 'android' ? 60 + StatusBar.currentHeight : 88,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.white },
    
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    
    list: { padding: spacing.md, paddingBottom: 40 },
    
    card: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    subjectText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text,
    },
    teacherText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    badgePresent: { backgroundColor: '#d1fae5' },
    badgeIn: { backgroundColor: '#fef3c7' },
    badgeAbsent: { backgroundColor: '#fee2e2' },
    badgeLeave: { backgroundColor: '#eef2ff' }, // Light indigo/purple for approved leave
    badgePending: { backgroundColor: '#ffedd5' }, // Light orange/yellow for pending leave
    badgeHoliday: { backgroundColor: '#dbeafe' },
    badgeLabel: { fontSize: 10, fontWeight: '750', textTransform: 'uppercase', color: colors.textSecondary },
    
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.sm,
    },
    
    detailsRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    
    timeRow: {
        flexDirection: 'row',
        backgroundColor: colors.bg,
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        justifyContent: 'space-around',
        marginBottom: spacing.sm,
    },
    timeItem: {
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    timeVal: {
        fontSize: fontSizes.sm,
        fontWeight: '750',
        color: colors.text,
    },
    
    photoPrevsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: spacing.xs,
    },
    photosLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    photosList: {
        flexDirection: 'row',
        gap: 8,
    },
    photoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#eef2ff',
        borderWidth: 1,
        borderColor: '#c7d2fe',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    photoPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
    },
    
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: spacing.xl,
    },
    emptyText: {
        fontSize: fontSizes.md,
        fontWeight: '750',
        color: colors.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoModalContent: {
        width: '85%',
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalTitle: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.text,
    },
    modalCloseBtn: { padding: 4 },
    modalBody: {
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selfiePreviewImage: {
        width: 240,
        height: 240,
        borderRadius: borderRadius.md,
        backgroundColor: '#e2e8f0',
    },
    dayGroupContainer: {
        marginBottom: spacing.md,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.xs,
        paddingLeft: 4,
    },
    dayHeaderText: {
        fontSize: fontSizes.sm,
        fontWeight: '750',
        color: colors.textSecondary,
    },
    dayCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingHorizontal: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    dayDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
    },
    recordItemRow: {
        paddingVertical: spacing.md,
    },
    
    // Notes and Leave application styling
    noteContainer: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#eef2ff',
        borderWidth: 1,
        borderColor: '#e0e7ff',
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        marginTop: spacing.sm,
    },
    noteTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#3730a3',
        textTransform: 'uppercase',
    },
    noteText: {
        fontSize: fontSizes.xs,
        color: '#1e1b4b',
        fontWeight: '600',
        marginTop: 2,
    },
    applyLeaveHeaderBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    applyLeaveHeaderBtnText: {
        color: colors.white,
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },
    leaveModalContent: {
        width: '90%',
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: '#005',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.text,
        backgroundColor: colors.bg,
        fontWeight: '600',
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.sm,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    submitBtnText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '850',
    },
});

export default StudentAttendanceHistoryScreen;
