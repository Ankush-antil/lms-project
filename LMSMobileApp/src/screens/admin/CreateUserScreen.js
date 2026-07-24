import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import axios from 'axios';
import { AppHeader, SectionCard } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const CreateUserScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const isInstitute = user?.role === 'Institute';

    const defaultRole = route.params?.role || 'Student';
    const [role, setRole] = useState(defaultRole);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [studentSubject, setStudentSubject] = useState('');
    const [teacherSubjects, setTeacherSubjects] = useState('');
    const [subjects, setSubjects] = useState([]);
    
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Dropdown toggle states
    const [showInstSelect, setShowInstSelect] = useState(false);
    const [showCourseSelect, setShowCourseSelect] = useState(false);
    const [showSubjectSelect, setShowSubjectSelect] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [instRes, courseRes, subjRes] = await Promise.all([
                    axios.get('/setup/institutes'),
                    axios.get('/setup/courses'),
                    axios.get('/setup/subjects').catch(() => ({ data: [] })),
                ]);
                setInstitutes(instRes.data || []);
                setCourses(courseRes.data || []);
                setSubjects(subjRes.data || []);
                
                if (route.params?.instituteId) {
                    setSelectedInstitute(route.params.instituteId);
                } else if (isInstitute && user?.institute) {
                    const instId = typeof user.institute === 'object' ? user.institute._id : user.institute;
                    setSelectedInstitute(instId);
                }
            } catch (e) {
                console.error('Error fetching dropdowns:', e);
            } finally {
                setLoadingDropdowns(false);
            }
        };
        fetchData();
    }, [isInstitute, user]);

    const availableSubjects = React.useMemo(() => {
        if (!selectedCourse) return subjects;
        return subjects.filter(s => {
            const matchCourse = s.course && (s.course._id === selectedCourse || s.course === selectedCourse);
            return matchCourse;
        });
    }, [subjects, selectedCourse]);

    const handleCreateUser = async () => {
        if (!name.trim() || !email.trim() || !password.trim() || !selectedInstitute) {
            Alert.alert('Required Fields', 'Name, Email, Password aur Institute select karna mandatory hai');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                email: email.trim(),
                password: password,
                role: role,
                mobileNumber: mobileNumber.trim(),
                institute: selectedInstitute,
            };

            if (role === 'Student') {
                payload.course = selectedCourse || null;
                payload.subject = studentSubject.trim();
            } else if (role === 'Teacher') {
                payload.course = selectedCourse || null;
                payload.subjects = teacherSubjects.trim(); // Controller expects comma-separated or array
            }

            await axios.post('/users', payload);
            Alert.alert('Success', `${role} created successfully!`);
            navigation.goBack();
        } catch (error) {
            console.error('Error creating user:', error);
            Alert.alert('Error', error.response?.data?.message || 'User create karne mein problem aayi.');
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleColor = (r) => {
        switch (r) {
            case 'Teacher': return colors.teacher || '#10b981';
            case 'Editor': return colors.accent || '#6366f1';
            case 'Accountant': return '#b45309';
            case 'Marketer': return '#0f766e';
            default: return colors.student || '#3b82f6';
        }
    };

    const activeColor = getRoleColor(role);

    return (
        <View style={styles.container}>
            <AppHeader title={`Add New ${role}`} showBack />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Role Switcher */}
                {!route.params?.role && (
                    <View style={styles.roleContainer}>
                        {['Student', 'Teacher', 'Editor', 'Accountant', 'Marketer'].map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[
                                    styles.roleTab,
                                    role === r && { backgroundColor: getRoleColor(r), borderColor: getRoleColor(r) }
                                ]}
                                onPress={() => setRole(r)}
                            >
                                <Text style={[styles.roleTabText, role === r && styles.activeTabText]}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Form Fields */}
                <SectionCard>
                    {/* Name */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Full Name *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter full name"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* Email */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email Address *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter email"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Password *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter password"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {/* Mobile */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter mobile number"
                                placeholderTextColor={colors.textMuted}
                                value={mobileNumber}
                                onChangeText={setMobileNumber}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                </SectionCard>

                {/* Organization Setup */}
                <SectionCard style={styles.mt}>
                    <Text style={styles.sectionTitle}>Profile & Setup</Text>

                    {/* Institute Dropdown */}
                    {!isInstitute && !route.params?.instituteId && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Select Institute *</Text>
                            <TouchableOpacity
                                style={styles.dropdownTrigger}
                                onPress={() => setShowInstSelect(!showInstSelect)}
                            >
                                <Text style={selectedInstitute ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                                    {institutes.find(i => i._id === selectedInstitute)?.name || 'Choose Institute'}
                                </Text>
                                <Ionicons name={showInstSelect ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                            </TouchableOpacity>

                            {showInstSelect && (
                                <View style={styles.dropdownMenu}>
                                    {loadingDropdowns ? (
                                        <ActivityIndicator size="small" color={colors.primary} style={styles.pv} />
                                    ) : institutes.length > 0 ? (
                                        institutes.map(i => (
                                            <TouchableOpacity
                                                key={i._id}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setSelectedInstitute(i._id);
                                                    setShowInstSelect(false);
                                                }}
                                            >
                                                <Text style={styles.itemText}>{i.name}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={styles.noData}>No institutes found</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Course Dropdown */}
                    {(role === 'Student' || role === 'Teacher') && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Assign Course</Text>
                            <TouchableOpacity
                                style={styles.dropdownTrigger}
                                onPress={() => setShowCourseSelect(!showCourseSelect)}
                            >
                                <Text style={selectedCourse ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                                    {courses.find(c => c._id === selectedCourse)?.name || 'Choose Course'}
                                </Text>
                                <Ionicons name={showCourseSelect ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                            </TouchableOpacity>

                            {showCourseSelect && (
                                <View style={styles.dropdownMenu}>
                                    {loadingDropdowns ? (
                                        <ActivityIndicator size="small" color={colors.primary} style={styles.pv} />
                                    ) : courses.length > 0 ? (
                                        courses.map(c => (
                                            <TouchableOpacity
                                                key={c._id}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setSelectedCourse(c._id);
                                                    setShowCourseSelect(false);
                                                }}
                                            >
                                                <Text style={styles.itemText}>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={styles.noData}>No courses found</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Subject (Student-specific) */}
                    {role === 'Student' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Select Primary Subject</Text>
                            <TouchableOpacity
                                style={styles.dropdownTrigger}
                                onPress={() => setShowSubjectSelect(!showSubjectSelect)}
                            >
                                <Text style={studentSubject ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                                    {studentSubject || 'Choose Subject'}
                                </Text>
                                <Ionicons name={showSubjectSelect ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                            </TouchableOpacity>

                            {showSubjectSelect && (
                                <View style={styles.dropdownMenu}>
                                    {loadingDropdowns ? (
                                        <ActivityIndicator size="small" color={colors.primary} style={styles.pv} />
                                    ) : (availableSubjects.length > 0 ? availableSubjects : subjects).length > 0 ? (
                                        (availableSubjects.length > 0 ? availableSubjects : subjects).map(s => (
                                            <TouchableOpacity
                                                key={s._id || s.name}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setStudentSubject(s.name);
                                                    setShowSubjectSelect(false);
                                                }}
                                            >
                                                <Text style={styles.itemText}>{s.name} {s.code ? `(${s.code})` : ''}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={styles.noData}>No subjects found</Text>
                                    )}
                                </View>
                            )}

                            <View style={[styles.inputWrapper, { marginTop: 8 }]}>
                                <Ionicons name="library-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Or type subject name manually"
                                    placeholderTextColor={colors.textMuted}
                                    value={studentSubject}
                                    onChangeText={setStudentSubject}
                                />
                            </View>
                        </View>
                    )}

                    {/* Subjects (Teacher-specific) */}
                    {role === 'Teacher' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Select Teaching Subjects</Text>
                            <TouchableOpacity
                                style={styles.dropdownTrigger}
                                onPress={() => setShowSubjectSelect(!showSubjectSelect)}
                            >
                                <Text style={teacherSubjects ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                                    {teacherSubjects || 'Choose Subjects'}
                                </Text>
                                <Ionicons name={showSubjectSelect ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                            </TouchableOpacity>

                            {showSubjectSelect && (
                                <View style={styles.dropdownMenu}>
                                    {loadingDropdowns ? (
                                        <ActivityIndicator size="small" color={colors.primary} style={styles.pv} />
                                    ) : (availableSubjects.length > 0 ? availableSubjects : subjects).length > 0 ? (
                                        (availableSubjects.length > 0 ? availableSubjects : subjects).map(s => {
                                            const currentList = teacherSubjects ? teacherSubjects.split(',').map(t => t.trim()).filter(Boolean) : [];
                                            const isSelected = currentList.includes(s.name);
                                            return (
                                                <TouchableOpacity
                                                    key={s._id || s.name}
                                                    style={[styles.dropdownItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                                    onPress={() => {
                                                        let nextList = [];
                                                        if (isSelected) {
                                                            nextList = currentList.filter(item => item !== s.name);
                                                        } else {
                                                            nextList = [...currentList, s.name];
                                                        }
                                                        setTeacherSubjects(nextList.join(', '));
                                                    }}
                                                >
                                                    <Text style={styles.itemText}>{s.name} {s.code ? `(${s.code})` : ''}</Text>
                                                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                                                </TouchableOpacity>
                                            );
                                        })
                                    ) : (
                                        <Text style={styles.noData}>No subjects found</Text>
                                    )}
                                </View>
                            )}

                            <View style={[styles.inputWrapper, { marginTop: 8 }]}>
                                <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Or enter custom subjects (e.g. Physics, Chemistry)"
                                    placeholderTextColor={colors.textMuted}
                                    value={teacherSubjects}
                                    onChangeText={setTeacherSubjects}
                                />
                            </View>
                        </View>
                    )}
                </SectionCard>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: activeColor }]}
                    onPress={handleCreateUser}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                            <Text style={styles.submitBtnText}>Create {role}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 40 },
    roleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: 4,
        marginBottom: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    roleTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        borderRadius: borderRadius.md - 2,
    },
    roleTabText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.white,
    },
    sectionTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.borderLight,
        paddingBottom: spacing.xs,
    },
    formGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
    },
    input: {
        flex: 1,
        fontSize: fontSizes.md,
        color: colors.text,
        marginLeft: 10,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
    },
    dropdownPlaceholder: {
        fontSize: fontSizes.md,
        color: colors.textMuted,
    },
    dropdownSelected: {
        fontSize: fontSizes.md,
        color: colors.text,
        fontWeight: '600',
    },
    dropdownMenu: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginTop: 6,
        paddingVertical: 4,
        elevation: 4,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    itemText: {
        fontSize: fontSizes.md,
        color: colors.text,
    },
    noData: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        padding: spacing.md,
        textAlign: 'center',
    },
    pv: { paddingVertical: spacing.md },
    mt: { marginTop: spacing.md },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: borderRadius.md,
        marginTop: spacing.xl,
        elevation: 3,
    },
    submitBtnText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '700',
    },
});

export default CreateUserScreen;
