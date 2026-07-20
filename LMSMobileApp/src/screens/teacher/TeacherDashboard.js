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
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Staff Features States
    const [activeTab, setActiveTab] = useState('home'); // 'home' | 'tasks' | 'attendance' | 'salary'
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [leaveDate, setLeaveDate] = useState('');
    const [leaveNote, setLeaveNote] = useState('');
    const [submittingLeave, setSubmittingLeave] = useState(false);

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

    // Staff tasks & attendance logic
    const loadTasks = async () => {
        try {
            const stored = await AsyncStorage.getItem(`staff_tasks_${user?._id}`);
            if (stored) setTasks(JSON.parse(stored));
            else setTasks([
                { id: '1', title: 'Preparation for Daily Activities', description: 'Review scheduled materials', status: 'pending' },
            ]);
        } catch (e) {}
    };

    const saveTasks = async (newTasks) => {
        try {
            await AsyncStorage.setItem(`staff_tasks_${user?._id}`, JSON.stringify(newTasks));
            setTasks(newTasks);
        } catch (e) {}
    };

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) { Alert.alert('Error', 'Please enter task title'); return; }
        const newTask = { id: Date.now().toString(), title: newTaskTitle.trim(), description: newTaskDesc.trim(), status: 'pending' };
        saveTasks([newTask, ...tasks]);
        setNewTaskTitle(''); setNewTaskDesc('');
        Alert.alert('Success', 'Task created successfully');
    };

    const handleToggleTaskStatus = (id) => {
        saveTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t));
    };

    const handleDeleteTask = (id) => {
        Alert.alert('Delete Task', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => saveTasks(tasks.filter(t => t.id !== id)) }
        ]);
    };

    const fetchAttendanceAndHistory = async () => {
        try {
            if (user?._id) {
                const { data } = await axios.get(`/attendance/staff/${user._id}/history`);
                setAttendanceHistory(data.history || []);
            }
        } catch (e) {}
    };

    const handleApplyLeave = async () => {
        if (!leaveDate || !leaveNote.trim()) { Alert.alert('Error', 'Please fill in leave date & reason'); return; }
        try {
            setSubmittingLeave(true);
            const formData = new FormData();
            formData.append('date', leaveDate);
            formData.append('leaveNote', leaveNote.trim());
            await axios.post('/attendance/leave-application', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            Alert.alert('Success', 'Leave application submitted!');
            setLeaveDate(''); setLeaveNote(''); fetchAttendanceAndHistory();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to submit leave');
        } finally { setSubmittingLeave(false); }
    };

    const fetchData = async () => {
        try {
            const [profileRes, studentsRes] = await Promise.all([
                axios.get('/users/profile').catch(e => { console.warn('/users/profile error:', e.message); return { data: null }; }),
                axios.get('/users/teacher-students').catch(e => { console.warn('/users/teacher-students error:', e.message); return { data: [] }; }),
            ]);
            if (profileRes?.data) setProfile(profileRes.data);
            if (studentsRes?.data) setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        } catch (e) {
            console.warn('Fetch teacher stats error:', e.message);
        }

        try {
            await loadTasks();
            await fetchAttendanceAndHistory();
        } catch (e) {}

        setLoading(false);
        setRefreshing(false);
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
            
            {/* Quick Actions top tab bar */}
            <View style={styles.topTabBar}>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('home')} activeOpacity={0.7}>
                    <Ionicons name="home-outline" size={20} color={activeTab === 'home' ? colors.teacher : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('tasks')} activeOpacity={0.7}>
                    <Ionicons name="checkmark-done-circle-outline" size={20} color={activeTab === 'tasks' ? colors.teacher : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'tasks' && styles.tabLabelActive]}>Tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('attendance')} activeOpacity={0.7}>
                    <Ionicons name="calendar-outline" size={20} color={activeTab === 'attendance' ? colors.teacher : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'attendance' && styles.tabLabelActive]}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('salary')} activeOpacity={0.7}>
                    <Ionicons name="card-outline" size={20} color={activeTab === 'salary' ? colors.teacher : colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'salary' && styles.tabLabelActive]}>Salary</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'home' && (
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
                            onPress={() => navigation.navigate('ContactStudents')}
                        />
                        <StatCard
                            title="Activities"
                            value="–"
                            icon="clipboard"
                            color={colors.accent}
                            bg="#eef2ff"
                            onPress={() => navigation.navigate('TeacherActivities')}
                        />
                    </View>

                    {/* Teacher Actions Desk */}
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Teacher Actions</Text>
                        <View style={styles.actionsGrid}>
                            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('TeacherActivities')}>
                                <Ionicons name="document-text-outline" size={24} color="#8b5cf6" />
                                <Text style={styles.actionLabel}>Student Activities</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('TeacherSnapshots')}>
                                <Ionicons name="calendar-outline" size={24} color="#ef4444" />
                                <Text style={styles.actionLabel}>Student Attendance</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('EvaluatePage')}>
                                <Ionicons name="checkmark-done-circle-outline" size={24} color="#10b981" />
                                <Text style={styles.actionLabel}>Evaluate</Text>
                            </TouchableOpacity>
                        </View>
                    </SectionCard>

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
            )}

            {activeTab === 'tasks' && (
                <View style={styles.workspaceBody}>
                    <SectionCard style={styles.addTaskCard}>
                        <Text style={styles.sectionTitle}>Create Task</Text>
                        <TextInput style={styles.inputField} placeholder="Task title..." placeholderTextColor={colors.textMuted} value={newTaskTitle} onChangeText={setNewTaskTitle} />
                        <TextInput style={[styles.inputField, { height: 60 }]} placeholder="Task description..." placeholderTextColor={colors.textMuted} value={newTaskDesc} onChangeText={setNewTaskDesc} multiline />
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddTask} activeOpacity={0.8}>
                            <Text style={styles.addBtnText}>Create Task</Text>
                        </TouchableOpacity>
                    </SectionCard>
                    <FlatList
                        data={tasks}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.taskItem}>
                                <TouchableOpacity onPress={() => handleToggleTaskStatus(item.id)} style={styles.checkWrapper}>
                                    <Ionicons name={item.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.status === 'done' ? '#10b981' : colors.textSecondary} />
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.taskTitle, item.status === 'done' && styles.taskTitleDone]}>{item.title}</Text>
                                    {item.description ? <Text style={styles.taskDesc}>{item.description}</Text> : null}
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteTask(item.id)} style={styles.deleteBtn}>
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={<EmptyState icon="clipboard-outline" title="No tasks registered" />}
                        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
                    />
                </View>
            )}

            {activeTab === 'attendance' && (
                <View style={styles.workspaceBody}>
                    <SectionCard style={styles.leaveCard}>
                        <Text style={styles.sectionTitle}>Apply Leave</Text>
                        <TextInput style={styles.inputField} placeholder="Date (e.g. 2026-07-20)" placeholderTextColor={colors.textMuted} value={leaveDate} onChangeText={setLeaveDate} />
                        <TextInput style={[styles.inputField, { height: 60 }]} placeholder="Reason for leave..." placeholderTextColor={colors.textMuted} value={leaveNote} onChangeText={setLeaveNote} multiline />
                        <TouchableOpacity style={[styles.addBtn, submittingLeave && { opacity: 0.5 }]} onPress={handleApplyLeave} disabled={submittingLeave} activeOpacity={0.8}>
                            {submittingLeave ? <ActivityIndicator color={colors.white} /> : <Text style={styles.addBtnText}>Submit Leave</Text>}
                        </TouchableOpacity>
                    </SectionCard>
                    <FlatList
                        data={attendanceHistory}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.historyItem}>
                                <View>
                                    <Text style={styles.historyDate}>{item.date}</Text>
                                    <Text style={styles.historyDetails}>{item.checkInTime ? `In: ${item.checkInTime}` : ''}{item.checkOutTime ? ` • Out: ${item.checkOutTime}` : ''}</Text>
                                </View>
                                <Badge label={item.status} color={item.status === 'Present' ? '#10b981' : item.status === 'Absent' ? '#ef4444' : '#f59e0b'} />
                            </View>
                        )}
                        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No attendance logs found" />}
                        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
                    />
                </View>
            )}

            {activeTab === 'salary' && (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                    <SectionCard>
                        <Text style={styles.sectionTitle}>Salary Ledger Information</Text>
                        <View style={styles.ledgerCard}>
                            <Text style={styles.salaryHeader}>Contract Base Salary</Text>
                            <Text style={styles.salaryAmt}>₹{Number(user?.teacherProfile?.salary || user?.staffProfile?.salary || 0).toLocaleString('en-IN')}</Text>
                        </View>
                    </SectionCard>
                    <SectionCard style={{ marginTop: spacing.md }}>
                        <Text style={styles.sectionTitle}>Status</Text>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Salary Status</Text>
                            <Badge label={user?.teacherProfile?.salaryStatus || 'Paid'} color="#10b981" />
                        </View>
                    </SectionCard>
                    <View style={{ height: 80 }} />
                </ScrollView>
            )}

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
    actionsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.xs,
    },
    actionCard: {
        flex: 1,
        backgroundColor: colors.bg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 0.5,
    },
    actionLabel: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        marginTop: 6,
        textAlign: 'center',
    },
    tabLabelActive: { color: colors.teacher, fontWeight: '800' },
    workspaceBody: { flex: 1, padding: spacing.md },
    addTaskCard: { marginBottom: spacing.md },
    inputField: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        color: colors.text,
        fontSize: fontSizes.sm,
        marginBottom: spacing.sm,
    },
    addBtn: {
        backgroundColor: colors.teacher,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    addBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    checkWrapper: { padding: 2 },
    taskTitle: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
    taskTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    taskDesc: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    deleteBtn: { padding: 4 },
    leaveCard: { marginBottom: spacing.md },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    historyDate: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    historyDetails: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    ledgerCard: {
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    salaryHeader: { fontSize: fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase' },
    salaryAmt: { fontSize: fontSizes.xxl, fontWeight: '900', color: colors.teacher, marginVertical: spacing.xs },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusLabel: { fontSize: fontSizes.sm, color: colors.textSecondary },
});

export default TeacherDashboard;
