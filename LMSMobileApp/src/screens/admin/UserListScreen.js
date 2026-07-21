import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl, Alert, Modal, ScrollView
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import EditUserModal from '../../components/common/EditUserModal';

// General Generic User List Screen (for Teachers, Editors, Accountants, Marketers, Staff, Parents)
const UserListScreen = ({ navigation, route, endpoint, title, role, color, bg, badgeField, navigateTo }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState({});
    const [editUser, setEditUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const fetchData = async () => {
        try {
            const { data } = await axios.get(endpoint);
            const userArray = Array.isArray(data) ? data : data.users || data.students || data.teachers || [];
            setUsers(userArray);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);



    const handleDeleteUser = (userId, userName) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete ${userName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/users/${userId}`);
                            Alert.alert('Success', 'User deleted successfully!');
                            fetchData();
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.message || 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const toggleExpand = (instName) => {
        setExpanded(prev => ({ ...prev, [instName]: !prev[instName] }));
    };

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const groupedUsers = {};
    filtered.forEach(u => {
        const instName = u.institute?.name || 'Unassigned Institute';
        if (!groupedUsers[instName]) {
            groupedUsers[instName] = [];
        }
        groupedUsers[instName].push(u);
    });

    const groupedData = Object.keys(groupedUsers).map(instName => ({
        title: instName,
        data: groupedUsers[instName]
    }));

    if (loading) return <LoadingScreen />;

    const renderUserCard = (item) => {
        if (role === 'Teacher') {
            const shortId = item._id ? `#${item._id.slice(-6).toUpperCase()}` : '';
            const subjectsList = item.teacherProfile?.subjects && item.teacherProfile.subjects.length > 0 
                ? item.teacherProfile.subjects.join(', ') 
                : 'None Assigned';
            const assignedCourse = item.teacherProfile?.assignedCourses && item.teacherProfile.assignedCourses.length > 0
                ? item.teacherProfile.assignedCourses.map(c => c.name).join(', ')
                : 'N/A';

            return (
                <View style={styles.userCard} key={item._id}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.avatar, { backgroundColor: color }]}>
                            <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.userName}>{item.name}</Text>
                            <Text style={styles.userEmail}>{item.email}</Text>
                        </View>
                        <Text style={styles.shortId}>{shortId}</Text>
                    </View>

                    <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                            <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailLabel}>Institute: <Text style={styles.detailValue}>{item.institute?.name || 'N/A'}</Text></Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailLabel}>Mobile: <Text style={styles.detailValue}>{item.mobileNumber || 'N/A'}</Text></Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="book-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailLabel}>Course: <Text style={styles.detailValue}>{assignedCourse}</Text></Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="folder-open-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailLabel}>Subjects: <Text style={styles.detailValue}>{subjectsList}</Text></Text>
                        </View>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]} 
                            onPress={() => navigateTo && navigation.navigate(navigateTo, { userId: item._id })}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="eye-outline" size={15} color="#475569" />
                            <Text style={[styles.actionBtnText, { color: '#475569' }]}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]} 
                            onPress={() => { setEditUser(item); setShowEditModal(true); }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="create-outline" size={15} color={color || '#4f46e5'} />
                            <Text style={[styles.actionBtnText, { color: color || '#4f46e5' }]}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#ffe4e6' }]} 
                            onPress={() => handleDeleteUser(item._id, item.name)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={15} color="#e11d48" />
                            <Text style={[styles.actionBtnText, { color: '#e11d48' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        } else {
            const shortId = item._id ? `#${item._id.slice(-6).toUpperCase()}` : '';
            return (
                <View style={styles.userCard} key={item._id}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.avatar, { backgroundColor: color }]}>
                            <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.userName}>{item.name}</Text>
                            <Text style={styles.userEmail}>{item.email}</Text>
                            {item.mobileNumber ? <Text style={styles.userMobile}>{item.mobileNumber}</Text> : null}
                        </View>
                        <Text style={styles.shortId}>{shortId}</Text>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]} 
                            onPress={() => navigateTo && navigation.navigate(navigateTo, { userId: item._id })}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="eye-outline" size={15} color="#475569" />
                            <Text style={[styles.actionBtnText, { color: '#475569' }]}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]} 
                            onPress={() => { setEditUser(item); setShowEditModal(true); }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="create-outline" size={15} color={color || '#4f46e5'} />
                            <Text style={[styles.actionBtnText, { color: color || '#4f46e5' }]}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#ffe4e6' }]} 
                            onPress={() => handleDeleteUser(item._id, item.name)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={15} color="#e11d48" />
                            <Text style={[styles.actionBtnText, { color: '#e11d48' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader 
                title={title} 
                showBack 
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateUser', { role })}
            />
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${title.toLowerCase()}...`}
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
            </View>
            <Text style={styles.countText}>{filtered.length} {title}</Text>
            
            <FlatList
                data={groupedData}
                keyExtractor={item => item.title}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={color} />}
                ListEmptyComponent={<EmptyState icon="people-outline" title={`No ${title.toLowerCase()} found`} />}
                renderItem={({ item }) => {
                    const isExpanded = !!expanded[item.title];
                    return (
                        <View style={styles.groupContainer}>
                            <TouchableOpacity 
                                style={[styles.groupHeader, { borderLeftColor: color }]} 
                                onPress={() => toggleExpand(item.title)}
                                activeOpacity={0.75}
                            >
                                <View style={styles.groupHeaderLeft}>
                                    <Ionicons name="business" size={18} color={color} />
                                    <Text style={styles.groupHeaderTitle} numberOfLines={1}>{item.title}</Text>
                                    <View style={[styles.groupBadge, { backgroundColor: bg }]}>
                                        <Text style={[styles.groupBadgeText, { color: color }]}>{item.data.length}</Text>
                                    </View>
                                </View>
                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.groupContent}>
                                    {item.data.map(user => renderUserCard(user))}
                                </View>
                            )}
                        </View>
                    );
                }}
            />
            {editUser && (
                <EditUserModal
                    visible={showEditModal}
                    user={editUser}
                    role={role}
                    onClose={() => { setShowEditModal(false); setEditUser(null); }}
                    onSuccess={updated => {
                        setUsers(prev => prev.map(u => u._id === updated._id ? { ...u, ...updated } : u));
                        fetchData();
                    }}
                />
            )}
        </View>
    );
};

// Dedicated Students Workspace (Directory, Attendance Log, and Fee Management with Filters)
export const StudentsList = ({ navigation }) => {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('directory'); // directory | attendance | fee
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState({});
    const [visibleLimits, setVisibleLimits] = useState({});
    const [editStudent, setEditStudent] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [search, filterInst, filterCourse, filterSubject, filterSection]);

    // Filter states
    const [filterInst, setFilterInst] = useState('All');
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [showFiltersModal, setShowFiltersModal] = useState(false);

    // Attendance states
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [submittingAttendance, setSubmittingAttendance] = useState(false);

    const fetchData = async () => {
        try {
            const [usersRes, courseRes, instsRes] = await Promise.all([
                axios.get('/users?role=Student'),
                axios.get('/setup/courses'),
                axios.get('/setup/institutes')
            ]);
            setStudents(usersRes.data || []);
            setCourses(courseRes.data || []);
            setInstitutes(instsRes.data || []);

            // Compile all unique subjects
            const subSet = new Set();
            (courseRes.data || []).forEach(c => {
                if (c.subjects && Array.isArray(c.subjects)) {
                    c.subjects.forEach(s => {
                        if (s) subSet.add(s.trim());
                    });
                }
            });
            setAllSubjects(Array.from(subSet));
        } catch (e) {
            console.error('[STUDENT_LIST_FETCH] Error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);



    // Initialize/Sync Attendance Records when students or date change
    useEffect(() => {
        const init = {};
        students.forEach(s => {
            const existing = s.studentProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id] = {
                status: existing ? (existing.status || 'Present') : '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
            };
        });
        setAttendanceRecords(init);
    }, [students, attendanceDate]);

    const changeDate = (days) => {
        const current = new Date(attendanceDate);
        current.setDate(current.getDate() + days);
        setAttendanceDate(current.toISOString().split('T')[0]);
    };

    const updateAttendanceField = (studentId, field, value) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { status: '', checkInTime: '', checkOutTime: '' }),
                [field]: value
            }
        }));
    };

    const handleSaveBulkAttendance = async () => {
        try {
            setSubmittingAttendance(true);
            const recordsToSave = Object.entries(attendanceRecords).map(([studentId, data]) => ({
                studentId,
                status: data.status || 'Absent',
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || '',
                note: ''
            }));

            await axios.post('/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: recordsToSave
            });
            Alert.alert('Success', `Student attendance saved for ${attendanceDate}!`);
            fetchData();
        } catch (err) {
            console.error(err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmittingAttendance(false);
        }
    };

    const handleToggleFeeStatus = async (studentId, currentStatus) => {
        const nextStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
        try {
            await axios.put(`/users/${studentId}/fee-status`, { feeStatus: nextStatus });
            Alert.alert('Success', `Fee status updated to ${nextStatus}!`);
            fetchData();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to toggle fee status');
        }
    };

    const handleDeleteStudent = (studentId, studentName) => {
        Alert.alert(
            'Delete Student',
            `Are you sure you want to delete ${studentName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/users/${studentId}`);
                            Alert.alert('Success', 'Student deleted successfully');
                            fetchData();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete student');
                        }
                    }
                }
            ]
        );
    };

    const handleResetFilters = () => {
        setFilterInst('All');
        setFilterCourse('All');
        setFilterSubject('All');
        setFilterSection('All');
    };

    // Filter logic
    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
        const matchesInst = filterInst === 'All' || s.institute?._id === filterInst;
        const matchesCourse = filterCourse === 'All' || s.studentProfile?.course?.name === filterCourse;
        const matchesSubject = filterSubject === 'All' || s.studentProfile?.subject === filterSubject;
        const matchesSection = filterSection === 'All' || s.studentProfile?.section === filterSection;
        return matchesSearch && matchesInst && matchesCourse && matchesSubject && matchesSection;
    });

    const toggleExpand = (instName) => {
        setExpanded(prev => ({ ...prev, [instName]: !prev[instName] }));
    };

    const handleSeeMore = (instName) => {
        setVisibleLimits(prev => ({
            ...prev,
            [instName]: (prev[instName] || 20) + 20
        }));
    };

    // Grouping for Directory Tab
    const groupedStudents = {};
    filteredStudents.forEach(s => {
        const instName = s.institute?.name || 'Unassigned Institute';
        if (!groupedStudents[instName]) {
            groupedStudents[instName] = [];
        }
        groupedStudents[instName].push(s);
    });

    const groupedData = Object.keys(groupedStudents).map(instName => ({
        title: instName,
        data: groupedStudents[instName]
    }));

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Students Management" 
                showBack 
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateUser', { role: 'Student' })}
            />

            {/* Sub Tabs Bar */}
            <View style={styles.subTabBar}>
                <TouchableOpacity 
                    style={[styles.subTabItem, activeTab === 'directory' && styles.subTabActive]} 
                    onPress={() => setActiveTab('directory')}
                >
                    <Ionicons name="people-outline" size={18} color={activeTab === 'directory' ? colors.student : colors.textSecondary} />
                    <Text style={[styles.subTabLabel, activeTab === 'directory' && styles.subTabLabelActive]}>Directory</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.subTabItem, activeTab === 'attendance' && styles.subTabActive]} 
                    onPress={() => setActiveTab('attendance')}
                >
                    <Ionicons name="calendar-outline" size={18} color={activeTab === 'attendance' ? colors.student : colors.textSecondary} />
                    <Text style={[styles.subTabLabel, activeTab === 'attendance' && styles.subTabLabelActive]}>Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.subTabItem, activeTab === 'fee' && styles.subTabActive]} 
                    onPress={() => setActiveTab('fee')}
                >
                    <Ionicons name="card-outline" size={18} color={activeTab === 'fee' ? colors.student : colors.textSecondary} />
                    <Text style={[styles.subTabLabel, activeTab === 'fee' && styles.subTabLabelActive]}>Fees</Text>
                </TouchableOpacity>
            </View>

            {/* Search & Filter Row */}
            <View style={styles.searchFilterRow}>
                <View style={styles.searchBarCol}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search student..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
                </View>
                
                <TouchableOpacity 
                    style={[styles.filterBtn, (filterInst !== 'All' || filterCourse !== 'All' || filterSubject !== 'All' || filterSection !== 'All') && styles.filterBtnActive]} 
                    onPress={() => setShowFiltersModal(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="funnel-outline" size={18} color={colors.white} />
                </TouchableOpacity>
            </View>

            {/* Active Filters Display */}
            {(filterInst !== 'All' || filterCourse !== 'All' || filterSubject !== 'All' || filterSection !== 'All') && (
                <View style={styles.activeFiltersRow}>
                    <Text style={styles.activeFiltersTitle}>Active Filters: </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                        {filterInst !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Inst: {institutes.find(i => i._id === filterInst)?.name}</Text></View>}
                        {filterCourse !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Course: {filterCourse}</Text></View>}
                        {filterSection !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Section: {filterSection}</Text></View>}
                        {filterSubject !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Subject: {filterSubject}</Text></View>}
                    </ScrollView>
                    <TouchableOpacity onPress={handleResetFilters} style={{ marginLeft: 4 }}>
                        <Ionicons name="close-circle" size={16} color="#e11d48" />
                    </TouchableOpacity>
                </View>
            )}

            {/* DIRECTORY TAB CONTENT */}
            {activeTab === 'directory' && (
                <FlatList
                    data={filteredStudents.slice(0, page * 20)}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.student} />}
                    ListEmptyComponent={<EmptyState icon="school-outline" title="No students found matching filters" />}
                    ListFooterComponent={() => {
                        const hasMore = page * 20 < filteredStudents.length;
                        return hasMore ? (
                            <TouchableOpacity 
                                style={styles.seeMoreBtn} 
                                onPress={() => setPage(p => p + 1)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.seeMoreText}>See More ({filteredStudents.length - page * 20} remaining)</Text>
                            </TouchableOpacity>
                        ) : filteredStudents.length > 20 ? (
                            <Text style={{ textAlign: 'center', fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600', paddingVertical: 12 }}>
                                Showing {Math.min(page * 20, filteredStudents.length)} of {filteredStudents.length} students
                            </Text>
                        ) : null;
                    }}
                    renderItem={({ item: student }) => {
                        const courseName = student.studentProfile?.course?.name || 'No Course';
                        const section = student.studentProfile?.section || 'A';
                        const subject = student.studentProfile?.subject || 'N/A';
                        const shortId = student._id ? `#${student._id.slice(-6).toUpperCase()}` : '';
                        return (
                            <View style={styles.userCard} key={student._id}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.avatar, { backgroundColor: colors.student }]}>
                                        <Text style={styles.avatarText}>{student.name?.[0]?.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.headerInfo}>
                                        <Text style={styles.userName}>{student.name}</Text>
                                        <Text style={styles.userEmail}>{student.email}</Text>
                                    </View>
                                    <Text style={styles.shortId}>{shortId}</Text>
                                </View>

                                <View style={styles.cardDetails}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailLabel}>Institute: <Text style={styles.detailValue}>{student.institute?.name || 'N/A'}</Text></Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="book-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailLabel}>Course: <Text style={styles.detailValue}>{courseName}</Text></Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="grid-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailLabel}>Section: <Text style={styles.detailValue}>Section {section}</Text></Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="journal-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailLabel}>Subject: <Text style={styles.detailValue}>{subject}</Text></Text>
                                    </View>
                                </View>

                                <View style={styles.cardActions}>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]} 
                                        onPress={() => navigation.navigate('Chat', { userId: student._id, userName: student.name })}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="chatbubbles-outline" size={14} color={colors.accent} />
                                        <Text style={[styles.actionBtnText, { color: colors.accent }]}>Chat</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]} 
                                        onPress={() => navigation.navigate('UserDetail', { userId: student._id })}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="eye-outline" size={14} color="#475569" />
                                        <Text style={[styles.actionBtnText, { color: '#475569' }]}>View</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]} 
                                        onPress={() => { setEditStudent(student); setShowEditModal(true); }}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="create-outline" size={14} color={colors.student} />
                                        <Text style={[styles.actionBtnText, { color: colors.student }]}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: '#ffe4e6' }]} 
                                        onPress={() => handleDeleteStudent(student._id, student.name)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={14} color="#e11d48" />
                                        <Text style={[styles.actionBtnText, { color: '#e11d48' }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* ATTENDANCE TAB CONTENT */}
            {activeTab === 'attendance' && (
                <View style={{ flex: 1 }}>
                    {/* Date Navigation Switcher */}
                    <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(-1)}>
                            <Ionicons name="chevron-back" size={20} color={colors.student} />
                        </TouchableOpacity>
                        <View style={styles.dateDisplay}>
                            <Ionicons name="calendar" size={18} color={colors.student} style={{ marginRight: 6 }} />
                            <Text style={styles.dateLabel}>{new Date(attendanceDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                        <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(1)}>
                            <Ionicons name="chevron-forward" size={20} color={colors.student} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredStudents}
                        keyExtractor={item => item._id}
                        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No students matching filters" />}
                        renderItem={({ item }) => {
                            const rec = attendanceRecords[item._id] || { status: '', checkInTime: '', checkOutTime: '' };
                            const courseName = item.studentProfile?.course?.name || 'No Course';
                            const section = item.studentProfile?.section || 'A';
                            return (
                                <View style={styles.attendanceCard} key={item._id}>
                                    <View style={styles.attendanceHeader}>
                                        <View style={[styles.avatarMini, { backgroundColor: colors.student }]}>
                                            <Text style={styles.avatarMiniText}>{item.name?.[0]?.toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.attendanceStudentName}>{item.name}</Text>
                                            <Text style={styles.attendanceSubLabel}>{courseName} • Sec {section}</Text>
                                        </View>
                                    </View>

                                    {/* Check-In / Check-Out Fields */}
                                    <View style={styles.attendanceTimeRow}>
                                        <View style={styles.timeInputCol}>
                                            <Text style={styles.timeInputLabel}>Check In</Text>
                                            <TextInput
                                                style={styles.timeInput}
                                                placeholder="e.g. 09:00 AM"
                                                placeholderTextColor={colors.textMuted}
                                                value={rec.checkInTime}
                                                onChangeText={(val) => updateAttendanceField(item._id, 'checkInTime', val)}
                                            />
                                        </View>
                                        <View style={styles.timeInputCol}>
                                            <Text style={styles.timeInputLabel}>Check Out</Text>
                                            <TextInput
                                                style={styles.timeInput}
                                                placeholder="e.g. 05:00 PM"
                                                placeholderTextColor={colors.textMuted}
                                                value={rec.checkOutTime}
                                                onChangeText={(val) => updateAttendanceField(item._id, 'checkOutTime', val)}
                                            />
                                        </View>
                                    </View>

                                    {/* Segment Control Buttons P/A/L/H */}
                                    <View style={styles.statusButtonsRow}>
                                        {[
                                            { label: 'Present', val: 'Present', color: '#10b981', bg: '#ecfdf5' },
                                            { label: 'Absent', val: 'Absent', color: '#e11d48', bg: '#ffe4e6' },
                                            { label: 'Leave', val: 'Leave', color: '#f59e0b', bg: '#fef3c7' },
                                            { label: 'Holiday', val: 'Holiday', color: '#3b82f6', bg: '#eff6ff' }
                                        ].map(opt => {
                                            const isSelected = rec.status === opt.val;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.val}
                                                    style={[
                                                        styles.statusOptionBtn, 
                                                        isSelected && { backgroundColor: opt.bg, borderColor: opt.color, borderWidth: 1.5 }
                                                    ]}
                                                    onPress={() => updateAttendanceField(item._id, 'status', opt.val)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.statusOptionText, isSelected && { color: opt.color, fontWeight: '800' }]}>
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        }}
                    />

                    {/* Bottom Floating Save Button */}
                    <View style={styles.saveAttendanceFooter}>
                        <TouchableOpacity 
                            style={styles.saveAttendanceBtn}
                            onPress={handleSaveBulkAttendance}
                            disabled={submittingAttendance}
                            activeOpacity={0.85}
                        >
                            {submittingAttendance ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done" size={20} color={colors.white} style={{ marginRight: 6 }} />
                                    <Text style={styles.saveAttendanceBtnText}>Save Daily Attendance</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* FEE MANAGEMENT TAB CONTENT */}
            {activeTab === 'fee' && (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<EmptyState icon="card-outline" title="No students matching filters" />}
                    renderItem={({ item }) => {
                        const feeStatus = item.studentProfile?.feeStatus || 'Paid';
                        const courseName = item.studentProfile?.course?.name || 'No Course';
                        const section = item.studentProfile?.section || 'A';
                        return (
                            <View style={styles.feeCard} key={item._id}>
                                <View style={styles.feeHeader}>
                                    <View style={[styles.avatarMini, { backgroundColor: colors.student }]}>
                                        <Text style={styles.avatarMiniText}>{item.name?.[0]?.toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.feeStudentName}>{item.name}</Text>
                                        <Text style={styles.feeSubLabel}>{courseName} • Sec {section}</Text>
                                    </View>
                                    
                                    {/* Fee Status Badge */}
                                    <Badge 
                                        label={feeStatus} 
                                        color={feeStatus === 'Paid' ? '#10b981' : '#e11d48'} 
                                        bg={feeStatus === 'Paid' ? '#ecfdf5' : '#ffe4e6'} 
                                    />
                                </View>

                                <View style={styles.feeActionsRow}>
                                    {/* Inline Toggle Button */}
                                    <TouchableOpacity 
                                        style={[
                                            styles.feeActionBtn, 
                                            { backgroundColor: feeStatus === 'Paid' ? '#ffe4e6' : '#ecfdf5' }
                                        ]}
                                        onPress={() => handleToggleFeeStatus(item._id, feeStatus)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name={feeStatus === 'Paid' ? 'close-circle-outline' : 'checkmark-circle-outline'} 
                                            size={16} 
                                            color={feeStatus === 'Paid' ? '#e11d48' : '#10b981'} 
                                        />
                                        <Text style={[styles.feeActionBtnText, { color: feeStatus === 'Paid' ? '#e11d48' : '#10b981' }]}>
                                            Mark {feeStatus === 'Paid' ? 'Pending' : 'Paid'}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Accountant Collection Shortcut */}
                                    <TouchableOpacity 
                                        style={[styles.feeActionBtn, { backgroundColor: '#eef2ff' }]}
                                        onPress={() => navigation.navigate('AccountantFeePortal')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="wallet-outline" size={16} color={colors.accent} />
                                        <Text style={[styles.feeActionBtnText, { color: colors.accent }]}>Collect Fee</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* Dropdown Filters Modal */}
            <Modal
                visible={showFiltersModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFiltersModal(false)}
            >
                <View style={styles.filterModalOverlay}>
                    <View style={styles.filterModalContainer}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Filter Students</Text>
                            <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
                            {/* Institute Filter */}
                            <Text style={styles.filterSectionTitle}>Institute</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                <TouchableOpacity 
                                    style={[styles.filterChip, filterInst === 'All' && styles.filterChipActive]}
                                    onPress={() => setFilterInst('All')}
                                >
                                    <Text style={[styles.filterChipText, filterInst === 'All' && styles.filterChipTextActive]}>All Institutes</Text>
                                </TouchableOpacity>
                                {institutes.map(inst => (
                                    <TouchableOpacity 
                                        key={inst._id}
                                        style={[styles.filterChip, filterInst === inst._id && styles.filterChipActive]}
                                        onPress={() => setFilterInst(inst._id)}
                                    >
                                        <Text style={[styles.filterChipText, filterInst === inst._id && styles.filterChipTextActive]}>{inst.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Course Filter */}
                            <Text style={styles.filterSectionTitle}>Course</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                <TouchableOpacity 
                                    style={[styles.filterChip, filterCourse === 'All' && styles.filterChipActive]}
                                    onPress={() => setFilterCourse('All')}
                                >
                                    <Text style={[styles.filterChipText, filterCourse === 'All' && styles.filterChipTextActive]}>All Courses</Text>
                                </TouchableOpacity>
                                {courses.map(course => (
                                    <TouchableOpacity 
                                        key={course._id}
                                        style={[styles.filterChip, filterCourse === course.name && styles.filterChipActive]}
                                        onPress={() => setFilterCourse(course.name)}
                                    >
                                        <Text style={[styles.filterChipText, filterCourse === course.name && styles.filterChipTextActive]}>{course.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Section Filter */}
                            <Text style={styles.filterSectionTitle}>Section</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                {['All', 'A', 'B', 'C', 'D'].map(sec => (
                                    <TouchableOpacity 
                                        key={sec}
                                        style={[styles.filterChip, filterSection === sec && styles.filterChipActive]}
                                        onPress={() => setFilterSection(sec)}
                                    >
                                        <Text style={[styles.filterChipText, filterSection === sec && styles.filterChipTextActive]}>
                                            {sec === 'All' ? 'All Sections' : `Section ${sec}`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Subject Filter */}
                            <Text style={styles.filterSectionTitle}>Subject</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                <TouchableOpacity 
                                    style={[styles.filterChip, filterSubject === 'All' && styles.filterChipActive]}
                                    onPress={() => setFilterSubject('All')}
                                >
                                    <Text style={[styles.filterChipText, filterSubject === 'All' && styles.filterChipTextActive]}>All Subjects</Text>
                                </TouchableOpacity>
                                {allSubjects.map(sub => (
                                    <TouchableOpacity 
                                        key={sub}
                                        style={[styles.filterChip, filterSubject === sub && styles.filterChipActive]}
                                        onPress={() => setFilterSubject(sub)}
                                    >
                                        <Text style={[styles.filterChipText, filterSubject === sub && styles.filterChipTextActive]}>{sub}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </ScrollView>

                        <View style={styles.filterModalActions}>
                            <TouchableOpacity 
                                style={styles.resetFilterBtn} 
                                onPress={handleResetFilters}
                            >
                                <Text style={styles.resetFilterBtnText}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.applyFilterBtn} 
                                onPress={() => setShowFiltersModal(false)}
                            >
                                <Text style={styles.applyFilterBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {editStudent && (
                <EditUserModal
                    visible={showEditModal}
                    user={editStudent}
                    role="Student"
                    onClose={() => { setShowEditModal(false); setEditStudent(null); }}
                    onSuccess={updated => {
                        setStudents(prev => prev.map(s => s._id === updated._id ? { ...s, ...updated } : s));
                        fetchData();
                    }}
                />
            )}
        </View>
    );
};

// Other Role List wrappers
export const TeachersList = ({ navigation }) => {
    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('directory'); // directory | attendance
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState({});
    const [editTeacher, setEditTeacher] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Filter states
    const [filterInst, setFilterInst] = useState('All');
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [showFiltersModal, setShowFiltersModal] = useState(false);

    // Attendance states
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [submittingAttendance, setSubmittingAttendance] = useState(false);

    const fetchData = async () => {
        try {
            const [usersRes, courseRes, instsRes] = await Promise.all([
                axios.get('/users?role=Teacher'),
                axios.get('/setup/courses'),
                axios.get('/setup/institutes')
            ]);
            setTeachers(usersRes.data || []);
            setCourses(courseRes.data || []);
            setInstitutes(instsRes.data || []);

            // Compile all unique subjects
            const subSet = new Set();
            (courseRes.data || []).forEach(c => {
                if (c.subjects && Array.isArray(c.subjects)) {
                    c.subjects.forEach(s => {
                        if (s) subSet.add(s.trim());
                    });
                }
            });
            setAllSubjects(Array.from(subSet));
        } catch (e) {
            console.error('[TEACHER_LIST_FETCH] Error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);



    // Initialize/Sync Attendance Records when teachers or date change
    useEffect(() => {
        const init = {};
        teachers.forEach(t => {
            const existing = t.teacherProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[t._id] = {
                status: existing ? (existing.status || 'Present') : '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
            };
        });
        setAttendanceRecords(init);
    }, [teachers, attendanceDate]);

    const changeDate = (days) => {
        const current = new Date(attendanceDate);
        current.setDate(current.getDate() + days);
        setAttendanceDate(current.toISOString().split('T')[0]);
    };

    const updateAttendanceField = (teacherId, field, value) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [teacherId]: {
                ...(prev[teacherId] || { status: '', checkInTime: '', checkOutTime: '' }),
                [field]: value
            }
        }));
    };

    const handleSaveBulkAttendance = async () => {
        try {
            setSubmittingAttendance(true);
            const recordsToSave = Object.entries(attendanceRecords).map(([teacherId, data]) => ({
                studentId: teacherId, // Bulk endpoint uses studentId parameter name for all user accounts
                status: data.status || 'Absent',
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || '',
                note: ''
            }));

            await axios.post('/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords: recordsToSave
            });
            Alert.alert('Success', `Teacher attendance saved for ${attendanceDate}!`);
            fetchData();
        } catch (err) {
            console.error(err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmittingAttendance(false);
        }
    };

    const handleDeleteTeacher = (teacherId, teacherName) => {
        Alert.alert(
            'Delete Teacher',
            `Are you sure you want to delete ${teacherName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/users/${teacherId}`);
                            Alert.alert('Success', 'Teacher deleted successfully');
                            fetchData();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete teacher');
                        }
                    }
                }
            ]
        );
    };

    const handleResetFilters = () => {
        setFilterInst('All');
        setFilterCourse('All');
        setFilterSubject('All');
        setFilterSection('All');
    };

    // Filter logic
    const filteredTeachers = teachers.filter(t => {
        const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase());
        const matchesInst = filterInst === 'All' || t.institute?._id === filterInst;
        const matchesCourse = filterCourse === 'All' || t.teacherProfile?.assignedCourses?.some(c => c.name === filterCourse);
        const matchesSubject = filterSubject === 'All' || t.teacherProfile?.subjects?.includes(filterSubject);
        const matchesSection = filterSection === 'All' || t.teacherProfile?.assignedSections?.includes(filterSection);
        return matchesSearch && matchesInst && matchesCourse && matchesSubject && matchesSection;
    });

    const toggleExpand = (instName) => {
        setExpanded(prev => ({ ...prev, [instName]: !prev[instName] }));
    };

    // Grouping for Directory Tab
    const groupedTeachers = {};
    filteredTeachers.forEach(t => {
        const instName = t.institute?.name || 'Unassigned Institute';
        if (!groupedTeachers[instName]) {
            groupedTeachers[instName] = [];
        }
        groupedTeachers[instName].push(t);
    });

    const groupedData = Object.keys(groupedTeachers).map(instName => ({
        title: instName,
        data: groupedTeachers[instName]
    }));

    if (loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Teachers Management" 
                showBack 
                rightIcon="add-outline"
                rightAction={() => navigation.navigate('CreateUser', { role: 'Teacher' })}
            />

            {/* Sub Tabs Bar */}
            <View style={styles.subTabBar}>
                <TouchableOpacity 
                    style={[styles.subTabItem, activeTab === 'directory' && { borderBottomColor: colors.teacher }]} 
                    onPress={() => setActiveTab('directory')}
                >
                    <Ionicons name="people-outline" size={18} color={activeTab === 'directory' ? colors.teacher : colors.textSecondary} />
                    <Text style={[styles.subTabLabel, activeTab === 'directory' && { color: colors.teacher, fontWeight: '800' }]}>Directory</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.subTabItem, activeTab === 'attendance' && { borderBottomColor: colors.teacher }]} 
                    onPress={() => setActiveTab('attendance')}
                >
                    <Ionicons name="calendar-outline" size={18} color={activeTab === 'attendance' ? colors.teacher : colors.textSecondary} />
                    <Text style={[styles.subTabLabel, activeTab === 'attendance' && { color: colors.teacher, fontWeight: '800' }]}>Attendance</Text>
                </TouchableOpacity>
            </View>

            {/* Search & Filter Row */}
            <View style={styles.searchFilterRow}>
                <View style={styles.searchBarCol}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search teacher..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
                </View>
                
                <TouchableOpacity 
                    style={[styles.filterBtn, { backgroundColor: colors.teacher }, (filterInst !== 'All' || filterCourse !== 'All' || filterSubject !== 'All' || filterSection !== 'All') && styles.filterBtnActive]} 
                    onPress={() => setShowFiltersModal(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="funnel-outline" size={18} color={colors.white} />
                </TouchableOpacity>
            </View>

            {/* Active Filters Display */}
            {(filterInst !== 'All' || filterCourse !== 'All' || filterSubject !== 'All' || filterSection !== 'All') && (
                <View style={styles.activeFiltersRow}>
                    <Text style={styles.activeFiltersTitle}>Active Filters: </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                        {filterInst !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Inst: {institutes.find(i => i._id === filterInst)?.name || 'Loading...'}</Text></View>}
                        {filterCourse !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Course: {filterCourse}</Text></View>}
                        {filterSection !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Section: {filterSection}</Text></View>}
                        {filterSubject !== 'All' && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>Subject: {filterSubject}</Text></View>}
                    </ScrollView>
                    <TouchableOpacity onPress={handleResetFilters} style={{ marginLeft: 4 }}>
                        <Ionicons name="close-circle" size={16} color="#e11d48" />
                    </TouchableOpacity>
                </View>
            )}

            {/* DIRECTORY TAB CONTENT */}
            {activeTab === 'directory' && (
                <FlatList
                    data={groupedData}
                    keyExtractor={item => item.title}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.teacher} />}
                    ListEmptyComponent={<EmptyState icon="checkmark-done-circle-outline" title="No teachers found matching filters" />}
                    renderItem={({ item }) => {
                        const isExpanded = !!expanded[item.title];
                        return (
                            <View style={styles.groupContainer}>
                                <TouchableOpacity 
                                    style={[styles.groupHeader, { borderLeftColor: colors.teacher }]} 
                                    onPress={() => toggleExpand(item.title)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.groupHeaderLeft}>
                                        <Ionicons name="business" size={18} color={colors.teacher} />
                                        <Text style={styles.groupHeaderTitle} numberOfLines={1}>{item.title}</Text>
                                        <View style={[styles.groupBadge, { backgroundColor: '#ecfdf5' }]}>
                                            <Text style={[styles.groupBadgeText, { color: colors.teacher }]}>{item.data.length}</Text>
                                        </View>
                                    </View>
                                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.groupContent}>
                                        {item.data.map(teacher => {
                                            const shortId = teacher._id ? `#${teacher._id.slice(-6).toUpperCase()}` : '';
                                            const subjectsList = teacher.teacherProfile?.subjects && teacher.teacherProfile.subjects.length > 0 
                                                ? teacher.teacherProfile.subjects.join(', ') 
                                                : 'None Assigned';
                                            const assignedCourse = teacher.teacherProfile?.assignedCourses && teacher.teacherProfile.assignedCourses.length > 0
                                                ? teacher.teacherProfile.assignedCourses.map(c => c.name).join(', ')
                                                : 'N/A';
                                            return (
                                                <View style={styles.userCard} key={teacher._id}>
                                                    <View style={styles.cardHeader}>
                                                        <View style={[styles.avatar, { backgroundColor: colors.teacher }]}>
                                                            <Text style={styles.avatarText}>{teacher.name?.[0]?.toUpperCase()}</Text>
                                                        </View>
                                                        <View style={styles.headerInfo}>
                                                            <Text style={styles.userName}>{teacher.name}</Text>
                                                            <Text style={styles.userEmail}>{teacher.email}</Text>
                                                        </View>
                                                        <Text style={styles.shortId}>{shortId}</Text>
                                                    </View>

                                                    <View style={styles.cardDetails}>
                                                        <View style={styles.detailRow}>
                                                            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                                                            <Text style={styles.detailLabel}>Mobile: <Text style={styles.detailValue}>{teacher.mobileNumber || 'N/A'}</Text></Text>
                                                        </View>
                                                        <View style={styles.detailRow}>
                                                            <Ionicons name="book-outline" size={14} color={colors.textMuted} />
                                                            <Text style={styles.detailLabel}>Course: <Text style={styles.detailValue}>{assignedCourse}</Text></Text>
                                                        </View>
                                                        <View style={styles.detailRow}>
                                                            <Ionicons name="folder-open-outline" size={14} color={colors.textMuted} />
                                                            <Text style={styles.detailLabel}>Subjects: <Text style={styles.detailValue}>{subjectsList}</Text></Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.cardActions}>
                                                        <TouchableOpacity 
                                                            style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]} 
                                                            onPress={() => navigation.navigate('UserDetail', { userId: teacher._id })}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Ionicons name="eye-outline" size={14} color="#475569" />
                                                            <Text style={[styles.actionBtnText, { color: '#475569' }]}>View</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity 
                                                            style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]} 
                                                            onPress={() => { setEditTeacher(teacher); setShowEditModal(true); }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Ionicons name="create-outline" size={14} color={colors.teacher} />
                                                            <Text style={[styles.actionBtnText, { color: colors.teacher }]}>Edit</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity 
                                                            style={[styles.actionBtn, { backgroundColor: '#ffe4e6' }]} 
                                                            onPress={() => handleDeleteTeacher(teacher._id, teacher.name)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Ionicons name="trash-outline" size={14} color="#e11d48" />
                                                            <Text style={[styles.actionBtnText, { color: '#e11d48' }]}>Delete</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
            )}

            {/* ATTENDANCE TAB CONTENT */}
            {activeTab === 'attendance' && (
                <View style={{ flex: 1 }}>
                    {/* Date Navigation Switcher */}
                    <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(-1)}>
                            <Ionicons name="chevron-back" size={20} color={colors.teacher} />
                        </TouchableOpacity>
                        <View style={styles.dateDisplay}>
                            <Ionicons name="calendar" size={18} color={colors.teacher} style={{ marginRight: 6 }} />
                            <Text style={styles.dateLabel}>{new Date(attendanceDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                        <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(1)}>
                            <Ionicons name="chevron-forward" size={20} color={colors.teacher} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredTeachers}
                        keyExtractor={item => item._id}
                        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No teachers matching filters" />}
                        renderItem={({ item }) => {
                            const rec = attendanceRecords[item._id] || { status: '', checkInTime: '', checkOutTime: '' };
                            const assignedCourse = item.teacherProfile?.assignedCourses && item.teacherProfile.assignedCourses.length > 0
                                ? item.teacherProfile.assignedCourses[0].name
                                : 'N/A';
                            return (
                                <View style={styles.attendanceCard} key={item._id}>
                                    <View style={styles.attendanceHeader}>
                                        <View style={[styles.avatarMini, { backgroundColor: colors.teacher }]}>
                                            <Text style={styles.avatarMiniText}>{item.name?.[0]?.toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.attendanceStudentName}>{item.name}</Text>
                                            <Text style={styles.attendanceSubLabel}>Course: {assignedCourse}</Text>
                                        </View>
                                    </View>

                                    {/* Check-In / Check-Out Fields */}
                                    <View style={styles.attendanceTimeRow}>
                                        <View style={styles.timeInputCol}>
                                            <Text style={styles.timeInputLabel}>Check In</Text>
                                            <TextInput
                                                style={styles.timeInput}
                                                placeholder="e.g. 09:30 AM"
                                                placeholderTextColor={colors.textMuted}
                                                value={rec.checkInTime}
                                                onChangeText={(val) => updateAttendanceField(item._id, 'checkInTime', val)}
                                            />
                                        </View>
                                        <View style={styles.timeInputCol}>
                                            <Text style={styles.timeInputLabel}>Check Out</Text>
                                            <TextInput
                                                style={styles.timeInput}
                                                placeholder="e.g. 05:30 PM"
                                                placeholderTextColor={colors.textMuted}
                                                value={rec.checkOutTime}
                                                onChangeText={(val) => updateAttendanceField(item._id, 'checkOutTime', val)}
                                            />
                                        </View>
                                    </View>

                                    {/* Segment Control Buttons P/A/L/H */}
                                    <View style={styles.statusButtonsRow}>
                                        {[
                                            { label: 'Present', val: 'Present', color: '#10b981', bg: '#ecfdf5' },
                                            { label: 'Absent', val: 'Absent', color: '#e11d48', bg: '#ffe4e6' },
                                            { label: 'Leave', val: 'Leave', color: '#f59e0b', bg: '#fef3c7' },
                                            { label: 'Holiday', val: 'Holiday', color: '#3b82f6', bg: '#eff6ff' }
                                        ].map(opt => {
                                            const isSelected = rec.status === opt.val;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.val}
                                                    style={[
                                                        styles.statusOptionBtn, 
                                                        isSelected && { backgroundColor: opt.bg, borderColor: opt.color, borderWidth: 1.5 }
                                                    ]}
                                                    onPress={() => updateAttendanceField(item._id, 'status', opt.val)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.statusOptionText, isSelected && { color: opt.color, fontWeight: '800' }]}>
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        }}
                    />

                    {/* Bottom Floating Save Button */}
                    <View style={styles.saveAttendanceFooter}>
                        <TouchableOpacity 
                            style={[styles.saveAttendanceBtn, { backgroundColor: colors.teacher }]}
                            onPress={handleSaveBulkAttendance}
                            disabled={submittingAttendance}
                            activeOpacity={0.85}
                        >
                            {submittingAttendance ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done" size={20} color={colors.white} style={{ marginRight: 6 }} />
                                    <Text style={styles.saveAttendanceBtnText}>Save Daily Attendance</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Dropdown Filters Modal */}
            <Modal
                visible={showFiltersModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFiltersModal(false)}
            >
                <View style={styles.filterModalOverlay}>
                    <View style={styles.filterModalContainer}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Filter Teachers</Text>
                            <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
                            {/* Institute Filter */}
                            <Text style={styles.filterSectionTitle}>Institute</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                <TouchableOpacity 
                                    style={[styles.filterChip, filterInst === 'All' && styles.filterChipActive]}
                                    onPress={() => setFilterInst('All')}
                                >
                                    <Text style={[styles.filterChipText, filterInst === 'All' && styles.filterChipTextActive]}>All Institutes</Text>
                                </TouchableOpacity>
                                {institutes.map(inst => (
                                    <TouchableOpacity 
                                        key={inst._id}
                                        style={[styles.filterChip, filterInst === inst._id && styles.filterChipActive]}
                                        onPress={() => setFilterInst(inst._id)}
                                    >
                                        <Text style={[styles.filterChipText, filterInst === inst._id && styles.filterChipTextActive]}>{inst.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Course Filter */}
                            <Text style={styles.filterSectionTitle}>Course</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                <TouchableOpacity 
                                    style={[styles.filterChip, filterCourse === 'All' && styles.filterChipActive]}
                                    onPress={() => setFilterCourse('All')}
                                >
                                    <Text style={[styles.filterChipText, filterCourse === 'All' && styles.filterChipTextActive]}>All Courses</Text>
                                </TouchableOpacity>
                                {courses.map(course => (
                                    <TouchableOpacity 
                                        key={course._id}
                                        style={[styles.filterChip, filterCourse === course.name && styles.filterChipActive]}
                                        onPress={() => setFilterCourse(course.name)}
                                    >
                                        <Text style={[styles.filterChipText, filterCourse === course.name && styles.filterChipTextActive]}>{course.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Section Filter */}
                            <Text style={styles.filterSectionTitle}>Section</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                {['All', 'A', 'B', 'C', 'D'].map(sec => (
                                    <TouchableOpacity 
                                        key={sec}
                                        style={[styles.filterChip, filterSection === sec && styles.filterChipActive]}
                                        onPress={() => setFilterSection(sec)}
                                    >
                                        <Text style={[styles.filterChipText, filterSection === sec && styles.filterChipTextActive]}>
                                            {sec === 'All' ? 'All Sections' : `Section ${sec}`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Subject Filter */}
                            <Text style={styles.filterSectionTitle}>Subject</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
                                <TouchableOpacity 
                                    style={[styles.filterChip, filterSubject === 'All' && styles.filterChipActive]}
                                    onPress={() => setFilterSubject('All')}
                                >
                                    <Text style={[styles.filterChipText, filterSubject === 'All' && styles.filterChipTextActive]}>All Subjects</Text>
                                </TouchableOpacity>
                                {allSubjects.map(sub => (
                                    <TouchableOpacity 
                                        key={sub}
                                        style={[styles.filterChip, filterSubject === sub && styles.filterChipActive]}
                                        onPress={() => setFilterSubject(sub)}
                                    >
                                        <Text style={[styles.filterChipText, filterSubject === sub && styles.filterChipTextActive]}>{sub}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </ScrollView>

                        <View style={styles.filterModalActions}>
                            <TouchableOpacity 
                                style={styles.resetFilterBtn} 
                                onPress={handleResetFilters}
                            >
                                <Text style={styles.resetFilterBtnText}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.applyFilterBtn, { backgroundColor: colors.teacher }]} 
                                onPress={() => setShowFiltersModal(false)}
                            >
                                <Text style={styles.applyFilterBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {editTeacher && (
                <EditUserModal
                    visible={showEditModal}
                    user={editTeacher}
                    role="Teacher"
                    onClose={() => { setShowEditModal(false); setEditTeacher(null); }}
                    onSuccess={updated => {
                        setTeachers(prev => prev.map(t => t._id === updated._id ? { ...t, ...updated } : t));
                        fetchData();
                    }}
                />
            )}
        </View>
    );
};

export const EditorsList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Editor"
        title="Editors"
        role="Editor"
        color={colors.accent}
        bg="#eef2ff"
        badgeField={null}
        navigateTo="UserDetail"
    />
);

export const AccountantsList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Accountant"
        title="Accountants"
        role="Accountant"
        color="#b45309"
        bg="#fef3c7"
        badgeField={null}
        navigateTo="UserDetail"
    />
);

export const MarketersList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Marketer"
        title="Marketers"
        role="Marketer"
        color="#0f766e"
        bg="#ccfbf1"
        badgeField={null}
        navigateTo="UserDetail"
    />
);

export const StaffList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Staff"
        title="Staff"
        role="Staff"
        color="#0891b2"
        bg="#ecfeff"
        badgeField={null}
        navigateTo="UserDetail"
    />
);

export const ParentsList = (props) => (
    <UserListScreen
        {...props}
        endpoint="/users?role=Parent"
        title="Parents"
        role="Parent"
        color="#f43f5e"
        bg="#fff1f2"
        badgeField={null}
        navigateTo="UserDetail"
    />
);

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
    countText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '600',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    list: { paddingHorizontal: spacing.md, paddingBottom: 32 },
    groupContainer: {
        marginBottom: spacing.md,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        backgroundColor: '#f8fafc',
        borderLeftWidth: 4,
    },
    groupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    groupHeaderTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
        maxWidth: '70%',
    },
    groupBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    groupBadgeText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },
    groupContent: {
        padding: spacing.sm,
        backgroundColor: colors.bg,
    },
    userCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white },
    headerInfo: { flex: 1 },
    userName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    userEmail: { fontSize: fontSizes.xs, color: colors.textMuted },
    userMobile: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
    shortId: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textMuted,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    cardDetails: {
        backgroundColor: '#f8fafc',
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    detailValue: {
        fontWeight: '700',
        color: colors.text,
    },
    cardActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: 2,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 34,
        borderRadius: borderRadius.sm,
    },
    actionBtnText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
    },

    // Dedicated Students Sub Tabs
    subTabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.bgCard,
    },
    subTabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    subTabActive: {
        borderBottomColor: colors.student,
    },
    subTabLabel: {
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    subTabLabelActive: {
        color: colors.student,
        fontWeight: '800',
    },
    searchFilterRow: {
        flexDirection: 'row',
        gap: 8,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    searchBarCol: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgCard,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.student,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
    },
    filterBtnActive: {
        backgroundColor: colors.accent,
    },

    // Active Filters Row
    activeFiltersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    activeFiltersTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    activeFilterBadge: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginRight: 6,
    },
    activeFilterText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.text,
    },

    // Attendance Tab Styles
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
    dateNavBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateLabel: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.text,
    },
    attendanceCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    attendanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    avatarMini: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarMiniText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.white,
    },
    attendanceStudentName: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    attendanceSubLabel: {
        fontSize: fontSizes.xs - 1,
        color: colors.textMuted,
        marginTop: 1,
    },
    attendanceTimeRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    timeInputCol: {
        flex: 1,
        gap: 4,
    },
    timeInputLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    timeInput: {
        height: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        fontSize: fontSizes.xs,
        color: colors.text,
        backgroundColor: '#f8fafc',
    },
    statusButtonsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    statusOptionBtn: {
        flex: 1,
        height: 32,
        borderRadius: borderRadius.sm,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    statusOptionText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    saveAttendanceFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        elevation: 5,
    },
    saveAttendanceBtn: {
        backgroundColor: colors.student,
        borderRadius: borderRadius.md,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveAttendanceBtnText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.white,
    },

    // Fee Tab Styles
    feeCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    feeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    feeStudentName: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    feeSubLabel: {
        fontSize: fontSizes.xs - 1,
        color: colors.textMuted,
        marginTop: 1,
    },
    feeActionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    feeActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 36,
        borderRadius: borderRadius.sm,
    },
    feeActionBtnText: {
        fontSize: fontSizes.xs,
        fontWeight: '750',
    },

    // Filter Modal Styles
    filterModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    filterModalContainer: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 32,
    },
    filterModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    filterModalTitle: {
        fontSize: fontSizes.md + 1,
        fontWeight: '800',
        color: colors.text,
    },
    filterModalContent: {
        padding: spacing.md,
    },
    filterSectionTitle: {
        fontSize: fontSizes.xs,
        fontWeight: '800',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    filterChipRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: colors.student,
    },
    filterChipText: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: colors.student,
        fontWeight: '800',
    },
    filterModalActions: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
        gap: spacing.md,
    },
    resetFilterBtn: {
        flex: 1,
        height: 46,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
    },
    resetFilterBtnText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    applyFilterBtn: {
        flex: 2,
        height: 46,
        borderRadius: borderRadius.md,
        backgroundColor: colors.student,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyFilterBtnText: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.white,
    },
    seeMoreBtn: {
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: borderRadius.sm,
        marginTop: spacing.xs,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
    },
    seeMoreText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
    },
});
