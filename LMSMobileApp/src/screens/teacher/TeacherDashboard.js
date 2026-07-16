import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AppHeader, StatCard, SectionCard, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ProfileBottomSheet from '../../components/common/ProfileBottomSheet';

const TeacherDashboard = ({ navigation }) => {
    const { user, logout, savedAccounts, switchAccount } = useAuth();
    const lastTapRef = React.useRef(0);
    const tapTimeoutRef = React.useRef(null);
    const scrollRef = React.useRef(null);
    const [profile, setProfile] = useState(null);
    const [activities, setActivities] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [switcherVisible, setSwitcherVisible] = useState(false);

    // Call and Chat States
    const [activeContact, setActiveContact] = useState(null);
    const [contactType, setContactType] = useState(null); // 'chat' | 'audio' | 'videocam' | null
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [callState, setCallState] = useState('ringing'); // 'ringing' | 'connected'
    const [callTimer, setCallTimer] = useState(0);

    // Call connected timer
    useEffect(() => {
        let interval;
        if (contactType && (contactType === 'audio' || contactType === 'videocam') && callState === 'connected') {
            interval = setInterval(() => {
                setCallTimer(prev => prev + 1);
            }, 1000);
        } else {
            setCallTimer(0);
        }
        return () => clearInterval(interval);
    }, [contactType, callState]);

    // Ringing state timer (auto connects in 2 seconds)
    useEffect(() => {
        let timeout;
        if (contactType && (contactType === 'audio' || contactType === 'videocam') && callState === 'ringing') {
            timeout = setTimeout(() => {
                setCallState('connected');
            }, 2000);
        }
        return () => clearTimeout(timeout);
    }, [contactType, callState]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSendMsg = () => {
        if (!chatInput.trim()) return;
        const newMsg = {
            id: Date.now().toString(),
            sender: 'Teacher',
            text: chatInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, newMsg]);
        const typed = chatInput;
        setChatInput('');

        setTimeout(() => {
            let replyText = "Yes sir, I am working on the assignments.";
            if (typed.toLowerCase().includes('hello') || typed.toLowerCase().includes('hi')) {
                replyText = "Hello Sir! How can I help you today?";
            } else if (typed.toLowerCase().includes('test') || typed.toLowerCase().includes('exam')) {
                replyText = "Sir, I have prepared for the test. When is the deadline?";
            } else if (typed.toLowerCase().includes('call')) {
                replyText = "Sure sir, you can call me anytime.";
            }

            setChatMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'Student',
                text: replyText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 1500);
    };

    const handleQuickSwitch = async () => {
        if (savedAccounts && savedAccounts.length > 1) {
            const currentIndex = savedAccounts.findIndex(acc => acc.user?.email === user?.email);
            const nextIndex = (currentIndex + 1) % savedAccounts.length;
            const nextAcc = savedAccounts[nextIndex];
            if (nextAcc) {
                await switchAccount(nextAcc.token, nextAcc.user);
            }
        } else {
            Alert.alert('No other saved accounts', 'Please login to another account first to use quick switch.');
        }
    };

    const handleProfilePress = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
            handleQuickSwitch();
        } else {
            lastTapRef.current = now;
            tapTimeoutRef.current = setTimeout(() => {
                navigation.navigate('Profile');
            }, DOUBLE_PRESS_DELAY);
        }
    };

    const fetchData = async () => {
        try {
            const [profileRes, studentsRes] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/users/teacher-students').catch(() => ({ data: [] })),
            ]);
            setProfile(profileRes.data);
            setStudents(studentsRes.data);
        } catch (e) {
            console.warn('Fetch teacher stats error:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <LoadingScreen />;

    const firstName = profile?.name?.split(' ')[0] || 'Teacher';

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Teacher Dashboard" 
                rightIcon="person-circle-outline" 
                rightAction={handleProfilePress} 
                rightLongAction={() => setSwitcherVisible(true)} 
            />
            
            {/* Quick Actions top tab bar (Facebook style) */}
            <View style={styles.topTabBar}>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                    activeOpacity={0.7}
                >
                    <Ionicons name="home-outline" size={20} color="#3b82f6" />
                    <Text style={styles.tabLabel}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('TeacherSnapshots')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={20} color="#ef4444" />
                    <Text style={styles.tabLabel}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabBtn}
                    onPress={() => navigation.navigate('TeacherActivities')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="clipboard-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.tabLabel}>Activities</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.teacher} />}
            >
                {/* Stats */}
                <View style={styles.statsRow}>
                    <StatCard
                        title="My Students"
                        value={students.length}
                        icon="people"
                        color={colors.teacher}
                        bg="#ecfdf5"
                    />
                    <StatCard
                        title="Activities"
                        value="–"
                        icon="clipboard"
                        color={colors.accent}
                        bg="#eef2ff"
                    />
                </View>

                {/* Quick Actions moved to sticky top tab bar */}

                {/* My Students */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>My Students ({students.length})</Text>
                    {students.length > 0 ? students.slice(0, 5).map(student => (
                        <TouchableOpacity 
                            key={student._id} 
                            style={styles.studentItem}
                            onPress={() => navigation.navigate('ContactStudents')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.studentAvatar, { backgroundColor: colors.teacher }]}>
                                <Text style={styles.studentAvatarText}>{student.name?.[0]}</Text>
                            </View>
                            <View style={styles.studentInfo}>
                                <Text style={styles.studentName}>{student.name}</Text>
                                <Text style={styles.studentEmail}>{student.email}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginRight: 4 }} />
                        </TouchableOpacity>
                    )) : (
                        <EmptyState icon="people-outline" title="No students assigned" />
                    )}
                </SectionCard>

            </ScrollView>

            {/* Calling Modal (Audio/Video) */}
            <Modal
                visible={contactType === 'audio' || contactType === 'videocam'}
                animationType="slide"
                transparent={false}
                onRequestClose={() => {
                    setContactType(null);
                    setCallState('ringing');
                }}
            >
                <View style={styles.callContainer}>
                    {contactType === 'videocam' && callState === 'connected' ? (
                        <View style={styles.videoGrid}>
                            <View style={styles.remoteVideo}>
                                <View style={styles.videoAvatarContainer}>
                                    <View style={[styles.largeAvatar, { backgroundColor: colors.teacher }]}>
                                        <Text style={styles.largeAvatarText}>{activeContact?.name?.[0]}</Text>
                                    </View>
                                    <Text style={styles.videoNameText}>{activeContact?.name}</Text>
                                    <Text style={styles.videoStatusText}>Video Streaming...</Text>
                                </View>
                            </View>
                            <View style={styles.localVideoFloating}>
                                <View style={styles.pipAvatar}>
                                    <Text style={styles.pipAvatarText}>{profile?.name?.[0]}</Text>
                                </View>
                                <Text style={styles.pipLabel}>You</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.audioCallContent}>
                            <View style={[styles.ringingAvatarContainer, callState === 'ringing' && styles.ringingPulsate]}>
                                <View style={[styles.hugeAvatar, { backgroundColor: colors.teacher }]}>
                                    <Text style={styles.hugeAvatarText}>{activeContact?.name?.[0]}</Text>
                                </View>
                            </View>
                            <Text style={styles.callName}>{activeContact?.name}</Text>
                            <Text style={styles.callStateText}>
                                {callState === 'ringing' 
                                    ? `Ringing (${contactType === 'audio' ? 'Audio' : 'Video'})...` 
                                    : `Active Call (${contactType === 'audio' ? 'Audio' : 'Video'})`}
                            </Text>
                        </View>
                    )}

                    <View style={styles.callControlsContainer}>
                        {callState === 'connected' && (
                            <Text style={styles.timerText}>{formatTime(callTimer)}</Text>
                        )}
                        <View style={styles.controlButtonsRow}>
                            <TouchableOpacity style={styles.iconControlCircle} activeOpacity={0.7}>
                                <Ionicons name="mic-off-outline" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.iconControlCircle, { backgroundColor: colors.danger }]}
                                onPress={() => {
                                    setContactType(null);
                                    setCallState('ringing');
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={28} color={colors.white} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconControlCircle} activeOpacity={0.7}>
                                <Ionicons name="volume-high-outline" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Chat Modal */}
            <Modal
                visible={contactType === 'chat'}
                animationType="slide"
                transparent
                onRequestClose={() => {
                    setContactType(null);
                    setChatMessages([]);
                }}
            >
                <KeyboardAvoidingView 
                    style={styles.chatOverlay} 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.chatSheet}>
                        <View style={styles.chatHeader}>
                            <View style={styles.chatHeaderLeft}>
                                <View style={[styles.chatAvatar, { backgroundColor: colors.teacher }]}>
                                    <Text style={styles.chatAvatarText}>{activeContact?.name?.[0]}</Text>
                                </View>
                                <View>
                                    <Text style={styles.chatHeaderTitle}>{activeContact?.name}</Text>
                                    <Text style={styles.chatHeaderStatus}>Online</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                onPress={() => {
                                    setContactType(null);
                                    setChatMessages([]);
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.chatMessagesContainer}
                            contentContainerStyle={styles.chatMessagesContent}
                            ref={ref => ref?.scrollToEnd({ animated: true })}
                        >
                            {chatMessages.length === 0 ? (
                                <View style={styles.emptyChatContainer}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
                                    <Text style={styles.emptyChatText}>No messages yet</Text>
                                    <Text style={styles.emptyChatSub}>Start a conversation with {activeContact?.name}</Text>
                                </View>
                            ) : (
                                chatMessages.map((msg) => {
                                    const isTeacher = msg.sender === 'Teacher';
                                    return (
                                        <View 
                                            key={msg.id} 
                                            style={[
                                                styles.msgWrapper, 
                                                isTeacher ? styles.msgWrapperTeacher : styles.msgWrapperStudent
                                            ]}
                                        >
                                            <View 
                                                style={[
                                                    styles.msgBubble, 
                                                    isTeacher ? styles.msgBubbleTeacher : styles.msgBubbleStudent
                                                ]}
                                            >
                                                <Text style={isTeacher ? styles.msgTextTeacher : styles.msgTextStudent}>
                                                    {msg.text}
                                                </Text>
                                            </View>
                                            <Text style={styles.msgTime}>{msg.time}</Text>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={styles.chatInputBar}>
                            <TextInput
                                style={styles.chatTextInput}
                                placeholder="Type a message..."
                                placeholderTextColor={colors.textMuted}
                                value={chatInput}
                                onChangeText={setChatInput}
                            />
                            <TouchableOpacity 
                                style={[styles.chatSendBtn, !chatInput.trim() && { opacity: 0.6 }]}
                                onPress={handleSendMsg}
                                disabled={!chatInput.trim()}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="send" size={16} color={colors.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Sticky Bottom Tab Bar (YouTube/Facebook Style) */}
            <View style={styles.bottomTabBar}>
                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('Drive')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cloud-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Drive</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('Notes')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Notes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('EvaluatePage')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="checkmark-done-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Evaluate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('StudentPracticeTools')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="construct-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Tools</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => navigation.navigate('ContactStudents')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubbles-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.bottomTabLabel}>Chat</Text>
                </TouchableOpacity>
            </View>
            <ProfileBottomSheet visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    bottomTabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderTopWidth: 1.5,
        borderTopColor: colors.borderLight,
        paddingVertical: 8,
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 60,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    bottomTabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    bottomTabLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
        marginTop: 2,
    },
    plusBtnCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -18,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    topTabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.borderLight,
        paddingVertical: 10,
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabLabel: {
        fontSize: fontSizes.xs - 3,
        fontWeight: '800',
        color: colors.textSecondary,
        marginTop: 4,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: 80 },
    welcomeBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    welcomeLeft: {},
    welcomeGreeting: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.text,
    },
    welcomeSub: { fontSize: fontSizes.sm, color: colors.textMuted },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionBtn: { alignItems: 'center', gap: spacing.xs },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    studentAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    studentAvatarText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.white },
    studentInfo: { flex: 1 },
    studentName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    studentEmail: { fontSize: fontSizes.xs, color: colors.textMuted },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    profileAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileAvatarText: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
    profileName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
    profileEmail: { fontSize: fontSizes.sm, color: colors.textMuted },
    profileMeta: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    metaItem: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
    },
    metaLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600' },
    metaValue: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginTop: 2 },
    contactActions: {
        flexDirection: 'row',
        gap: 6,
    },
    contactCircleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
    },
    // Calling Screen Styles
    callContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'space-between',
        paddingVertical: 50,
        alignItems: 'center',
    },
    audioCallContent: {
        alignItems: 'center',
        marginTop: 100,
        gap: 16,
    },
    ringingAvatarContainer: {
        width: 130,
        height: 130,
        borderRadius: 65,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    ringingPulsate: {
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    hugeAvatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hugeAvatarText: {
        fontSize: 48,
        fontWeight: '900',
        color: colors.white,
    },
    callName: {
        fontSize: fontSizes.xxl,
        fontWeight: '800',
        color: colors.white,
        marginTop: 10,
    },
    callStateText: {
        fontSize: fontSizes.sm,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
    },
    videoGrid: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    remoteVideo: {
        flex: 1,
        width: '100%',
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoAvatarContainer: {
        alignItems: 'center',
        gap: 8,
    },
    largeAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeAvatarText: {
        fontSize: 38,
        fontWeight: '950',
        color: colors.white,
    },
    videoNameText: {
        fontSize: fontSizes.xl,
        fontWeight: '800',
        color: colors.white,
    },
    videoStatusText: {
        fontSize: fontSizes.xs,
        color: '#10b981',
        fontWeight: '700',
    },
    localVideoFloating: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 100,
        height: 140,
        backgroundColor: '#334155',
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 4,
    },
    pipAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.teacher,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pipAvatarText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.white,
    },
    pipLabel: {
        fontSize: fontSizes.xs - 2,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '700',
    },
    callControlsContainer: {
        alignItems: 'center',
        gap: 16,
        width: '100%',
    },
    timerText: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: 1,
    },
    controlButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        width: '100%',
    },
    iconControlCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    // Chat Overlay Styles
    chatOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    chatSheet: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    chatHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    chatAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatAvatarText: {
        fontSize: fontSizes.sm,
        fontWeight: '850',
        color: colors.white,
    },
    chatHeaderTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    chatHeaderStatus: {
        fontSize: fontSizes.xs - 2,
        color: colors.success,
        fontWeight: '700',
    },
    chatMessagesContainer: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    chatMessagesContent: {
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    emptyChatContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: spacing.xs,
    },
    emptyChatText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    emptyChatSub: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        textAlign: 'center',
    },
    msgWrapper: {
        maxWidth: '80%',
        marginBottom: 4,
    },
    msgWrapperTeacher: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    msgWrapperStudent: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    msgBubble: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    msgBubbleTeacher: {
        backgroundColor: colors.accent,
        borderTopRightRadius: 4,
    },
    msgBubbleStudent: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        borderTopLeftRadius: 4,
    },
    msgTextTeacher: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '600',
    },
    msgTextStudent: {
        color: colors.text,
        fontSize: fontSizes.sm,
        fontWeight: '600',
    },
    msgTime: {
        fontSize: 9,
        color: colors.textMuted,
        marginTop: 2,
        fontWeight: '500',
    },
    chatInputBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingTop: 8,
        gap: 8,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    chatTextInput: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 44,
        fontSize: fontSizes.sm,
        color: colors.text,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    chatSendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ecfdf5',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1.5,
        borderColor: '#d1fae5',
    },
    chatBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 4,
    },
    chatIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatBannerTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text,
    },
    chatBannerSub: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
});

export default TeacherDashboard;
