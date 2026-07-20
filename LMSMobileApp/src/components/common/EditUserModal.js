/**
 * EditUserModal.js
 * Shared mobile Edit modal matching the web's EditUserModal.jsx
 * Supports: Student, Teacher, Editor, Accountant, Marketer, Staff, Parent
 * 
 * Features:
 *  - Two tabs: Basic Info + Feature Controls
 *  - Assign Other Role (checkboxes for all roles)
 *  - Role-specific fields (Course, Batch, Section, Designation, Salary, etc.)
 *  - Feature Controls toggles per role
 *  - Update Password
 */

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, ScrollView, Modal, Platform, Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

/* ── Tokens ── */
const C = {
    bg: '#f8fafc', card: '#ffffff', text: '#0f172a', sub: '#475569',
    muted: '#94a3b8', border: '#e2e8f0', borderLight: '#f1f5f9',
    accent: '#0f172a', indigo: '#6366f1', indigoLight: '#eef2ff',
    green: '#10b981', greenLight: '#ecfdf5',
    red: '#ef4444', redLight: '#fef2f2',
    white: '#ffffff',
};
const sp = { xs: 4, sm: 8, md: 16, lg: 24 };
const fz = { xs: 11, sm: 13, md: 15, lg: 18 };
const r = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

/* ── Default Controls per role (same as web) ── */
const ROLE_CONTROLS = {
    Student: {
        myActivity: { enabled: true, label: 'My Activity Page' },
        dashboard: { enabled: true, label: 'Dashboard' },
        feePortal: { enabled: true, label: 'Fee Portal' },
        tools: { enabled: true, label: 'Tools Page' },
        chat: { enabled: true, label: 'Chat' },
        mySnapshots: { enabled: true, label: 'My Snapshots' },
        drive: { enabled: true, label: 'Drive' },
        notes: { enabled: true, label: 'Notes' },
    },
    Teacher: {
        dashboard: { enabled: true, label: 'Dashboard' },
        studentActivities: { enabled: true, label: 'Student Activities' },
        evaluate: { enabled: true, label: 'Evaluate' },
        snapshots: { enabled: true, label: 'Snapshots' },
        tools: { enabled: true, label: 'Tools' },
        chat: { enabled: true, label: 'Chat' },
        drive: { enabled: true, label: 'Drive' },
        notes: { enabled: true, label: 'Notes' },
    },
    Editor: {
        dashboard: { enabled: true, label: 'Dashboard' },
        teachers: { enabled: true, label: 'Teachers' },
        courses: { enabled: true, label: 'Courses' },
        subjects: { enabled: true, label: 'Subjects' },
        activities: { enabled: true, label: 'Activities' },
        tools: { enabled: true, label: 'Tools' },
        chat: { enabled: true, label: 'Chat' },
        drive: { enabled: true, label: 'Drive' },
        notes: { enabled: true, label: 'Notes' },
    },
    Accountant: {
        dashboard: { enabled: true, label: 'Dashboard' },
        feePortal: { enabled: true, label: 'Fee Portal' },
        attendance: { enabled: true, label: 'Attendance' },
        drive: { enabled: true, label: 'Drive' },
        notes: { enabled: true, label: 'Notes' },
        chat: { enabled: true, label: 'Chat' },
    },
    Marketer: {
        dashboard: { enabled: true, label: 'Dashboard' },
        drive: { enabled: true, label: 'Drive' },
        notes: { enabled: true, label: 'Notes' },
        chat: { enabled: true, label: 'Chat' },
    },
    Staff: {
        dashboard: { enabled: true, label: 'Dashboard' },
        task: { enabled: true, label: 'Task Management' },
        attendance: { enabled: true, label: 'Attendance' },
        salary: { enabled: true, label: 'Salary' },
        drive: { enabled: true, label: 'Drive' },
        notes: { enabled: true, label: 'Notes' },
        chat: { enabled: true, label: 'Chat' },
    },
    Parent: {
        dashboard: { enabled: true, label: 'Dashboard' },
        studentFee: { enabled: true, label: 'Student Fee Portal' },
        attendance: { enabled: true, label: 'Attendance' },
        activities: { enabled: true, label: 'Activities' },
    },
};

