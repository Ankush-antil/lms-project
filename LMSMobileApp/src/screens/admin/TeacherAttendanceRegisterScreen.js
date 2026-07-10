import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, SafeAreaView, Platform, Modal
} from 'react-native';
import axios from 'axios';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { TimePickerModal } from '../../components/common/TimePickerModal';

const TeacherAttendanceRegisterScreen = ({ navigation }) => {
    const [teachers, setTeachers] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState({});
    
    // Filters local input states
    const [filterInstitute, setFilterInstitute] = useState('All');
    const [searchTermInput, setSearchTermInput] = useState('');
    const [pageSizeInput, setPageSizeInput] = useState('10');
    const pageSize = Math.max(1, parseInt(pageSizeInput, 10) || 10);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters active applied states
    const [activeInstitute, setActiveInstitute] = useState('All');
    const [activeSearch, setActiveSearch] = useState('');

    // Time picker modal state
    const [timePickerTarget, setTimePickerTarget] = useState(null); // { teacherId, field }
    const [timePickerVisible, setTimePickerVisible] = useState(false);

    // Bulk Present Modal state
    const [bulkPresentModal, setBulkPresentModal] = useState(false);
    const [bulkCheckIn, setBulkCheckIn] = useState('09:00');
    const [bulkCheckOut, setBulkCheckOut] = useState('17:00');

    const todayStr = new Date().toISOString().split('T')[0];

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, instRes] = await Promise.all([
                axios.get('/users?role=Teacher'),
                axios.get('/setup/institutes')
            ]);
            setTeachers(usersRes.data || []);
            setInstitutes(instRes.data || []);
        } catch (err) {
            Alert.alert('Error', 'Failed to load register data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!teachers.length) return;
        const init = {};
        teachers.forEach(t => {
            const existing = t.teacherProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[t._id] = {
                status: existing ? (existing.status || 'Present') : 'Absent',
                note: existing?.teacherNote || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
                source: existing?.source || 'manual',
                markedBy: existing?.markedBy || ''
            };
        });
        setRecords(init);
    }, [teachers, attendanceDate]);

    const handleTimeChange = (id, field, value) => {
        setRecords(prev => {
            const currentRec = prev[id] || {
                status: 'Absent',
                note: '',
                checkInTime: '',
                checkOutTime: '',
                source: 'manual',
                markedBy: ''
            };
            const updatedRec = { ...currentRec, [field]: value };
            
            if (!updatedRec.checkInTime && !updatedRec.checkOutTime) {
                updatedRec.status = 'Absent';
            } else {
                updatedRec.status = 'Present';
            }
            
            return { ...prev, [id]: updatedRec };
        });
    };

    const handleSearchClick = () => {
        setActiveInstitute(filterInstitute);
        setActiveSearch(searchTermInput);
        setCurrentPage(1);
    };

    const allFiltered = useMemo(() => {
        return teachers.filter(t => {
            const instId = t.institute?._id || t.institute || '';
            const matchInstitute = activeInstitute === 'All' || instId === activeInstitute;
            const matchSearch = !activeSearch ||
                t.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                (t.email && t.email.toLowerCase().includes(activeSearch.toLowerCase()));
            
            return matchInstitute && matchSearch;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [teachers, activeInstitute, activeSearch]);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, allFiltered.length);
    const displayedItems = useMemo(() => {
        return allFiltered.slice(startIndex, endIndex);
    }, [allFiltered, startIndex, endIndex]);

    const totalPages = Math.ceil(allFiltered.length / pageSize);

    const stats = useMemo(() => {
        const filteredIds = new Set(allFiltered.map(t => t._id));
        const vals = Object.entries(records)
            .filter(([id]) => filteredIds.has(id))
            .map(([, data]) => data);
            
        return {
            total: allFiltered.length,
            present: vals.filter(r => r.status === 'Present').length,
            absent:  vals.filter(r => r.status === 'Absent').length,
            leave:   vals.filter(r => r.status === 'Leave').length,
            holiday: vals.filter(r => r.status === 'Holiday').length,
        };
    }, [records, allFiltered]);

    const setStatus = (id, status) =>
        setRecords(prev => ({ ...prev, [id]: { ...prev[id], status } }));

    const markAll = (status) =>
        setRecords(prev => {
            const u = { ...prev };
            displayedItems.forEach(t => {
                u[t._id] = {
                    ...u[t._id],
                    status,
                    checkInTime: '',
                    checkOutTime: ''
                };
            });
            return u;
        });

    const applyBulkPresent = () => {
        setRecords(prev => {
            const u = { ...prev };
            displayedItems.forEach(t => {
                u[t._id] = {
                    ...u[t._id],
                    status: 'Present',
                    checkInTime: bulkCheckIn,
                    checkOutTime: bulkCheckOut
                };
            });
            return u;
        });
        setBulkPresentModal(false);
    };

    const handleSave = async () => {
        if (attendanceDate > todayStr) {
            Alert.alert('Error', 'Cannot mark attendance for a future date');
            return;
        }
        try {
            setSubmitting(true);
            const attendanceRecords = Object.entries(records).map(([studentId, data]) => ({
                studentId,
                status: data.status,
                note: data.note,
                checkInTime: data.checkInTime,
                checkOutTime: data.checkOutTime,
                source: data.source,
                markedBy: data.markedBy
            }));
            await axios.post('/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords
            });
            Alert.alert('Success', `Teacher attendance saved for ${attendanceDate}!`);
            await fetchData();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmitting(false);
        }
    };

    const changeDate = (days) => {
        const d = new Date(attendanceDate + 'T00:00:00');
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setAttendanceDate(`${y}-${m}-${day}`);
        setCurrentPage(1);
    };

    const formatTime12h = (time24) => {
        if (!time24) return 'Not Confirmed';
        const [h, m] = time24.split(':');
        const hNum = parseInt(h, 10);
        if (hNum >= 12) {
            return `${hNum === 12 ? 12 : hNum - 12}:${m} PM`;
        }
        return `${hNum === 0 ? 12 : hNum}:${m} AM`;
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.admin} />
                <Text style={styles.loadingText}>Loading register...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Faculty Register</Text>
                <TouchableOpacity onPress={handleSave} disabled={submitting} style={styles.saveHeaderBtn}>
                    {submitting ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <Text style={styles.saveHeaderBtnText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                {/* Date Switcher */}
                <View style={styles.dateBar}>
                    <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavBtn}>
                        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.dateLabel}>{attendanceDate}</Text>
                    <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavBtn} disabled={attendanceDate === todayStr}>
                        <Ionicons name="chevron-forward" size={20} color={attendanceDate === todayStr ? colors.textMuted : colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Filters card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Filter Faculty</Text>
                    
                    {/* Institute Pills */}
                    <Text style={styles.filterLabel}>Institute</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                        <TouchableOpacity 
                            style={[styles.pill, filterInstitute === 'All' && styles.pillActive]}
                            onPress={() => setFilterInstitute('All')}
                        >
                            <Text style={[styles.pillText, filterInstitute === 'All' && styles.pillTextActive]}>All</Text>
                        </TouchableOpacity>
                        {institutes.map(inst => (
                            <TouchableOpacity 
                                key={inst._id} 
                                style={[styles.pill, filterInstitute === inst._id && styles.pillActive]}
                                onPress={() => setFilterInstitute(inst._id)}
                            >
                                <Text style={[styles.pillText, filterInstitute === inst._id && styles.pillTextActive]}>{inst.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Search & entries input row */}
                    <View style={styles.searchRow}>
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
                            <TextInput
                                placeholder="Search by name or email..."
                                value={searchTermInput}
                                onChangeText={setSearchTermInput}
                                placeholderTextColor={colors.textMuted}
                                style={styles.searchInput}
                            />
                        </View>
                        
                        <View style={styles.entriesContainer}>
                            <Text style={styles.entriesLabel}>Show</Text>
                            <TextInput
                                keyboardType="number-pad"
                                value={pageSizeInput}
                                onChangeText={text => {
                                    setPageSizeInput(text);
                                    setCurrentPage(1);
                                }}
                                style={styles.entriesInput}
                            />
                        </View>

                        <TouchableOpacity onPress={handleSearchClick} style={styles.searchBtn}>
                            <Ionicons name="search" size={20} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats mini bar */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
                        <Text style={[styles.statNum, { color: colors.teacher }]}>{stats.present}</Text>
                        <Text style={styles.statLabel}>Present</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}>
                        <Text style={[styles.statNum, { color: colors.danger }]}>{stats.absent}</Text>
                        <Text style={styles.statLabel}>Absent</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
                        <Text style={[styles.statNum, { color: colors.warning }]}>{stats.leave}</Text>
                        <Text style={styles.statLabel}>Leave</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                        <Text style={[styles.statNum, { color: colors.accent }]}>{stats.holiday}</Text>
                        <Text style={styles.statLabel}>Holiday</Text>
                    </View>
                </View>

                {/* Bulk Actions card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Page Bulk Actions</Text>
                    <View style={styles.bulkButtonsRow}>
                        <TouchableOpacity style={[styles.bulkBtn, styles.bulkPresentBtn]} onPress={() => setBulkPresentModal(true)}>
                            <Text style={styles.bulkBtnTextPresent}>All Present</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.bulkBtn, styles.bulkAbsentBtn]} onPress={() => markAll('Absent')}>
                            <Text style={styles.bulkBtnTextAbsent}>All Absent</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.bulkBtn, styles.bulkLeaveBtn]} onPress={() => markAll('Leave')}>
                            <Text style={styles.bulkBtnTextLeave}>All Leave</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.bulkBtn, styles.bulkHolidayBtn]} onPress={() => markAll('Holiday')}>
                            <Text style={styles.bulkBtnTextHoliday}>All Holiday</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Mode and Marked By bulk setters */}
                    <View style={styles.bulkFieldsRow}>
                        <View style={styles.pickerField}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {['manual', 'qr', 'biometric'].map(m => (
                                    <TouchableOpacity 
                                        key={m}
                                        onPress={() => {
                                            setRecords(prev => {
                                                const u = { ...prev };
                                                displayedItems.forEach(t => {
                                                    u[t._id] = { ...u[t._id], source: m };
                                                });
                                                return u;
                                            });
                                        }}
                                        style={styles.modeBulkItem}
                                    >
                                        <Text style={styles.modeBulkItemText}>Set All {m === 'qr' ? 'QR' : m === 'biometric' ? 'Bio' : 'Manual'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TextInput
                            placeholder="Set All Marked By..."
                            placeholderTextColor={colors.textMuted}
                            onChangeText={val => {
                                setRecords(prev => {
                                    const u = { ...prev };
                                    displayedItems.forEach(t => {
                                        u[t._id] = { ...u[t._id], markedBy: val };
                                    });
                                    return u;
                                });
                            }}
                            style={styles.bulkMarkedByInput}
                        />
                    </View>
                </View>

                {/* Faculty list */}
                <Text style={styles.sectionHeader}>Faculty List ({displayedItems.length})</Text>
                {displayedItems.length > 0 ? (
                    displayedItems.map((t, index) => {
                        const rec = records[t._id] || {
                            status: 'Absent',
                            note: '',
                            checkInTime: '',
                            checkOutTime: '',
                            source: 'manual',
                            markedBy: ''
                        };
                        const roll = startIndex + index + 1;

                        return (
                            <View key={t._id} style={styles.studentCard}>
                                {/* Row Header */}
                                <View style={styles.studentCardHeader}>
                                    <View style={styles.rollBadge}>
                                        <Text style={styles.rollBadgeText}>{roll}</Text>
                                    </View>
                                    <View style={styles.studentHeaderInfo}>
                                        <Text style={styles.studentNameText}>{t.name}</Text>
                                        <Text style={styles.studentEmailText}>{t.email} {t.institute?.name && `• ${t.institute.name}`}</Text>
                                    </View>
                                </View>

                                {/* Status picker buttons */}
                                <View style={styles.statusButtons}>
                                    {[
                                        { label: 'Present', val: 'Present', activeColor: '#10b981', bg: '#ecfdf5', border: '#d1fae5' },
                                        { label: 'Absent',  val: 'Absent',  activeColor: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
                                        { label: 'Leave',   val: 'Leave',   activeColor: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
                                        { label: 'Holiday', val: 'Holiday', activeColor: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' }
                                    ].map(opt => {
                                        const isSel = rec.status === opt.val;
                                        return (
                                            <TouchableOpacity
                                                key={opt.val}
                                                style={[
                                                    styles.statusBtn,
                                                    isSel ? { backgroundColor: opt.activeColor, borderColor: opt.activeColor } : { borderColor: '#e2e8f0' }
                                                ]}
                                                onPress={() => setStatus(t._id, opt.val)}
                                            >
                                                <Text style={[styles.statusBtnText, isSel && { color: colors.white }]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Times Row */}
                                <View style={styles.formRow}>
                                    <View style={styles.formCol}>
                                        <Text style={styles.fieldLabel}>Check-In Time</Text>
                                        <TouchableOpacity
                                            style={[
                                                styles.timeSelectorBtn,
                                                rec.checkInTime ? styles.timeSelectorBtnActive : null
                                            ]}
                                            onPress={() => {
                                                setTimePickerTarget({ teacherId: t._id, field: 'checkInTime' });
                                                setTimePickerVisible(true);
                                            }}
                                        >
                                            <Text style={[
                                                styles.timeSelectorText,
                                                rec.checkInTime ? styles.timeSelectorTextActive : null
                                            ]}>
                                                {formatTime12h(rec.checkInTime)}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View style={styles.formCol}>
                                        <Text style={styles.fieldLabel}>Check-Out Time</Text>
                                        <TouchableOpacity
                                            style={[
                                                styles.timeSelectorBtn,
                                                rec.checkOutTime ? styles.timeSelectorBtnActive : null
                                            ]}
                                            onPress={() => {
                                                setTimePickerTarget({ teacherId: t._id, field: 'checkOutTime' });
                                                setTimePickerVisible(true);
                                            }}
                                        >
                                            <Text style={[
                                                styles.timeSelectorText,
                                                rec.checkOutTime ? styles.timeSelectorTextActive : null
                                            ]}>
                                                {formatTime12h(rec.checkOutTime)}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Mode and Marked By */}
                                <View style={styles.formRow}>
                                    <View style={styles.formCol}>
                                        <Text style={styles.fieldLabel}>Mode</Text>
                                        <View style={styles.modeRow}>
                                            {['manual', 'qr', 'biometric'].map(m => (
                                                <TouchableOpacity
                                                    key={m}
                                                    onPress={() => handleTimeChange(t._id, 'source', m)}
                                                    style={[
                                                        styles.modeBtn,
                                                        rec.source === m && styles.modeBtnActive
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.modeBtnText,
                                                        rec.source === m && styles.modeBtnTextActive
                                                    ]}>
                                                        {m === 'qr' ? 'QR' : m === 'biometric' ? 'Bio' : 'Man'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={styles.formCol}>
                                        <Text style={styles.fieldLabel}>Marked By</Text>
                                        <TextInput
                                            placeholder="e.g. Admin"
                                            value={rec.markedBy || ''}
                                            placeholderTextColor={colors.textMuted}
                                            onChangeText={val => handleTimeChange(t._id, 'markedBy', val)}
                                            style={styles.cardInput}
                                        />
                                    </View>
                                </View>

                                {/* Notes */}
                                <View style={styles.noteContainer}>
                                    <Text style={styles.fieldLabel}>Faculty Note</Text>
                                    <TextInput
                                        placeholder="Add note for teacher..."
                                        value={rec.note || ''}
                                        placeholderTextColor={colors.textMuted}
                                        onChangeText={val => handleTimeChange(t._id, 'note', val)}
                                        style={styles.cardInputNote}
                                    />
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.empty}>
                        <Ionicons name="sad-outline" size={48} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No teachers match the criteria.</Text>
                    </View>
                )}

                {/* Custom Pagination Numbers Footer */}
                {totalPages > 1 && (
                    <View style={styles.paginationCard}>
                        <View style={styles.paginationControls}>
                            <TouchableOpacity
                                disabled={currentPage === 1}
                                onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                            >
                                <Text style={styles.pageBtnText}>Prev</Text>
                            </TouchableOpacity>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageNumbers}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                                    const isCurrent = currentPage === p;
                                    return (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => setCurrentPage(p)}
                                            style={[styles.pageNumberBtn, isCurrent && styles.pageNumberBtnActive]}
                                        >
                                            <Text style={[styles.pageNumberBtnText, isCurrent && styles.pageNumberBtnTextActive]}>
                                                {p}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <TouchableOpacity
                                disabled={currentPage === totalPages}
                                onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                            >
                                <Text style={styles.pageBtnText}>Next</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.paginationInfo}>
                            Showing {startIndex + 1} to {endIndex} of {allFiltered.length} entries
                        </Text>
                    </View>
                )}
                
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bulk Times Modal */}
            <Modal
                visible={bulkPresentModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBulkPresentModal(false)}
            >
                <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setBulkPresentModal(false)}>
                    <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
                        <View style={styles.topIndicator} />
                        <Text style={styles.modalTitle}>Set Bulk Times</Text>
                        <Text style={styles.modalSub}>Marking visible page as Present. Set default times:</Text>

                        <View style={styles.modalForm}>
                            <Text style={styles.fieldLabel}>Check-In Time</Text>
                            <TextInput
                                value={bulkCheckIn}
                                onChangeText={setBulkCheckIn}
                                style={styles.modalInput}
                            />

                            <Text style={styles.fieldLabel}>Check-Out Time</Text>
                            <TextInput
                                value={bulkCheckOut}
                                onChangeText={setBulkCheckOut}
                                style={styles.modalInput}
                            />
                        </View>

                        <View style={styles.actions}>
                            <View style={styles.row}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setBulkPresentModal(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.okBtn} onPress={applyBulkPresent}>
                                    <Text style={styles.okBtnText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Time Picker Modal */}
            <TimePickerModal
                visible={timePickerVisible}
                value={timePickerTarget ? (records[timePickerTarget.teacherId]?.[timePickerTarget.field] || '') : ''}
                onChange={val => {
                    if (timePickerTarget) {
                        handleTimeChange(timePickerTarget.teacherId, timePickerTarget.field, val);
                    }
                }}
                onClose={() => {
                    setTimePickerVisible(false);
                    setTimePickerTarget(null);
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    loadingText: { marginTop: 10, color: colors.textSecondary, fontWeight: 'bold' },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'between',
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
    headerTitle: { flex: 1, fontSize: fontSizes.lg, fontWeight: '900', color: colors.text },
    saveHeaderBtn: { backgroundColor: colors.admin, paddingHorizontal: 16, paddingVertical: 8, borderRadius: borderRadius.md },
    saveHeaderBtnText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.sm },
    container: { flex: 1, padding: spacing.md },
    dateBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.bgCard,
        paddingVertical: 12,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateNavBtn: { padding: spacing.xs },
    dateLabel: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    card: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
    },
    cardTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
    filterLabel: { fontSize: fontSizes.xs, fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
    pillScroll: { marginBottom: spacing.sm },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        marginRight: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pillActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    pillText: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: 'bold' },
    pillTextActive: { color: colors.white },
    searchRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
    searchInputContainer: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 10,
    },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, height: 40, fontSize: fontSizes.sm, color: colors.text, fontWeight: '600' },
    entriesContainer: {
        width: 65,
        alignItems: 'center',
    },
    entriesLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: 'bold', marginBottom: 2 },
    entriesInput: {
        width: '100%',
        height: 32,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        backgroundColor: colors.bgSecondary,
    },
    searchBtn: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.md,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-end',
    },
    statsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
    statBox: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    statNum: { fontSize: fontSizes.lg, fontWeight: '900' },
    statLabel: { fontSize: 9, fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginTop: 2 },
    bulkButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
    bulkBtn: { flex: 1, minWidth: 70, paddingVertical: 8, borderRadius: borderRadius.sm, borderWidth: 1, alignItems: 'center' },
    bulkPresentBtn: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
    bulkAbsentBtn: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
    bulkLeaveBtn: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
    bulkHolidayBtn: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
    bulkBtnTextPresent: { color: colors.teacher, fontSize: fontSizes.xs, fontWeight: 'bold' },
    bulkBtnTextAbsent: { color: colors.danger, fontSize: fontSizes.xs, fontWeight: 'bold' },
    bulkBtnTextLeave: { color: colors.warning, fontSize: fontSizes.xs, fontWeight: 'bold' },
    bulkBtnTextHoliday: { color: colors.accent, fontSize: fontSizes.xs, fontWeight: 'bold' },
    bulkFieldsRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
    pickerField: { flex: 1, height: 38 },
    modeBulkItem: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 4,
        justifyContent: 'center',
    },
    modeBulkItemText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary },
    bulkMarkedByInput: {
        flex: 1,
        height: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: 10,
        fontSize: fontSizes.sm,
        color: colors.text,
        fontWeight: '600',
        backgroundColor: colors.bgSecondary,
    },
    sectionHeader: { fontSize: fontSizes.md, fontWeight: '800', color: colors.textSecondary, marginBottom: spacing.sm, marginLeft: 2 },
    empty: { padding: 40, alignItems: 'center', gap: 8 },
    emptyText: { color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: 'bold' },
    studentCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
    },
    studentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
    rollBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justify: 'center' },
    rollBadgeText: { fontSize: fontSizes.xs, fontWeight: '900', color: colors.textSecondary },
    studentHeaderInfo: { flex: 1 },
    studentNameText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    studentEmailText: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600', marginTop: 1 },
    statusButtons: { flexDirection: 'row', gap: 4, marginBottom: spacing.md },
    statusBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, borderWidth: 1, alignItems: 'center', backgroundColor: colors.bgSecondary },
    statusBtnText: { fontSize: fontSizes.xs, fontWeight: 'bold', color: colors.textSecondary },
    formRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
    formCol: { flex: 1 },
    fieldLabel: { fontSize: fontSizes.xs, fontWeight: 'bold', color: colors.textMuted, marginBottom: 4 },
    timeSelectorBtn: {
        height: 38,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeSelectorBtnActive: {
        backgroundColor: '#eef2ff',
        borderColor: colors.accentLight,
    },
    timeSelectorText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textMuted },
    timeSelectorTextActive: { color: colors.accent, fontWeight: 'bold' },
    modeRow: { flexDirection: 'row', gap: 2, height: 38 },
    modeBtn: { flex: 1, borderRadius: borderRadius.sm, border: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    modeBtnActive: { backgroundColor: '#eef2ff', borderColor: colors.accentLight },
    modeBtnText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary },
    modeBtnTextActive: { color: colors.accent },
    cardInput: {
        height: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: 8,
        fontSize: fontSizes.xs,
        color: colors.text,
        fontWeight: '600',
        backgroundColor: colors.bgSecondary,
    },
    cardInputNote: {
        height: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: 8,
        fontSize: fontSizes.xs,
        color: colors.text,
        fontWeight: '600',
        backgroundColor: colors.bgSecondary,
    },
    noteContainer: { marginTop: spacing.sm },
    paginationCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: 'center',
        marginBottom: 20,
    },
    paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary },
    pageBtnDisabled: { opacity: 0.5 },
    pageBtnText: { fontSize: fontSizes.xs, fontWeight: 'bold', color: colors.textSecondary },
    pageNumbers: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    pageNumberBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary },
    pageNumberBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    pageNumberBtnText: { fontSize: fontSizes.xs, fontWeight: 'bold', color: colors.textSecondary },
    pageNumberBtnTextActive: { color: colors.white },
    paginationInfo: { marginTop: 10, fontSize: fontSizes.xs, fontWeight: 'bold', color: colors.textMuted },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
    modalSub: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
    modalForm: { width: '100%', marginBottom: 20, gap: 10 },
    modalInput: {
        height: 42,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: 12,
        fontSize: fontSizes.sm,
        color: colors.text,
        fontWeight: '600',
        backgroundColor: colors.bgSecondary,
    },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: {
        width: 300,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        alignItems: 'center',
        elevation: 10,
    },
    topIndicator: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: borderRadius.sm, marginBottom: spacing.md },
    actions: { width: '100%', gap: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.bgSecondary },
    cancelBtnText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: fontSizes.md },
    okBtn: { flex: 1, paddingVertical: 12, borderRadius: borderRadius.md, backgroundColor: colors.accent, alignItems: 'center' },
    okBtnText: { color: colors.white, fontWeight: 'bold', fontSize: fontSizes.md }
});

export default TeacherAttendanceRegisterScreen;
