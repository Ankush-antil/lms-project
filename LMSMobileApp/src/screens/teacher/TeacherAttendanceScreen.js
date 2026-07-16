import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator, Image, TextInput, Alert, ScrollView, Platform, StatusBar, Linking, Modal, Switch
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { TimePickerModal } from '../../components/common/TimePickerModal';

const TeacherAttendanceScreen = ({ navigation }) => {
    // Active session state
    const [activeSession, setActiveSession] = useState(null);
    const [activeSessions, setActiveSessions] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [timeLeft, setTimeLeft] = useState('');

    // Auto QR Schedule states
    const [autoModalVisible, setAutoModalVisible] = useState(false);
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [autoScheduleTime, setAutoScheduleTime] = useState('--:--');
    const [autoWifiSSID, setAutoWifiSSID] = useState('');
    const [autoLocationRequired, setAutoLocationRequired] = useState(false);
    const [autoTimePickerVisible, setAutoTimePickerVisible] = useState(false);

    const fetchAndOpenAutoQRModal = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/attendance/auto-config');
            setAutoEnabled(data.enabled || false);
            setAutoScheduleTime(data.scheduleTime || '--:--');
            setAutoWifiSSID(data.wifiSSID || '');
            setAutoLocationRequired(!!data.locationRequired);
            setAutoModalVisible(true);
        } catch (error) {
            console.error("Error fetching auto QR config:", error);
            Alert.alert("Error", "Failed to fetch auto QR schedule configuration.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAutoQRConfig = async () => {
        if (autoEnabled && (autoScheduleTime === '--:--' || !autoScheduleTime)) {
            Alert.alert("Error", "Please select a valid generation time.");
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                enabled: autoEnabled,
                scheduleTime: autoScheduleTime,
                wifiSSID: autoWifiSSID.trim() || null,
                locationRequired: autoLocationRequired,
                course: selectedCourse || null,
                subject: selectedSubject || 'Daily Attendance',
                section: section || 'ALL',
                duration: parseInt(duration, 10) || 60
            };
            
            await axios.post('/attendance/auto-config', body);
            Alert.alert("Success", "Auto QR Schedule saved successfully.");
            setAutoModalVisible(false);
        } catch (error) {
            console.error("Error saving auto QR config:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to save auto QR schedule configuration.");
        } finally {
            setSubmitting(false);
        }
    };

    // Form inputs
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [section, setSection] = useState('A');
    const [duration, setDuration] = useState('60');
    const [wifiSSID, setWifiSSID] = useState('');
    const [customWifiSSID, setCustomWifiSSID] = useState('');
    const [wifiNetworks, setWifiNetworks] = useState([]);
    const [teacherProfile, setTeacherProfile] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [enforceWifi, setEnforceWifi] = useState(false);
    const [attendanceType, setAttendanceType] = useState('in');

    const pollingIntervalRef = useRef(null);

    // Helper to open system Wi-Fi Connectivity Panel
    const openWifiSettings = async () => {
        try {
            if (Platform.OS === 'android') {
                try {
                    await Linking.sendIntent('android.settings.panel.action.WIFI');
                } catch (e) {
                    await Linking.sendIntent('android.settings.WIFI_SETTINGS');
                }
            } else {
                await Linking.openURL('App-Prefs:root=WIFI').catch(() => {
                    Linking.openSettings();
                });
            }
        } catch (error) {
            console.error("Error opening Wi-Fi settings:", error);
            Alert.alert("Error", "Could not open Wi-Fi settings automatically.");
        }
    };

    // Helper to get connected Wi-Fi SSID
    const getConnectedWifiSSID = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Location permission denied for reading Wi-Fi SSID');
                return null;
            }
            let enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                console.warn('Location services disabled');
                return null;
            }
            const state = await NetInfo.fetch();
            if (state.type === 'wifi') {
                return state.details.ssid || null;
            }
            return null;
        } catch (e) {
            console.error("Error reading Wi-Fi SSID:", e);
            return null;
        }
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            
            // 1. Check for active sessions
            const { data: activeRes } = await axios.get('/attendance/session/active');
            if (activeRes && activeRes.length > 0) {
                setActiveSessions(activeRes);
                setActiveSession(activeRes[0]);
                fetchSessionRecords(activeRes[0]._id);
            } else {
                setActiveSessions([]);
            }
            
            // 2. Fetch courses
            const { data: coursesRes } = await axios.get('/setup/courses');
            setCourses(coursesRes || []);

            // 3. Fetch user profile for Wi-Fi SSID lists and courses/subjects
            try {
                const { data: profileRes } = await axios.get('/users/profile');
                setTeacherProfile(profileRes);
                
                let networks = [];
                
                // Detect active Wi-Fi SSID on phone
                const activeSSID = await getConnectedWifiSSID();
                const isValidSSID = activeSSID && activeSSID !== '<unknown ssid>';
                
                if (isValidSSID) {
                    networks = [activeSSID];
                    setWifiSSID(activeSSID);
                } else {
                    setWifiSSID('custom');
                }
                setWifiNetworks(networks);
            } catch (err) {
                console.error("Error setting up wifi network list:", err);
                setWifiSSID('custom');
            }
            
            setLoading(false);
        } catch (error) {
            console.error("Fetch initial data error:", error);
            setLoading(false);
        }
    };

    const teacherCourses = teacherProfile?.teacherProfile?.assignedCourses && teacherProfile.teacherProfile.assignedCourses.length > 0
        ? teacherProfile.teacherProfile.assignedCourses
        : courses;

    const availableSubjects = (() => {
        if (teacherProfile?.teacherProfile?.subjects && teacherProfile.teacherProfile.subjects.length > 0) {
            return teacherProfile.teacherProfile.subjects;
        }
        if (selectedCourse) {
            const course = courses.find(c => c._id === selectedCourse);
            if (course && course.subjects) {
                return course.subjects;
            }
        }
        return [];
    })();

    // Auto-select course on load
    useEffect(() => {
        if (teacherCourses && teacherCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(teacherCourses[0]._id);
        }
    }, [teacherCourses, selectedCourse]);

    // Sync selectedSubject when availableSubjects change
    useEffect(() => {
        if (availableSubjects.length > 0) {
            if (!availableSubjects.includes(selectedSubject)) {
                setSelectedSubject(availableSubjects[0]);
            }
        } else if (!teacherProfile?.teacherProfile?.subjects?.length) {
            setSelectedSubject('');
        }
    }, [availableSubjects, selectedSubject, teacherProfile]);

    useEffect(() => {
        fetchInitialData();

        // Listen for Wi-Fi connection updates dynamically in real-time
        const unsubscribe = NetInfo.addEventListener(async (state) => {
            if (state.type === 'wifi') {
                const activeSSID = state.details.ssid;
                const isValidSSID = activeSSID && activeSSID !== '<unknown ssid>';
                
                if (isValidSSID) {
                    setWifiNetworks([activeSSID]);
                    setWifiSSID(activeSSID);
                } else {
                    setWifiNetworks([]);
                    setWifiSSID('custom');
                }
            } else {
                setWifiNetworks([]);
                setWifiSSID('custom');
            }
        });

        return () => {
            unsubscribe();
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    // Polling & Timer
    useEffect(() => {
        if (activeSession) {
            pollingIntervalRef.current = setInterval(() => {
                fetchSessionRecords(activeSession._id);
            }, 4000);

            const updateTimer = () => {
                const now = new Date();
                const end = new Date(activeSession.endTime);
                const diff = end - now;
                if (diff <= 0) {
                    setTimeLeft('Expired');
                    setActiveSession(null);
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                } else {
                    const mins = Math.floor(diff / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
                }
            };

            updateTimer();
            const timerInterval = setInterval(updateTimer, 1000);

            return () => {
                clearInterval(timerInterval);
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            };
        }
    }, [activeSession]);

    const fetchSessionRecords = async (sessionId) => {
        try {
            const { data } = await axios.get(`/attendance/session/${sessionId}/records`);
            setRecords(data.records || []);
        } catch (error) {
            console.error("Fetch records error:", error);
        }
    };

    const handleCreateSession = async () => {
        if (enforceWifi) {
            if (!wifiSSID) {
                Alert.alert("Error", "Please select a Wi-Fi network or enter custom SSID.");
                return;
            }
            if (wifiSSID === 'custom' && !customWifiSSID.trim()) {
                Alert.alert("Error", "Please enter a custom Wi-Fi network name.");
                return;
            }
        }

        setSubmitting(true);
        try {
            // Get teacher's coordinates
            let lat = null;
            let lon = null;
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let enabled = await Location.hasServicesEnabledAsync();
                    if (enabled) {
                        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (pos) {
                            lat = pos.coords.latitude;
                            lon = pos.coords.longitude;
                        }
                    }
                }
            } catch (e) {
                console.error("Error reading geolocation:", e);
            }

            const { data } = await axios.post('/attendance/session', {
                wifiSSID: enforceWifi ? (wifiSSID === 'custom' ? customWifiSSID.trim() : wifiSSID) : null,
                latitude: lat,
                longitude: lon,
                type: attendanceType
            });
            setActiveSession(data);
            setActiveSessions(prev => [...prev, data]);
            fetchSessionRecords(data._id);
        } catch (error) {
            console.error("Create session error:", error);
            const errMsg = error.response?.data?.message || "Failed to start session.";
            Alert.alert("Error", errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEndSession = async () => {
        Alert.alert(
            "End Session",
            "Are you sure you want to end this attendance session?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End Session",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.post(`/attendance/session/${activeSession._id}/end`);
                            setActiveSessions(prev => prev.filter(s => s._id !== activeSession._id));
                            setActiveSession(null);
                            setRecords([]);
                            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        } catch (error) {
                            Alert.alert("Error", "Failed to end session.");
                        }
                    }
                }
            ]
        );
    };

    const handleManualMark = async (studentId, status) => {
        try {
            await axios.post(`/attendance/session/${activeSession._id}/manual`, {
                studentId,
                status
            });
            fetchSessionRecords(activeSession._id);
        } catch (error) {
            console.error("Manual mark error:", error);
            Alert.alert("Error", "Failed to manually mark attendance.");
        }
    };

    const filteredRecords = records.filter(r => 
        r.student.name.toLowerCase().includes(search.toLowerCase())
    );

    const checkedInCount = records.filter(r => r.record?.status === 'In').length;
    const presentCount = records.filter(r => r.record?.status === 'Present').length;

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
                <Text style={styles.headerTitle}>QR Attendance</Text>
                <TouchableOpacity onPress={() => navigation.navigate('TeacherSnapshots')} style={styles.historyHeaderBtn}>
                    <Ionicons name="time-outline" size={22} color={colors.white} />
                </TouchableOpacity>
            </View>

            {!activeSession ? (
                /* Session Creation Form */
                <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.welcomeBrief}>
                        <Ionicons name="qr-code-outline" size={48} color={colors.primary} />
                        <Text style={styles.welcomeTitle}>Take Class Attendance</Text>
                        <Text style={styles.welcomeSubtitle}>Generate a temporary QR Code. Students scan it & snap a selfie to mark present.</Text>
                    </View>

                    {/* Attendance Type Selector */}
                    <Text style={styles.label}>Attendance Type</Text>
                    <View style={styles.durationRow}>
                        {[
                            { label: 'Mark In (Check-in)', value: 'in' },
                            { label: 'Mark Out (Check-out)', value: 'out' }
                        ].map(t => (
                            <TouchableOpacity
                                key={t.value}
                                style={[styles.durationPill, attendanceType === t.value && styles.selectedDurationPill]}
                                onPress={() => setAttendanceType(t.value)}
                            >
                                <Text style={[styles.durationText, attendanceType === t.value && styles.selectedDurationText]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Wi-Fi Verification Switch */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>Restrict to Classroom Wi-Fi</Text>
                        <Switch
                            value={enforceWifi}
                            onValueChange={setEnforceWifi}
                            trackColor={{ false: '#d1d5db', true: colors.primary }}
                            thumbColor={Platform.OS === 'android' ? (enforceWifi ? colors.primary : '#f4f3f4') : ''}
                        />
                    </View>

                    {enforceWifi && (
                        <>
                            {/* Wi-Fi Selector */}
                            <Text style={styles.label}>Classroom Wi-Fi Network</Text>
                            {wifiNetworks.length > 0 ? (
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                    {/* Connected Wi-Fi Pill (Selected by default) */}
                                    <TouchableOpacity
                                        style={[styles.coursePill, wifiSSID === wifiNetworks[0] && styles.selectedCoursePill, { marginLeft: 0 }]}
                                        onPress={() => setWifiSSID(wifiNetworks[0])}
                                    >
                                        <Text style={[styles.coursePillText, wifiSSID === wifiNetworks[0] && styles.selectedCoursePillText]}>
                                            {wifiNetworks[0]}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Change Wi-Fi Button */}
                                    <TouchableOpacity
                                        style={[styles.coursePill, { borderColor: colors.primary }]}
                                        onPress={openWifiSettings}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="settings-outline" size={14} color={colors.primary} />
                                            <Text style={[styles.coursePillText, { color: colors.primary, fontWeight: '700' }]}>
                                                Change Wi-Fi
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ marginBottom: 12 }}>
                                    <TouchableOpacity
                                        style={styles.wifiSetupBtn}
                                        onPress={openWifiSettings}
                                    >
                                        <Ionicons name="wifi-outline" size={18} color={colors.primary} />
                                        <Text style={styles.wifiSetupBtnText}>Enable or Connect to Wi-Fi</Text>
                                    </TouchableOpacity>

                                    {/* Fallback TextInput for manual entry if not connected */}
                                    <Text style={[styles.label, { marginTop: spacing.sm }]}>Or Enter Manually</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter exact Wi-Fi network SSID"
                                        placeholderTextColor={colors.textMuted}
                                        value={customWifiSSID}
                                        onChangeText={(val) => {
                                            setCustomWifiSSID(val);
                                            setWifiSSID('custom');
                                        }}
                                    />
                                </View>
                            )}

                            {wifiSSID === 'custom' && (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter exact Wi-Fi network SSID"
                                    placeholderTextColor={colors.textMuted}
                                    value={customWifiSSID}
                                    onChangeText={setCustomWifiSSID}
                                />
                            )}
                        </>
                    )}

                    {(() => {
                        const existingSession = activeSessions.length > 0 ? activeSessions[0] : null;
                        if (existingSession) {
                            return (
                                <TouchableOpacity 
                                    style={[styles.btnStart, { backgroundColor: colors.success }]} 
                                    onPress={() => {
                                        setActiveSession(existingSession);
                                        fetchSessionRecords(existingSession._id);
                                    }}
                                >
                                    <Ionicons name="qr-code-outline" size={20} color={colors.white} />
                                    <Text style={styles.btnStartText}>Back to Active QR</Text>
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <TouchableOpacity 
                                style={styles.btnStart} 
                                onPress={handleCreateSession}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <>
                                        <Ionicons name="play-circle-outline" size={20} color={colors.white} />
                                        <Text style={styles.btnStartText}>Start QR Session</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        );
                    })()}

                    <TouchableOpacity 
                        style={[styles.btnStart, { backgroundColor: '#3b82f6', marginTop: 10 }]} 
                        onPress={fetchAndOpenAutoQRModal}
                    >
                        <Ionicons name="time-outline" size={20} color={colors.white} />
                        <Text style={styles.btnStartText}>Schedule Automatic QRs</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                /* Live Attendance QR Screen */
                <View style={{ flex: 1 }}>
                    <View style={styles.sessionHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sessionSubject}>{activeSession.subject}</Text>
                            <Text style={styles.sessionSection}>Section {activeSession.section}</Text>
                        </View>
                        <View style={[styles.timerBadge, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
                            <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                            <Text style={[styles.timerText, { color: colors.success }]}>Active</Text>
                        </View>
                    </View>

                    {/* QR Display Card */}
                    <View style={styles.qrCard}>
                        <Image
                            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${activeSession.qrToken}` }}
                            style={styles.qrImage}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
                            <TouchableOpacity 
                                style={[styles.btnEnd, { flex: 1, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border }]} 
                                onPress={() => setActiveSession(null)}>
                                <Text style={[styles.btnEndText, { color: colors.text }]}>Hide / New QR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnEnd, { flex: 1, marginTop: 0 }]} onPress={handleEndSession}>
                                <Text style={styles.btnEndText}>Close QR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsBar}>
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>{presentCount}</Text>
                            <Text style={styles.statTitle}>Present (Out)</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statVal, { color: colors.warning }]}>{checkedInCount}</Text>
                            <Text style={styles.statTitle}>Checked-In (In)</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statVal, { color: colors.textMuted }]}>
                                {Math.max(0, records.length - presentCount - checkedInCount)}
                            </Text>
                            <Text style={styles.statTitle}>Absent</Text>
                        </View>
                    </View>

                    {/* Students List */}
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Live Attendance Feed</Text>
                        <TextInput
                            style={styles.listSearch}
                            placeholder="Search..."
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    <FlatList
                        data={filteredRecords}
                        keyExtractor={item => item.student._id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={12}
                        maxToRenderPerBatch={12}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        renderItem={({ item }) => {
                            const status = item.record?.status || 'Absent';
                            let badgeStyle = styles.badgeAbsent;
                            let badgeText = 'Absent';
                            if (status === 'Present') { badgeStyle = styles.badgePresent; badgeText = 'Present'; }
                            else if (status === 'In') { badgeStyle = styles.badgeIn; badgeText = 'Checked-In'; }

                            return (
                                <View style={styles.studentCard}>
                                    <View style={styles.studentDetails}>
                                        <View style={styles.studentAvatar}>
                                            <Text style={styles.avatarText}>{item.student.name?.[0]}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.studentName}>{item.student.name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <View style={[styles.statusBadge, badgeStyle]}>
                                                    <Text style={styles.badgeLabel}>{badgeText}</Text>
                                                </View>
                                                {/* If they have a selfie photo, show a small eye/camera button */}
                                                {(item.record?.checkInPhoto || item.record?.checkOutPhoto) && (
                                                    <TouchableOpacity
                                                        style={styles.photoViewBtn}
                                                        onPress={() => setSelectedPhoto({
                                                            studentName: item.student.name,
                                                            checkInPhoto: item.record.checkInPhoto ? `${BASE_URL}${item.record.checkInPhoto}` : null,
                                                            checkOutPhoto: item.record.checkOutPhoto ? `${BASE_URL}${item.record.checkOutPhoto}` : null,
                                                        })}
                                                    >
                                                        <Ionicons name="image-outline" size={11} color={colors.primary} />
                                                        <Text style={styles.photoViewBtnText}>Selfie</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, status === 'Present' && styles.actionBtnActivePresent]}
                                            onPress={() => handleManualMark(item.student._id, 'Present')}
                                        >
                                            <Ionicons name="checkmark" size={16} color={status === 'Present' ? colors.white : '#10b981'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, status === 'In' && styles.actionBtnActiveIn]}
                                            onPress={() => handleManualMark(item.student._id, 'In')}
                                        >
                                            <Ionicons name="time" size={16} color={status === 'In' ? colors.white : '#f59e0b'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, status === 'Absent' && styles.actionBtnActiveAbsent]}
                                            onPress={() => handleManualMark(item.student._id, 'Absent')}
                                        >
                                            <Ionicons name="close" size={16} color={status === 'Absent' ? colors.white : colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                    />
                </View>
            )}

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
                            <Text style={styles.modalTitle}>{selectedPhoto?.studentName}'s Selfie</Text>
                            <TouchableOpacity onPress={() => setSelectedPhoto(null)} style={styles.modalCloseBtn}>
                                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                            {selectedPhoto?.checkInPhoto && (
                                <View style={styles.photoContainer}>
                                    <Text style={styles.photoTimeLabel}>Check-In Selfie</Text>
                                    <Image
                                        source={{ uri: selectedPhoto.checkInPhoto }}
                                        style={styles.selfiePreviewImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}
                            
                            {selectedPhoto?.checkOutPhoto && (
                                <View style={[styles.photoContainer, { marginTop: spacing.md }]}>
                                    <Text style={styles.photoTimeLabel}>Check-Out Selfie</Text>
                                    <Image
                                        source={{ uri: selectedPhoto.checkOutPhoto }}
                                        style={styles.selfiePreviewImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Schedule Automatic QRs Modal */}
            <Modal
                visible={autoModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setAutoModalVisible(false)}
            >
                <View style={styles.autoModalOverlay}>
                    <View style={styles.autoModalContent}>
                        <View style={styles.autoModalHeader}>
                            <Text style={styles.autoModalTitle}>Schedule Automatic QRs</Text>
                            <Text style={styles.autoModalSub}>QRs will be generated automatically daily</Text>
                            <TouchableOpacity onPress={() => setAutoModalVisible(false)} style={styles.autoCloseBtn}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView contentContainerStyle={styles.autoModalBody} keyboardShouldPersistTaps="handled">
                            {/* Enable Automatic Scheduling Card */}
                            <TouchableOpacity 
                                style={styles.checkboxCard} 
                                activeOpacity={0.8}
                                onPress={() => setAutoEnabled(!autoEnabled)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.checkboxCardTitle}>Enable Automatic Scheduling</Text>
                                    <Text style={styles.checkboxCardSub}>Run background cron job daily</Text>
                                </View>
                                <Ionicons 
                                    name={autoEnabled ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={autoEnabled ? colors.primary : colors.textMuted} 
                                />
                            </TouchableOpacity>

                            {/* QR Generation Time Section */}
                            <Text style={styles.autoFieldLabel}>QR Generation Time</Text>
                            <TouchableOpacity 
                                style={styles.timeSelectorField}
                                activeOpacity={0.7}
                                onPress={() => setAutoTimePickerVisible(true)}
                            >
                                <Text style={[styles.timeSelectorFieldText, autoScheduleTime !== '--:--' && { color: colors.text }]}>
                                    {autoScheduleTime}
                                </Text>
                                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            {/* Wi-Fi Enforce Section */}
                            <Text style={styles.autoFieldLabel}>Wi-Fi Enforce (Optional)</Text>
                            <TextInput
                                style={styles.autoTextInput}
                                value={autoWifiSSID}
                                onChangeText={setAutoWifiSSID}
                                placeholder="SSID Name"
                                placeholderTextColor="#94a3b8"
                            />

                            {/* Enforce GPS Location Card */}
                            <TouchableOpacity 
                                style={styles.checkboxCard} 
                                activeOpacity={0.8}
                                onPress={() => setAutoLocationRequired(!autoLocationRequired)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.checkboxCardTitle}>Enforce GPS Location</Text>
                                </View>
                                <Ionicons 
                                    name={autoLocationRequired ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={autoLocationRequired ? colors.primary : colors.textMuted} 
                                />
                            </TouchableOpacity>

                            {/* Save Button */}
                            <TouchableOpacity 
                                style={styles.autoSaveBtn} 
                                onPress={handleSaveAutoQRConfig}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="checkmark-done" size={20} color={colors.white} style={{ marginRight: 6 }} />
                                <Text style={styles.autoSaveBtnText}>Save Schedule</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Time Picker Modal for Auto Schedule */}
            <TimePickerModal
                visible={autoTimePickerVisible}
                value={autoScheduleTime === '--:--' ? '' : autoScheduleTime}
                onChange={val => {
                    if (val) setAutoScheduleTime(val);
                }}
                onClose={() => setAutoTimePickerVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    autoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    autoModalContent: {
        width: '90%',
        maxHeight: '85%',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
        position: 'relative',
    },
    autoModalHeader: {
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingBottom: spacing.sm,
        marginBottom: spacing.md,
    },
    autoModalTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '900',
        color: colors.text,
        textAlign: 'center',
    },
    autoModalSub: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 4,
        fontWeight: '600',
        textAlign: 'center',
    },
    autoCloseBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 4,
    },
    autoModalBody: {
        gap: spacing.md,
    },
    checkboxCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    checkboxCardTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.text,
    },
    checkboxCardSub: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 2,
        fontWeight: '600',
    },
    autoFieldLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: -6,
    },
    timeSelectorField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 50,
    },
    timeSelectorFieldText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.textMuted,
    },
    autoTextInput: {
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 50,
        fontSize: fontSizes.md,
        color: colors.text,
        fontWeight: '600',
    },
    autoSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        borderRadius: borderRadius.md,
        height: 50,
        marginTop: spacing.md,
    },
    autoSaveBtnText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '900',
    },
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
    historyHeaderBtn: { padding: 4 },
    
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

    formContainer: { padding: spacing.md, paddingBottom: 40 },
    welcomeBrief: { alignItems: 'center', marginVertical: spacing.lg, textAlign: 'center' },
    welcomeTitle: { fontSize: fontSizes.xl, fontWeight: '850', color: colors.text, marginTop: spacing.sm },
    welcomeSubtitle: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: spacing.md, lineHeight: 18 },

    label: { fontSize: fontSizes.xs, fontWeight: '750', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
        fontSize: fontSizes.md,
        color: colors.text,
    },
    pickerContainer: { marginVertical: spacing.xs },
    coursePill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
        marginHorizontal: 4,
    },
    selectedCoursePill: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    coursePillText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary },
    selectedCoursePillText: { color: colors.white },
    
    wifiSetupBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        height: 48,
        paddingHorizontal: spacing.md,
    },
    wifiSetupBtnText: {
        color: colors.primary,
        fontWeight: '750',
        fontSize: fontSizes.xs,
        textTransform: 'uppercase',
    },

    durationRow: { flexDirection: 'row', gap: 8, marginVertical: spacing.xs },
    durationPill: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
    },
    selectedDurationPill: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    durationText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary },
    selectedDurationText: { color: colors.white },

    btnStart: {
        backgroundColor: colors.primary,
        height: 52,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: spacing.xl,
    },
    btnStartText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },

    // Live QR View styles
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    sessionSubject: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    sessionSection: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fee2e2',
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    timerText: { fontSize: fontSizes.xs, fontWeight: '750', color: colors.danger, fontFamily: 'monospace' },
    
    qrCard: {
        backgroundColor: colors.white,
        padding: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    qrImage: { width: 180, height: 180, resizeMode: 'contain', marginVertical: spacing.sm },
    btnEnd: {
        backgroundColor: colors.text,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.full,
        marginTop: spacing.sm,
    },
    btnEndText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },

    statsBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: fontSizes.lg, fontWeight: '850', color: '#10b981' },
    statTitle: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.bg,
    },
    listTitle: { fontSize: fontSizes.sm, fontWeight: '750', color: colors.textSecondary },
    listSearch: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        width: 130,
        height: 28,
        fontSize: fontSizes.xs,
        color: colors.text,
    },
    list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
    studentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    studentDetails: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    studentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textSecondary },
    studentName: { fontSize: fontSizes.sm, fontWeight: '750', color: colors.text },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        marginTop: 2,
    },
    badgePresent: { backgroundColor: '#d1fae5' },
    badgeIn: { backgroundColor: '#fef3c7' },
    badgeAbsent: { backgroundColor: '#fee2e2' },
    badgeLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: colors.textSecondary },

    actionsRow: { flexDirection: 'row', gap: 6 },
    actionBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnActivePresent: { backgroundColor: '#10b981', borderColor: '#10b981' },
    actionBtnActiveIn: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    actionBtnActiveAbsent: { backgroundColor: colors.danger, borderColor: colors.danger },

    // Selfie Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    photoModalContent: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        width: '90%',
        maxHeight: '80%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
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
    modalCloseBtn: {
        padding: 4,
    },
    modalScrollContent: {
        padding: spacing.md,
        alignItems: 'center',
    },
    photoContainer: {
        width: '100%',
        alignItems: 'center',
    },
    photoTimeLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    selfiePreviewImage: {
        width: 240,
        height: 240,
        borderRadius: borderRadius.md,
        backgroundColor: '#e2e8f0',
    },
    photoViewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#eef2ff',
        borderWidth: 1,
        borderColor: '#c7d2fe',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: borderRadius.full,
    },
    photoViewBtnText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
    },
});

export default TeacherAttendanceScreen;