const ALL_ROLES = ['Student', 'Teacher', 'Editor', 'Accountant', 'Marketer', 'Parent'];

const HEADER_COLORS = {
    Student:    ['#1e3a5f', '#1e40af'],
    Teacher:    ['#1e3a2f', '#166534'],
    Editor:     ['#3b1a5f', '#6d28d9'],
    Accountant: ['#1a3a3a', '#0f766e'],
    Marketer:   ['#3a1a1a', '#c2410c'],
    Staff:      ['#1a2a3a', '#1d4ed8'],
    Parent:     ['#1e1b4b', '#be185d'],
};

/* ══════════════════════════════════════
   EDIT USER MODAL COMPONENT
══════════════════════════════════════ */
const EditUserModal = ({ visible, user, role, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [saving, setSaving] = useState(false);

    // Basic fields
    const [fName, setFName] = useState('');
    const [fEmail, setFEmail] = useState('');
    const [fMobile, setFMobile] = useState('');
    const [fPassword, setFPassword] = useState('');
    const [fInstitute, setFInstitute] = useState('');
    const [fRoles, setFRoles] = useState([]);
    const [fControls, setFControls] = useState({});

    // Role-specific fields
    const [fCourse, setFCourse] = useState('');
    const [fBatch, setFBatch] = useState('');
    const [fSection, setFSection] = useState('');
    const [fDesignation, setFDesignation] = useState('');
    const [fDepartment, setFDepartment] = useState('');
    const [fSalary, setFSalary] = useState('');
    const [fSubjects, setFSubjects] = useState('');
    const [fStudent, setFStudent] = useState(''); // for Parent

    // Picker data
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);

    // Pickers
    const [showInstPicker, setShowInstPicker] = useState(false);
    const [showCoursePicker, setShowCoursePicker] = useState(false);
    const [showStudentPicker, setShowStudentPicker] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    const activeRole = role || user?.role || 'Student';
    const defaultControls = ROLE_CONTROLS[activeRole] || {};

    /* ── Initialize when user changes ── */
    useEffect(() => {
        if (!visible || !user) return;
        setActiveTab('basic');
        setFName(user.name || '');
        setFEmail(user.email || '');
        setFMobile(user.mobileNumber || '');
        setFPassword('');
        setFInstitute(user.institute?._id || user.institute || '');
        setFRoles(user.allowedRoles?.length ? user.allowedRoles : [user.role || activeRole]);

        // Role-specific
        const sp = user.studentProfile;
        const tp = user.teacherProfile;
        const sfp = user.staffProfile;
        const pp = user.parentProfile;

        setFCourse(sp?.course?._id || sp?.course || tp?.assignedCourses?.[0]?._id || tp?.assignedCourses?.[0] || '');
        setFBatch(sp?.batch || '');
        setFSection(sp?.section || '');
        setFDesignation(tp?.designation || sfp?.designation || '');
        setFDepartment(sfp?.department || '');
        setFSalary(sfp?.salary || tp?.salary || '');
        setFSubjects(tp?.subjects?.join(', ') || '');
        setFStudent(pp?.student?._id || pp?.student || '');

        // Controls
        const existingControls = {};
        const roleProfile = sp || tp || sfp || pp || user.editorProfile || user.accountantProfile || user.marketerProfile;
        const savedControls = roleProfile?.controls || {};
        Object.keys(defaultControls).forEach(k => {
            existingControls[k] = { ...defaultControls[k], ...savedControls[k] };
        });
        setFControls(existingControls);

        setStudentSearch('');

        // Fetch pickers
        Promise.all([
            axios.get('/setup/institutes'),
            axios.get('/setup/courses'),
            activeRole === 'Parent' ? axios.get('/users?role=Student') : Promise.resolve({ data: [] }),
        ]).then(([ir, cr, sr]) => {
            setInstitutes(Array.isArray(ir.data) ? ir.data : []);
            setCourses(Array.isArray(cr.data) ? cr.data : []);
            setStudents(Array.isArray(sr.data) ? sr.data : sr.data?.users || []);
        }).catch(console.error);
    }, [visible, user]);

    const toggleRole = r => {
        if (r === activeRole) return; // can't remove default role
        setFRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    };

    const toggleControl = key => {
        setFControls(prev => ({
            ...prev,
            [key]: { ...prev[key], enabled: !(prev[key]?.enabled !== false) },
        }));
    };

    const handleSave = async () => {
        if (!fName.trim()) { Alert.alert('Error', 'Name is required'); return; }
        setSaving(true);
        try {
            const roleProfileKey = {
                Student: 'studentProfile', Teacher: 'teacherProfile',
                Editor: 'editorProfile', Accountant: 'accountantProfile',
                Marketer: 'marketerProfile', Staff: 'staffProfile', Parent: 'parentProfile',
            }[activeRole] || 'studentProfile';

            const controlsPayload = {};
            Object.keys(fControls).forEach(k => {
                controlsPayload[k] = { enabled: fControls[k].enabled !== false };
            });

            const profilePayload = { controls: controlsPayload };
            if (activeRole === 'Student') {
                if (fCourse) profilePayload.course = fCourse;
                if (fBatch) profilePayload.batch = fBatch;
                if (fSection) profilePayload.section = fSection;
            } else if (activeRole === 'Teacher') {
                if (fCourse) profilePayload.assignedCourses = [fCourse];
                if (fSubjects) profilePayload.subjects = fSubjects.split(',').map(s => s.trim()).filter(Boolean);
                if (fDesignation) profilePayload.designation = fDesignation;
            } else if (activeRole === 'Staff') {
                if (fDesignation) profilePayload.designation = fDesignation;
                if (fDepartment) profilePayload.department = fDepartment;
                if (fSalary) profilePayload.salary = fSalary;
            } else if (activeRole === 'Parent') {
                if (fStudent) profilePayload.student = fStudent;
            }

            const payload = {
                name: fName.trim(),
                email: fEmail.trim(),
                mobileNumber: fMobile.trim(),
                allowedRoles: fRoles,
                [roleProfileKey]: { ...user[roleProfileKey], ...profilePayload },
            };
            if (fInstitute) payload.institute = fInstitute;
            if (fPassword.trim()) payload.password = fPassword.trim();

            await axios.put(`/users/${user._id}`, payload);
            onSuccess?.({ ...user, ...payload });
            onClose();
            Alert.alert('✓ Updated', `${user.name} updated successfully`);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Could not update');
        } finally { setSaving(false); }
    };

    if (!visible || !user) return null;

    const headerBg = HEADER_COLORS[activeRole]?.[0] || '#1e1b4b';
    const selInst = institutes.find(i => i._id === fInstitute);
    const selCourse = courses.find(c => c._id === fCourse);
    const selStudent = students.find(s => s._id === fStudent);
    const filteredStudents = students.filter(s =>
        [s.name, s.email].some(v => v?.toLowerCase().includes(studentSearch.toLowerCase()))
    );

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={ms.overlay}>
                    <View style={ms.sheet}>
                        {/* Header */}
                        <View style={[ms.header, { backgroundColor: headerBg }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={ms.headerTitle}>Edit {activeRole}: {user.name}</Text>
                            </View>
                            <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
                                <Ionicons name="close" size={18} color={C.white} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={ms.tabRow}>
                            {[
                                { key: 'basic', label: 'Basic Info' },
                                { key: 'controls', label: 'Feature Controls' },
                            ].map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[ms.tab, activeTab === t.key && ms.tabActive]}
                                    onPress={() => setActiveTab(t.key)}
                                >
                                    <Text style={[ms.tabText, activeTab === t.key && ms.tabTextActive]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <ScrollView contentContainerStyle={ms.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                            {/* ──── BASIC INFO ──── */}
                            {activeTab === 'basic' && (
                                <View>
                                    {/* Row: Name + Institute */}
                                    <View style={ms.row}>
                                        <View style={ms.half}>
                                            <FieldLabel>FULL NAME</FieldLabel>
                                            <TextInput style={ms.input} value={fName} onChangeText={setFName} placeholder="Full name" placeholderTextColor={C.muted} />
                                        </View>
                                        <View style={ms.half}>
                                            <FieldLabel>INSTITUTE</FieldLabel>
                                            <TouchableOpacity style={ms.input} onPress={() => setShowInstPicker(true)}>
                                                <Text style={[ms.pickerText, !selInst && ms.pickerPlaceholder]}>
                                                    {selInst?.name || 'Select Institute'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Row: Email + Mobile */}
                                    <View style={ms.row}>
                                        <View style={ms.half}>
                                            <FieldLabel>EMAIL ADDRESS</FieldLabel>
                                            <TextInput style={ms.input} value={fEmail} onChangeText={setFEmail} placeholder="email@lms.com" placeholderTextColor={C.muted} keyboardType="email-address" autoCapitalize="none" />
                                        </View>
                                        <View style={ms.half}>
                                            <FieldLabel>MOBILE NUMBER</FieldLabel>
                                            <TextInput style={ms.input} value={fMobile} onChangeText={setFMobile} placeholder="+92 300…" placeholderTextColor={C.muted} keyboardType="phone-pad" />
                                        </View>
                                    </View>

                                    {/* Role-specific fields */}
                                    {(activeRole === 'Student' || activeRole === 'Teacher' || activeRole === 'Editor') && (
                                        <View style={ms.row}>
                                            <View style={ms.half}>
                                                <FieldLabel>COURSE</FieldLabel>
                                                <TouchableOpacity style={ms.input} onPress={() => setShowCoursePicker(true)}>
                                                    <Text style={[ms.pickerText, !selCourse && ms.pickerPlaceholder]}>
                                                        {selCourse?.name || 'Select Course'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            {activeRole === 'Student' && (
                                                <View style={ms.half}>
                                                    <FieldLabel>BATCH</FieldLabel>
                                                    <TextInput style={ms.input} value={fBatch} onChangeText={setFBatch} placeholder="e.g. 2024" placeholderTextColor={C.muted} />
                                                </View>
                                            )}
                                            {activeRole === 'Teacher' && (
                                                <View style={ms.half}>
                                                    <FieldLabel>SUBJECTS</FieldLabel>
                                                    <TextInput style={ms.input} value={fSubjects} onChangeText={setFSubjects} placeholder="Math, Physics…" placeholderTextColor={C.muted} />
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {activeRole === 'Student' && (
                                        <>
                                            <FieldLabel>SECTION</FieldLabel>
                                            <TextInput style={[ms.input, ms.inputFull]} value={fSection} onChangeText={setFSection} placeholder="Section A / Morning" placeholderTextColor={C.muted} />
                                        </>
                                    )}

                                    {(activeRole === 'Teacher' || activeRole === 'Staff') && (
                                        <View style={ms.row}>
                                            <View style={ms.half}>
                                                <FieldLabel>DESIGNATION</FieldLabel>
                                                <TextInput style={ms.input} value={fDesignation} onChangeText={setFDesignation} placeholder="e.g. Senior Teacher" placeholderTextColor={C.muted} />
                                            </View>
                                            {activeRole === 'Staff' && (
                                                <View style={ms.half}>
                                                    <FieldLabel>DEPARTMENT</FieldLabel>
                                                    <TextInput style={ms.input} value={fDepartment} onChangeText={setFDepartment} placeholder="e.g. Admin" placeholderTextColor={C.muted} />
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {activeRole === 'Staff' && (
                                        <>
                                            <FieldLabel>SALARY (Monthly)</FieldLabel>
                                            <TextInput style={[ms.input, ms.inputFull]} value={String(fSalary)} onChangeText={setFSalary} placeholder="e.g. 25000" placeholderTextColor={C.muted} keyboardType="number-pad" />
                                        </>
                                    )}

                                    {activeRole === 'Parent' && (
                                        <>
                                            <FieldLabel>LINKED STUDENT</FieldLabel>
                                            <TouchableOpacity style={[ms.input, ms.inputFull, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setShowStudentPicker(true)}>
                                                <Text style={[ms.pickerText, !selStudent && ms.pickerPlaceholder]}>
                                                    {selStudent?.name || 'Select Enrolled Student'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={14} color={C.muted} />
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {/* ── ASSIGN OTHER ROLE ── */}
                                    <FieldLabel style={{ marginTop: sp.md }}>ASSIGN OTHER ROLE</FieldLabel>
                                    <View style={ms.roleBox}>
                                        {ALL_ROLES.map(r => {
                                            const isDefault = r === activeRole;
                                            const checked = fRoles.includes(r);
                                            return (
                                                <TouchableOpacity
                                                    key={r}
                                                    style={ms.roleItem}
                                                    onPress={() => !isDefault && toggleRole(r)}
                                                    activeOpacity={isDefault ? 1 : 0.7}
                                                >
                                                    <View style={[ms.checkbox, checked && ms.checkboxOn]}>
                                                        {checked && <Ionicons name="checkmark" size={10} color={C.white} />}
                                                    </View>
                                                    <Text style={[ms.roleText, checked && { color: C.indigo, fontWeight: '800' }]}>{r}</Text>
                                                    {isDefault && (
                                                        <View style={ms.defaultBadge}>
                                                            <Text style={ms.defaultBadgeText}>Default</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Password */}
                                    <FieldLabel style={{ marginTop: sp.md }}>UPDATE PASSWORD (OPTIONAL)</FieldLabel>
                                    <TextInput
                                        style={[ms.input, ms.inputFull]}
                                        value={fPassword}
                                        onChangeText={setFPassword}
                                        placeholder="Leave blank to keep current"
                                        placeholderTextColor={C.muted}
                                        secureTextEntry
                                    />
                                </View>
                            )}

                            {/* ──── FEATURE CONTROLS ──── */}
                            {activeTab === 'controls' && (
                                <View>
                                    <Text style={ms.controlsHint}>
                                        Toggle which pages and features this {activeRole.toLowerCase()} can access.
                                    </Text>
                                    {Object.keys(fControls).map(key => {
                                        const ctrl = fControls[key];
                                        const label = ctrl.label || defaultControls[key]?.label || key;
                                        const enabled = ctrl.enabled !== false;
                                        return (
                                            <View key={key} style={ms.controlRow}>
                                                <Text style={ms.controlLabel}>{label}</Text>
                                                <Switch
                                                    value={enabled}
                                                    onValueChange={() => toggleControl(key)}
                                                    trackColor={{ false: C.border, true: C.indigo }}
                                                    thumbColor={C.white}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Save */}
                            <TouchableOpacity style={[ms.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                                {saving
                                    ? <ActivityIndicator size="small" color={C.white} />
                                    : <>
                                        <Ionicons name="save-outline" size={18} color={C.white} />
                                        <Text style={ms.saveBtnText}>Update Details</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Institute Picker ── */}
            <PickerModal
                visible={showInstPicker}
                title="Select Institute"
                items={institutes}
                selectedId={fInstitute}
                onSelect={id => { setFInstitute(id); setShowInstPicker(false); }}
                onClose={() => setShowInstPicker(false)}
                icon="business-outline"
            />

            {/* ── Course Picker ── */}
            <PickerModal
                visible={showCoursePicker}
                title="Select Course"
                items={courses}
                selectedId={fCourse}
                onSelect={id => { setFCourse(id); setShowCoursePicker(false); }}
                onClose={() => setShowCoursePicker(false)}
                icon="book-outline"
            />

            {/* ── Student Picker ── */}
            <Modal visible={showStudentPicker} transparent animationType="slide" onRequestClose={() => setShowStudentPicker(false)}>
                <View style={ms.overlay}>
                    <View style={ms.pickerSheet}>
                        <View style={ms.pickerHandle} />
                        <View style={ms.pickerHeader}>
                            <Text style={ms.pickerTitle}>Select Enrolled Student</Text>
                            <TouchableOpacity onPress={() => setShowStudentPicker(false)}><Ionicons name="close" size={20} color={C.sub} /></TouchableOpacity>
                        </View>
                        <View style={[ms.searchRow]}>
                            <Ionicons name="search-outline" size={14} color={C.muted} />
                            <TextInput style={ms.searchInput} placeholder="Search students…" placeholderTextColor={C.muted} value={studentSearch} onChangeText={setStudentSearch} />
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            <TouchableOpacity style={[ms.optRow, !fStudent && ms.optRowActive]} onPress={() => { setFStudent(''); setShowStudentPicker(false); }}>
                                <Text style={[ms.optText, !fStudent && { color: C.indigo }]}>— None (unlink) —</Text>
                                {!fStudent && <Ionicons name="checkmark-circle" size={16} color={C.indigo} />}
                            </TouchableOpacity>
                            {filteredStudents.map(s => (
                                <TouchableOpacity key={s._id} style={[ms.optRow, fStudent === s._id && ms.optRowActive]} onPress={() => { setFStudent(s._id); setShowStudentPicker(false); }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[ms.optText, fStudent === s._id && { color: C.indigo, fontWeight: '800' }]}>{s.name}</Text>
                                        <Text style={{ fontSize: fz.xs, color: C.muted }}>{s.email}</Text>
                                    </View>
                                    {fStudent === s._id && <Ionicons name="checkmark-circle" size={16} color={C.indigo} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

/* ── Reusable picker bottom sheet ── */
const PickerModal = ({ visible, title, items, selectedId, onSelect, onClose, icon }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={ms.overlay}>
            <View style={ms.pickerSheet}>
                <View style={ms.pickerHandle} />
                <View style={ms.pickerHeader}>
                    <Text style={ms.pickerTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color={C.sub} /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {items.map(item => {
                        const sel = selectedId === item._id;
                        return (
                            <TouchableOpacity key={item._id} style={[ms.optRow, sel && ms.optRowActive]} onPress={() => onSelect(item._id)}>
                                <Ionicons name={icon || 'chevron-forward'} size={15} color={sel ? C.indigo : C.muted} />
                                <Text style={[ms.optText, { flex: 1 }, sel && { color: C.indigo, fontWeight: '800' }]}>{item.name}</Text>
                                {sel && <Ionicons name="checkmark-circle" size={16} color={C.indigo} />}
                            </TouchableOpacity>
                        );
                    })}
                    {items.length === 0 && <Text style={{ textAlign: 'center', color: C.muted, padding: 24 }}>No items found</Text>}
                </ScrollView>
            </View>
        </View>
    </Modal>
);

/* ── FieldLabel helper ── */
const FieldLabel = ({ children, style }) => (
    <Text style={[ms.fieldLabel, style]}>{children}</Text>
);

/* ── Styles ── */
const ms = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, maxHeight: '93%', overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sp.md, paddingVertical: 18, paddingTop: 22 },
    headerTitle: { fontSize: fz.md, fontWeight: '900', color: C.white, flex: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

    tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingHorizontal: sp.md, backgroundColor: C.card },
    tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: C.indigo },
    tabText: { fontSize: fz.sm, fontWeight: '700', color: C.muted },
    tabTextActive: { color: C.indigo },

    body: { padding: sp.md, paddingBottom: 40 },

    row: { flexDirection: 'row', gap: sp.sm, marginBottom: 0 },
    half: { flex: 1 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: sp.sm },
    input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: fz.sm, color: C.text, fontWeight: '600', marginBottom: sp.sm, justifyContent: 'center', minHeight: 44 },
    inputFull: { marginBottom: sp.sm },
    pickerText: { fontSize: fz.sm, color: C.text, fontWeight: '700' },
    pickerPlaceholder: { color: C.muted, fontWeight: '400' },

    roleBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, padding: 14, marginBottom: sp.sm },
    roleItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '42%' },
    checkbox: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
    checkboxOn: { backgroundColor: C.indigo, borderColor: C.indigo },
    roleText: { fontSize: fz.xs, fontWeight: '600', color: C.text },
    defaultBadge: { backgroundColor: C.indigoLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: r.full },
    defaultBadgeText: { fontSize: 9, fontWeight: '800', color: C.indigo },

    controlsHint: { fontSize: fz.xs, color: C.muted, fontWeight: '600', marginBottom: sp.md },
    controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    controlLabel: { fontSize: fz.sm, fontWeight: '700', color: C.text },

    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, height: 52, borderRadius: r.md, marginTop: 16 },
    saveBtnText: { fontSize: fz.md, fontWeight: '800', color: C.white },

    pickerSheet: { backgroundColor: C.card, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, maxHeight: '75%' },
    pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginVertical: 12 },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.md, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    pickerTitle: { fontSize: fz.md, fontWeight: '900', color: C.text },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: sp.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: r.md, paddingHorizontal: 12, height: 40 },
    searchInput: { flex: 1, fontSize: fz.sm, color: C.text, padding: 0 },
    optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: sp.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    optRowActive: { backgroundColor: C.indigoLight },
    optText: { fontSize: fz.sm, fontWeight: '600', color: C.text },
});

export default EditUserModal;
