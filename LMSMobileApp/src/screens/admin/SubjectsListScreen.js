import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl, Modal, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import axios from 'axios';
import { AppHeader, EmptyState } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const SubjectsListScreen = ({ navigation }) => {
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    
    // Create Subject Form States
    const [modalVisible, setModalVisible] = useState(false);
    const [subjectName, setSubjectName] = useState('');
    const [duration, setDuration] = useState('60');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const [subRes, courseRes] = await Promise.all([
                axios.get('/setup/subjects'),
                axios.get('/setup/courses')
            ]);
            setSubjects(subRes.data || []);
            setCourses(courseRes.data || []);
        } catch (e) {
            console.error('[SUBJECTS FETCH ERROR]', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateSubject = async () => {
        if (!subjectName.trim()) {
            Alert.alert('Validation Error', 'Please enter a subject name.');
            return;
        }
        if (!selectedCourseId) {
            Alert.alert('Validation Error', 'Please select a course.');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post('/setup/subjects', {
                subjectName: subjectName.trim(),
                courseIds: [selectedCourseId],
                duration: parseInt(duration) || 60
            });
            Alert.alert('Success', 'Subject created successfully!');
            setModalVisible(false);
            setSubjectName('');
            setDuration('60');
            setSelectedCourseId('');
            fetchData();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create subject.');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = subjects.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.course?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const renderSubjectItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.subjectName}>{item.name}</Text>
                <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.durationText}>{item.duration || 60} mins</Text>
                </View>
            </View>
            <Text style={styles.courseText}>Course: {item.course?.name || 'N/A'}</Text>
            {item.teachers && item.teachers.length > 0 && (
                <View style={styles.metaRow}>
                    <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>
                        Teachers: {item.teachers.map(t => t.name).join(', ')}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Subjects List" 
                showBack 
                rightIcon="add-outline"
                rightAction={() => setModalVisible(true)}
            />

            {/* Search */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search subjects..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.admin} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item, index) => `${item.name}-${index}`}
                    renderItem={renderSubjectItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => { setRefreshing(true); fetchData(); }} 
                            tintColor={colors.admin} 
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState 
                            title="No Subjects Found" 
                            subtitle="Tap the '+' button in the top-right to create one." 
                        />
                    }
                />
            )}

            {/* Create Subject Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Add New Subject</Text>
                        
                        <ScrollView contentContainerStyle={styles.modalScroll}>
                            {/* Subject Name Input */}
                            <Text style={styles.label}>Subject Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Physics, Web Development"
                                placeholderTextColor={colors.textMuted}
                                value={subjectName}
                                onChangeText={setSubjectName}
                            />

                            {/* Duration Input */}
                            <Text style={styles.label}>Class Duration (minutes)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 60"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="number-pad"
                                value={duration}
                                onChangeText={setDuration}
                            />

                            {/* Course Selection */}
                            <Text style={styles.label}>Select Course</Text>
                            <View style={styles.coursesGrid}>
                                {courses.map(course => (
                                    <TouchableOpacity
                                        key={course._id}
                                        style={[
                                            styles.courseOption,
                                            selectedCourseId === course._id && styles.courseOptionSelected
                                        ]}
                                        onPress={() => setSelectedCourseId(course._id)}
                                    >
                                        <Text style={[
                                            styles.courseOptionText,
                                            selectedCourseId === course._id && styles.courseOptionTextSelected
                                        ]}>
                                            {course.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Modal Action Buttons */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setModalVisible(false)}
                                disabled={submitting}
                            >
                                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSubmit]}
                                onPress={handleCreateSubject}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text style={styles.modalBtnTextSubmit}>Create</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
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
    list: { padding: spacing.md },
    card: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    subjectName: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.text,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.md,
    },
    durationText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    courseText: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: 6,
        marginTop: 2,
    },
    metaText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalCard: {
        width: '100%',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        maxHeight: '80%',
        elevation: 10,
    },
    modalTitle: {
        fontSize: fontSizes.lg + 2,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.md,
    },
    modalScroll: {
        paddingBottom: spacing.md,
    },
    label: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 44,
        color: colors.text,
        fontSize: fontSizes.md,
    },
    coursesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    courseOption: {
        backgroundColor: colors.bg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    courseOptionSelected: {
        borderColor: colors.admin,
        backgroundColor: '#fef2f2',
    },
    courseOptionText: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    courseOptionTextSelected: {
        color: colors.admin,
        fontWeight: '700',
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    modalBtn: {
        flex: 1,
        height: 48,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnCancel: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalBtnSubmit: {
        backgroundColor: colors.admin,
    },
    modalBtnTextCancel: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    modalBtnTextSubmit: {
        color: colors.white,
        fontWeight: '750',
    },
});

export default SubjectsListScreen;
