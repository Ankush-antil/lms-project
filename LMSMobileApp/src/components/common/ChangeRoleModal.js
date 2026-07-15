import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, TextInput
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';

/* ── Tokens ── */
const C = {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    sub: '#475569',
    muted: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    accent: '#0f172a',
    indigo: '#6366f1',
    indigoLight: '#eef2ff',
    green: '#10b981',
    greenLight: '#ecfdf5',
    red: '#ef4444',
    redLight: '#fef2f2',
    amber: '#f59e0b',
    amberLight: '#fffbeb',
    white: '#ffffff',
};
const sp = { xs: 4, sm: 8, md: 16, lg: 24 };
const fz = { xs: 11, sm: 13, md: 15, lg: 18 };
const r = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

const ROLE_ICONS = {
    Admin: 'shield-outline',
    Teacher: 'checkmark-circle-outline',
    Student: 'school-outline',
    Editor: 'create-outline',
    Institute: 'business-outline',
    Accountant: 'calculator-outline',
    Marketer: 'megaphone-outline',
    Staff: 'briefcase-outline',
    Parent: 'heart-outline'
};

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

const ChangeRoleModal = ({ visible, onClose }) => {
    const { user, switchAccount } = useAuth();
    
    // Core/Request States
    const [submitting, setSubmitting] = useState(false);
    const [requestedRole, setRequestedRole] = useState('');
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    // Password verification states
    const [password, setPassword] = useState('');
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

    // Admin context switching suboptions states
    const [institutes, setInstitutes] = useState([]);
    const [selectedInst, setSelectedInst] = useState('');
    const [selectedSection, setSelectedSection] = useState('A');
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);
    const [pendingSwitchRole, setPendingSwitchRole] = useState(null);
    const [showContextConfig, setShowContextConfig] = useState(false);
    
    // Selectors Triggers
    const [showRoleSelector, setShowRoleSelector] = useState(false);
    const [showCourseSelector, setShowCourseSelector] = useState(false);
    const [showInstSelector, setShowInstSelector] = useState(false);
    const [showTeacherCoursesSelector, setShowTeacherCoursesSelector] = useState(false);
    const [showTeacherSectionsSelector, setShowTeacherSectionsSelector] = useState(false);

    const allRoles = ['Admin', 'Teacher', 'Student', 'Editor', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent'];
    const hasAdminPrivilege = user?.role === 'Admin' || user?.role === 'Institute' || user?.allowedRoles?.includes('Admin') || user?.allowedRoles?.includes('Institute');
    
    const allowedRoles = hasAdminPrivilege
        ? allRoles
        : (user?.allowedRoles?.length ? user.allowedRoles : [user?.role]);

    // Roles that can be requested
    const requestableRoles = allRoles.filter(role => role !== 'Admin' && !allowedRoles.includes(role));

    // Fetch previous requests & courses
    const fetchRequestsAndCourses = async () => {
        if (!user) return;
        try {
            setLoadingRequests(true);
            const [reqRes, courseRes, instRes] = await Promise.all([
                !hasAdminPrivilege ? axios.get('/users/role-requests?myRequests=true') : Promise.resolve({ data: [] }),
                axios.get('/setup/courses'),
                hasAdminPrivilege ? axios.get('/setup/institutes') : Promise.resolve({ data: [] })
            ]);
            setPendingRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
            setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
            setInstitutes(Array.isArray(instRes.data) ? instRes.data : []);
        } catch (e) {
            console.error("Failed to load requests/courses/institutes:", e);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchRequestsAndCourses();
            setRequestedRole('');
            setSelectedCourse('');
            setPendingSwitchRole(null);
            setShowContextConfig(false);
        }
    }, [visible]);

    if (!visible || !user) return null;

    const handleSwitchRoleClick = (targetRole) => {
        if (targetRole === user.role) return;
        
        // If current user is Admin/Institute (based on allowedRoles/role), they never need a password
        if (hasAdminPrivilege) {
            if (targetRole !== 'Admin') {
                setPendingSwitchRole(targetRole);
                setSelectedInst(user.institute?._id || user.institute || '');
                setSelectedCourse('');
                setSelectedSection('A');
                setSelectedCourses([]);
                setSelectedSections(['A']);
                setShowContextConfig(true);
            } else {
                executeRoleSwitch(targetRole, {});
            }
            return;
        }

        // If current role is Student or Teacher, we must prompt for password
        if (user.role === 'Student' || user.role === 'Teacher') {
            setPendingSwitchRole(targetRole);
            setPassword('');
            setShowPasswordPrompt(true);
            return;
        }

        // Direct switch for other normal users
        executeRoleSwitch(targetRole, {});
    };

    const handlePasswordConfirm = () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }
        setShowPasswordPrompt(false);

        // If switching from Student/Teacher to another role and user has admin privilege, configure context
        if (hasAdminPrivilege && pendingSwitchRole !== 'Admin') {
            setSelectedInst(user.institute?._id || user.institute || '');
            setSelectedCourse('');
            setSelectedSection('A');
            setSelectedCourses([]);
            setSelectedSections(['A']);
            setShowContextConfig(true);
        } else {
            executeRoleSwitch(pendingSwitchRole, { password });
        }
    };

    const executeRoleSwitch = async (targetRole, options = {}) => {
        setSubmitting(true);
        try {
            const { data } = await axios.put('/users/switch-role', { 
                newRole: targetRole,
                ...options
            });
            
            // Reload user session on mobile
            const token = await SecureStore.getItemAsync('authToken');
            if (token && switchAccount) {
                const updatedUser = data.user || data;
                await switchAccount(token, updatedUser);
            }
            
            Alert.alert('✓ Role Switched', `Active role changed to ${targetRole}`);
            setShowContextConfig(false);
            onClose();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Could not switch role');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestRoleSubmit = async () => {
        if (!requestedRole) { Alert.alert('Error', 'Please select a role to request'); return; }
        if (requestedRole === 'Student' && !selectedCourse) { Alert.alert('Error', 'Please select a course'); return; }
        
        setSubmitting(true);
        try {
            const { data } = await axios.post('/users/role-requests', {
                requestedRole,
                courseId: requestedRole === 'Student' ? selectedCourse : undefined
            });
            Alert.alert('✓ Submitted', data.message || 'Request submitted successfully!');
            setRequestedRole('');
            setSelectedCourse('');
            fetchRequestsAndCourses();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedCourseObj = courses.find(c => c._id === selectedCourse);
    const selectedInstObj = institutes.find(i => i._id === selectedInst);

    // Multi-select helpers for teacher assigned courses
    const toggleTeacherCourse = (courseId) => {
        setSelectedCourses(prev => 
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const toggleTeacherSection = (sec) => {
        setSelectedSections(prev => 
            prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={ss.overlay}>
                <View style={ss.sheet}>
                    <View style={ss.sheetHandle} />
                    
                    {/* Header */}
                    <View style={ss.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={ss.title}>Change Active Role</Text>
                            <Text style={ss.subtitle} numberOfLines={1}>Account: {user.email}</Text>
                        </View>
                        <TouchableOpacity style={ss.closeBtn} onPress={onClose} disabled={submitting}>
                            <Ionicons name="close" size={20} color={C.sub} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={ss.body} showsVerticalScrollIndicator={false}>
                        {/* 1. Allowed Roles */}
                        <Text style={ss.sectionTitle}>Allowed Roles</Text>
                        <View style={ss.grid}>
                            {allowedRoles.map((roleName) => {
                                const isActive = roleName === user.role;
                                const iconName = ROLE_ICONS[roleName] || 'person-outline';
                                return (
                                    <TouchableOpacity
                                        key={roleName}
                                        style={[ss.roleCard, isActive && ss.roleCardActive]}
                                        onPress={() => handleSwitchRoleClick(roleName)}
                                        disabled={submitting || isActive}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[ss.iconBg, isActive && { backgroundColor: C.indigo }]}>
                                            <Ionicons name={iconName} size={20} color={isActive ? C.white : C.sub} />
                                        </View>
                                        <Text style={[ss.roleName, isActive && { color: C.indigo, fontWeight: '900' }]}>{roleName}</Text>
                                        <Text style={ss.statusLabel}>
                                            {isActive ? 'Active' : 'Switch'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* 2. Request Role Form (Non-Admins Only) */}
                        {!hasAdminPrivilege && requestableRoles.length > 0 && (
                            <View style={ss.requestSection}>
                                <Text style={ss.sectionTitle}>Request New Role</Text>
                                
                                {/* Role Picker Trigger */}
                                <Text style={ss.inputLabel}>Select Role</Text>
                                <TouchableOpacity 
                                    style={ss.pickerTrigger} 
                                    onPress={() => setShowRoleSelector(true)}
                                    activeOpacity={0.8}
                                >
                                    <View style={ss.pickerLeft}>
                                        <Ionicons name={ROLE_ICONS[requestedRole] || 'person-outline'} size={18} color={requestedRole ? C.indigo : C.muted} />
                                        <Text style={[ss.pickerText, !requestedRole && { color: C.muted }]}>
                                            {requestedRole || 'Choose a role to add...'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-down" size={16} color={C.muted} />
                                </TouchableOpacity>

                                {/* Course Picker Trigger (If Student role selected) */}
                                {requestedRole === 'Student' && (
                                    <View style={ss.courseWrap}>
                                        <Text style={ss.inputLabel}>Select Course</Text>
                                        <TouchableOpacity 
                                            style={ss.pickerTrigger} 
                                            onPress={() => setShowCourseSelector(true)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={ss.pickerLeft}>
                                                <Ionicons name="book-outline" size={18} color={selectedCourse ? C.indigo : C.muted} />
                                                <Text style={[ss.pickerText, !selectedCourse && { color: C.muted }]}>
                                                    {selectedCourseObj ? `${selectedCourseObj.name} (${selectedCourseObj.code})` : 'Choose a course...'}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-down" size={16} color={C.muted} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Submit button */}
                                <TouchableOpacity 
                                    style={[ss.submitBtn, { backgroundColor: C.indigo }, (!requestedRole || (requestedRole === 'Student' && !selectedCourse)) && { opacity: 0.5 }]} 
                                    onPress={handleRequestRoleSubmit}
                                    disabled={submitting || !requestedRole || (requestedRole === 'Student' && !selectedCourse)}
                                >
                                    <Ionicons name="paper-plane-outline" size={16} color={C.white} />
                                    <Text style={ss.submitBtnText}>Submit Request</Text>
                                </TouchableOpacity>

                                <Text style={ss.disclaimer}>
                                    * Your request will be sent to the {user.institute ? 'Institute' : 'Admin'} for review. Once approved, the role will appear in your Allowed Roles list.
                                </Text>
                            </View>
                        )}

                        {/* 3. My Request Status List */}
                        {!hasAdminPrivilege && pendingRequests.length > 0 && (
                            <View style={ss.requestStatusSection}>
                                <Text style={ss.sectionTitle}>Request Status ({pendingRequests.length})</Text>
                                {loadingRequests ? (
                                    <ActivityIndicator size="small" color={C.indigo} />
                                ) : (
                                    <View style={ss.statusList}>
                                        {pendingRequests.map((req) => {
                                            const statusColor = req.status === 'Approved' ? C.green : req.status === 'Rejected' ? C.red : C.amber;
                                            const statusBg = req.status === 'Approved' ? C.greenLight : req.status === 'Rejected' ? C.redLight : C.amberLight;
                                            return (
                                                <View key={req._id} style={ss.statusCard}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={ss.statusTitle}>Requested: {req.requestedRole}</Text>
                                                        {req.course && (
                                                            <Text style={ss.statusCourse}>Course: {req.course?.name || req.course}</Text>
                                                        )}
                                                        <Text style={ss.statusDate}>
                                                            Submitted: {new Date(req.createdAt).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                    <View style={[ss.badge, { backgroundColor: statusBg }]}>
                                                        <Text style={[ss.badgeText, { color: statusColor }]}>{req.status}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {submitting && (
                        <View style={ss.loaderOverlay}>
                            <ActivityIndicator size="large" color={C.indigo} />
                            <Text style={ss.loaderText}>Processing...</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ──── ROLE SELECTOR SUB-SHEET ──── */}
            <Modal visible={showRoleSelector} transparent animationType="fade" onRequestClose={() => setShowRoleSelector(false)}>
                <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={() => setShowRoleSelector(false)}>
                    <View style={ss.subSheet}>
                        <Text style={ss.subSheetTitle}>Select Role to Request</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {requestableRoles.map((roleName) => (
                                <TouchableOpacity 
                                    key={roleName} 
                                    style={ss.selectItem} 
                                    onPress={() => { setRequestedRole(roleName); if (roleName !== 'Student') setSelectedCourse(''); setShowRoleSelector(false); }}
                                >
                                    <Ionicons name={ROLE_ICONS[roleName] || 'person-outline'} size={18} color={C.sub} />
                                    <Text style={ss.selectItemText}>{roleName}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ──── COURSE SELECTOR SUB-SHEET ──── */}
            <Modal visible={showCourseSelector} transparent animationType="fade" onRequestClose={() => setShowCourseSelector(false)}>
                <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={() => setShowCourseSelector(false)}>
                    <View style={ss.subSheet}>
                        <Text style={ss.subSheetTitle}>Select Enrolled Course</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {courses.filter(c => (c.institute?._id || c.institute) === selectedInst).map((c) => (
                                <TouchableOpacity 
                                    key={c._id} 
                                    style={ss.selectItem} 
                                    onPress={() => { setSelectedCourse(c._id); setShowCourseSelector(false); }}
                                >
                                    <Ionicons name="book-outline" size={18} color={C.sub} />
                                    <Text style={ss.selectItemText}>{c.name} ({c.code})</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ──── DYNAMIC CONTEXT CONFIGURATION SUB-MODAL (For Admin Switch Role) ──── */}
            <Modal visible={showContextConfig} transparent animationType="slide" onRequestClose={() => setShowContextConfig(false)}>
                <View style={ss.overlay}>
                    <View style={[ss.sheet, { maxHeight: '80%', borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl }]}>
                        <View style={ss.sheetHandle} />
                        
                        <View style={ss.header}>
                            <View>
                                <Text style={ss.title}>Configure Active Context</Text>
                                <Text style={ss.subtitle}>Setting parameters to switch to {pendingSwitchRole}</Text>
                            </View>
                            <TouchableOpacity style={ss.closeBtn} onPress={() => setShowContextConfig(false)}>
                                <Ionicons name="close" size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={ss.body} showsVerticalScrollIndicator={false}>
                            {/* 1. Institute Selector (Always shown for subroles) */}
                            <Text style={ss.inputLabel}>Select Campus / Institute *</Text>
                            <TouchableOpacity 
                                style={ss.pickerTrigger} 
                                onPress={() => setShowInstSelector(true)}
                                activeOpacity={0.8}
                            >
                                <View style={ss.pickerLeft}>
                                    <Ionicons name="business-outline" size={18} color={selectedInst ? C.indigo : C.muted} />
                                    <Text style={[ss.pickerText, !selectedInst && { color: C.muted }]}>
                                        {selectedInstObj ? `${selectedInstObj.name} (${selectedInstObj.code})` : 'Choose an institute...'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={16} color={C.muted} />
                            </TouchableOpacity>

                            {/* 2. Student Role Parameters */}
                            {pendingSwitchRole === 'Student' && (
                                <View>
                                    <Text style={ss.inputLabel}>Select Course *</Text>
                                    <TouchableOpacity 
                                        style={ss.pickerTrigger} 
                                        onPress={() => setShowCourseSelector(true)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={ss.pickerLeft}>
                                            <Ionicons name="book-outline" size={18} color={selectedCourse ? C.indigo : C.muted} />
                                            <Text style={[ss.pickerText, !selectedCourse && { color: C.muted }]}>
                                                {selectedCourseObj ? `${selectedCourseObj.name} (${selectedCourseObj.code})` : 'Choose a course...'}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-down" size={16} color={C.muted} />
                                    </TouchableOpacity>

                                    <Text style={ss.inputLabel}>Select Section</Text>
                                    <View style={ss.sectionButtonRow}>
                                        {SECTIONS.slice(0, selectedCourseObj?.sectionsCount || 1).map(s => {
                                            const isSel = selectedSection === s;
                                            return (
                                                <TouchableOpacity 
                                                    key={s} 
                                                    style={[ss.secBtn, isSel && ss.secBtnActive]}
                                                    onPress={() => setSelectedSection(s)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[ss.secBtnText, isSel && { color: C.white }]}>{s}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* 3. Teacher Role Parameters */}
                            {pendingSwitchRole === 'Teacher' && (
                                <View>
                                    {/* Multi-Select Courses */}
                                    <Text style={ss.inputLabel}>Assigned Courses</Text>
                                    <TouchableOpacity 
                                        style={ss.pickerTrigger} 
                                        onPress={() => setShowTeacherCoursesSelector(true)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={ss.pickerLeft}>
                                            <Ionicons name="book-outline" size={18} color={selectedCourses.length > 0 ? C.indigo : C.muted} />
                                            <Text style={[ss.pickerText, selectedCourses.length === 0 && { color: C.muted }]} numberOfLines={1}>
                                                {selectedCourses.length === 0 ? 'Select assigned courses...' : `${selectedCourses.length} Courses Selected`}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-down" size={16} color={C.muted} />
                                    </TouchableOpacity>

                                    {/* Multi-Select Sections */}
                                    <Text style={ss.inputLabel}>Assigned Sections</Text>
                                    <TouchableOpacity 
                                        style={ss.pickerTrigger} 
                                        onPress={() => setShowTeacherSectionsSelector(true)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={ss.pickerLeft}>
                                            <Ionicons name="grid-outline" size={18} color={selectedSections.length > 0 ? C.indigo : C.muted} />
                                            <Text style={[ss.pickerText, selectedSections.length === 0 && { color: C.muted }]} numberOfLines={1}>
                                                {selectedSections.length === 0 ? 'Select assigned sections...' : selectedSections.join(', ')}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-down" size={16} color={C.muted} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Confirm Action Button */}
                            <TouchableOpacity 
                                style={[ss.submitBtn, { backgroundColor: C.indigo, marginTop: 20 }, (!selectedInst || (pendingSwitchRole === 'Student' && !selectedCourse)) && { opacity: 0.5 }]} 
                                onPress={() => {
                                    executeRoleSwitch(pendingSwitchRole, {
                                        password: password || undefined,
                                        institute: selectedInst,
                                        courseId: pendingSwitchRole === 'Student' ? selectedCourse : undefined,
                                        section: pendingSwitchRole === 'Student' ? selectedSection : undefined,
                                        courseIds: pendingSwitchRole === 'Teacher' ? selectedCourses : undefined,
                                        sections: pendingSwitchRole === 'Teacher' ? selectedSections : undefined
                                    });
                                }}
                                disabled={submitting || !selectedInst || (pendingSwitchRole === 'Student' && !selectedCourse)}
                            >
                                <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />
                                <Text style={ss.submitBtnText}>Confirm and Switch Role</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ──── ADMIN SWITCH INSTITUTE SELECTOR SHEET ──── */}
            <Modal visible={showInstSelector} transparent animationType="fade" onRequestClose={() => setShowInstSelector(false)}>
                <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={() => setShowInstSelector(false)}>
                    <View style={ss.subSheet}>
                        <Text style={ss.subSheetTitle}>Choose Campus</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {institutes.map((inst) => (
                                <TouchableOpacity 
                                    key={inst._id} 
                                    style={ss.selectItem} 
                                    onPress={() => {
                                        setSelectedInst(inst._id);
                                        setSelectedCourse('');
                                        setSelectedCourses([]);
                                        setSelectedSections(['A']);
                                        setShowInstSelector(false);
                                    }}
                                >
                                    <Ionicons name="business-outline" size={18} color={C.sub} />
                                    <Text style={ss.selectItemText}>{inst.name} ({inst.code})</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ──── ADMIN TEACHER ASSIGNED COURSES MULTI-SELECTOR ──── */}
            <Modal visible={showTeacherCoursesSelector} transparent animationType="fade" onRequestClose={() => setShowTeacherCoursesSelector(false)}>
                <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={() => setShowTeacherCoursesSelector(false)}>
                    <View style={ss.subSheet}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={ss.subSheetTitle}>Assigned Courses</Text>
                            <TouchableOpacity onPress={() => setShowTeacherCoursesSelector(false)}>
                                <Text style={{ color: C.indigo, fontWeight: '800', fontSize: fz.sm }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {courses.filter(c => (c.institute?._id || c.institute) === selectedInst).map((course) => {
                                const isSel = selectedCourses.includes(course._id);
                                return (
                                    <TouchableOpacity 
                                        key={course._id} 
                                        style={ss.selectItem} 
                                        onPress={() => toggleTeacherCourse(course._id)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={isSel ? "checkbox" : "square-outline"} size={20} color={isSel ? C.indigo : C.muted} />
                                        <Text style={[ss.selectItemText, isSel && { color: C.indigo }]}>{course.name} ({course.code})</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ──── ADMIN TEACHER ASSIGNED SECTIONS MULTI-SELECTOR ──── */}
            <Modal visible={showTeacherSectionsSelector} transparent animationType="fade" onRequestClose={() => setShowTeacherSectionsSelector(false)}>
                <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={() => setShowTeacherSectionsSelector(false)}>
                    <View style={ss.subSheet}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={ss.subSheetTitle}>Assigned Sections</Text>
                            <TouchableOpacity onPress={() => setShowTeacherSectionsSelector(false)}>
                                <Text style={{ color: C.indigo, fontWeight: '800', fontSize: fz.sm }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {(() => {
                                const maxSectionsCount = Math.max(...selectedCourses.map(id => courses.find(c => c._id === id)?.sectionsCount || 1), 1);
                                return SECTIONS.slice(0, maxSectionsCount).map((sec) => {
                                    const isSel = selectedSections.includes(sec);
                                    return (
                                        <TouchableOpacity 
                                            key={sec} 
                                            style={ss.selectItem} 
                                            onPress={() => toggleTeacherSection(sec)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name={isSel ? "checkbox" : "square-outline"} size={20} color={isSel ? C.indigo : C.muted} />
                                            <Text style={[ss.selectItemText, isSel && { color: C.indigo }]}>Section {sec}</Text>
                                        </TouchableOpacity>
                                    );
                                });
                            })()}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ──── PASSWORD PROMPT SUB-SHEET ──── */}
            <Modal visible={showPasswordPrompt} transparent animationType="fade" onRequestClose={() => setShowPasswordPrompt(false)}>
                <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={() => setShowPasswordPrompt(false)}>
                    <View style={ss.subSheet} onStartShouldSetResponder={() => true}>
                        <Text style={ss.subSheetTitle}>Switching from {user?.role} Role</Text>
                        <Text style={[ss.inputLabel, { textTransform: 'none', marginBottom: 12 }]}>
                            Enter your account password to verify your identity and switch role:
                        </Text>
                        <TextInput
                            style={ss.passwordInput}
                            placeholder="Enter password"
                            placeholderTextColor={C.muted}
                            secureTextEntry={true}
                            value={password}
                            onChangeText={setPassword}
                            autoFocus={true}
                        />
                        <View style={ss.btnRow}>
                            <TouchableOpacity 
                                style={[ss.subBtn, { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border }]} 
                                onPress={() => setShowPasswordPrompt(false)}
                            >
                                <Text style={[ss.subBtnText, { color: C.sub }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[ss.subBtn, { backgroundColor: C.indigo }]} 
                                onPress={handlePasswordConfirm}
                            >
                                <Text style={ss.subBtnText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </Modal>
    );
};

const ss = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, maxHeight: '85%', paddingBottom: 24 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginVertical: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    title: { fontSize: fz.md, fontWeight: '900', color: C.text },
    subtitle: { fontSize: fz.xs, color: C.muted, fontWeight: '600', marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

    body: { padding: sp.md },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    roleCard: { width: '48%', backgroundColor: C.card, borderWidth: 1.5, borderColor: C.borderLight, borderRadius: r.md, padding: 14, alignItems: 'center', justifyContent: 'center' },
    roleCardActive: { borderColor: C.indigo, backgroundColor: C.indigoLight },
    iconBg: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    roleName: { fontSize: fz.sm, fontWeight: '700', color: C.text, textAlign: 'center' },
    statusLabel: { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginTop: 4 },

    /* Request Form */
    requestSection: { borderTopWidth: 1, borderTopColor: C.borderLight, paddingTop: 18, marginTop: 10 },
    inputLabel: { fontSize: 10, fontWeight: '850', color: C.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
    pickerTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, height: 46, marginBottom: 14 },
    pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    pickerText: { fontSize: fz.sm, fontWeight: '600', color: C.text },
    courseWrap: { animationDuration: '200ms' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: r.md, marginTop: 4 },
    submitBtnText: { fontSize: fz.sm, fontWeight: '850', color: C.white },
    disclaimer: { fontSize: 9, color: C.muted, fontWeight: '650', marginTop: 8, lineHeight: 14 },

    /* Request Status List */
    requestStatusSection: { borderTopWidth: 1, borderTopColor: C.borderLight, paddingTop: 18, marginTop: 20 },
    statusList: { gap: 8 },
    statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderLight, borderRadius: r.md, padding: 12 },
    statusTitle: { fontSize: fz.sm, fontWeight: '800', color: C.text },
    statusCourse: { fontSize: fz.xs, fontWeight: '600', color: C.sub, marginTop: 2 },
    statusDate: { fontSize: 9, color: C.muted, fontWeight: '600', marginTop: 4 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: r.sm },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

    /* Sub-sheets for selector */
    subSheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, padding: sp.md, width: '100%' },
    subSheetTitle: { fontSize: fz.md, fontWeight: '900', color: C.text, marginBottom: 12 },
    selectItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    selectItemText: { fontSize: fz.sm, fontWeight: '700', color: C.text, flex: 1 },

    /* Sections Row */
    sectionButtonRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
    secBtn: { minWidth: 40, height: 40, borderRadius: r.sm, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    secBtnActive: { backgroundColor: C.indigo, borderColor: C.indigo },
    secBtnText: { fontSize: fz.sm, fontWeight: '800', color: C.sub },

    loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl },
    loaderText: { marginTop: 10, fontSize: fz.sm, fontWeight: '700', color: C.text },

    passwordInput: {
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: r.md,
        paddingHorizontal: 14,
        height: 46,
        fontSize: fz.sm,
        color: C.text,
        marginBottom: 16,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'flex-end',
    },
    subBtn: {
        paddingHorizontal: 20,
        height: 40,
        borderRadius: r.sm,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    subBtnText: {
        fontSize: fz.sm,
        fontWeight: '800',
        color: C.white,
    }
});

export default ChangeRoleModal;
