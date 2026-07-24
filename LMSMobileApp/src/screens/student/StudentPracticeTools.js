import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { AppHeader } from '../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

const StudentPracticeTools = ({ navigation }) => {
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const [selectedDate, setSelectedDate] = useState(getTodayDdMmYyyy());
    const [loading, setLoading] = useState(true);
    const [templatesModalVisible, setTemplatesModalVisible] = useState(false);

    const [cloudFiles, setCloudFiles] = useState([]);
    const [localFiles, setLocalFiles] = useState([]);
    const [datesList, setDatesList] = useState([]);

    const loadAllPracticeData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Cloud Files from Server
            const cloudRes = await axios.get('/practice-files');
            const cFiles = cloudRes.data.files || [];
            setCloudFiles(cFiles);

            // 2. Fetch Local Files metadata from AsyncStorage
            const allLocal = [];

            // Screenshots
            const screenshotsStr = await AsyncStorage.getItem('practice_screenshots');
            if (screenshotsStr) {
                try {
                    const list = JSON.parse(screenshotsStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Screenshot Tool',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Screen Recordings
            const screenStr = await AsyncStorage.getItem('practice_screen_recordings');
            if (screenStr) {
                try {
                    const list = JSON.parse(screenStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Screen Recorder',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Videos
            const videoStr = await AsyncStorage.getItem('practice_videos');
            if (videoStr) {
                try {
                    const list = JSON.parse(videoStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Video Recorder',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Audios
            const audioStr = await AsyncStorage.getItem('practice_audios');
            if (audioStr) {
                try {
                    const list = JSON.parse(audioStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.timestamp,
                            toolType: 'Voice Recorder',
                            parsedDate: parseDateToDdMmYyyy(item.timestamp)
                        });
                    });
                } catch (e) {}
            }

            // Call Logs
            const logsStr = await AsyncStorage.getItem('practice_call_logs');
            if (logsStr) {
                try {
                    const list = JSON.parse(logsStr);
                    list.forEach(item => {
                        allLocal.push({
                            timestamp: item.date,
                            toolType: 'Web-Calling Tool',
                            parsedDate: parseDateToDdMmYyyy(item.date)
                        });
                    });
                } catch (e) {}
            }

            setLocalFiles(allLocal);

            // 3. Extract and Aggregate Unique Dates
            const today = getTodayDdMmYyyy();
            const datesMap = {};
            datesMap[today] = true; // Always guarantee today is present

            cFiles.forEach(f => {
                const parsed = parseDateToDdMmYyyy(f.createdAt);
                if (parsed !== 'Unknown Date') datesMap[parsed] = true;
            });

            allLocal.forEach(f => {
                if (f.parsedDate !== 'Unknown Date') datesMap[f.parsedDate] = true;
            });

            // Sort dates descending
            const sortedDates = Object.keys(datesMap).sort((a, b) => {
                const aParts = a.split('-');
                const bParts = b.split('-');
                const aTime = new Date(`${aParts[2]}-${aParts[1]}-${aParts[0]}`).getTime();
                const bTime = new Date(`${bParts[2]}-${bParts[1]}-${bParts[0]}`).getTime();
                return bTime - aTime;
            });

            setDatesList(sortedDates);
        } catch (err) {
            console.error("Failed to load practice files dates on mobile", err);
            // Guarantee today is at least in the list
            const today = getTodayDdMmYyyy();
            setDatesList([today]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadAllPracticeData();
        }
    }, [isFocused]);

    const isTodaySelected = useMemo(() => {
        return selectedDate === getTodayDdMmYyyy();
    }, [selectedDate]);

    // Count utility for tools on the active selected date
    const getFileCountForTool = (toolTitle) => {
        const dbTypeMap = {
            'Screenshot Tool': 'screenshot',
            'Screen Recorder': 'screen-recorder',
            'Voice Recorder': 'voice-recorder',
            'Video Recorder': 'video-recorder',
            'Web-Calling Tool': 'web-calling'
        };

        const localCount = localFiles.filter(f => f.parsedDate === selectedDate && f.toolType === toolTitle).length;

        const dbType = dbTypeMap[toolTitle];
        if (!dbType) return 0;
        const cloudCount = cloudFiles.filter(c => {
            const fileDate = parseDateToDdMmYyyy(c.createdAt);
            return fileDate === selectedDate && c.toolType === dbType;
        }).length;

        return localCount + cloudCount;
    };

    const handleLaunchTool = (tool) => {
        if (tool.action) {
            tool.action();
        } else if (tool.screen) {
            navigation.navigate(tool.screen, { date: selectedDate });
        }
    };

    const practiceToolsConfig = useMemo(() => {
        const config = [
            {
                title: "Form Builder Tool",
                description: "Create interactive question forms, quizzes, tests, and activities using the builder.",
                icon: "document-text-outline",
                color: "#ea580c",
                bg: "#fff7ed",
                borderColor: "#fed7aa",
                isAdminOnly: true,
                action: () => setTemplatesModalVisible(true),
                isFormBuilder: true
            },
            {
                title: "Database Creator Tool",
                description: "Design custom tables, data fields, schemas, and relational database records.",
                icon: "database-outline",
                color: "#2563eb",
                bg: "#eff6ff",
                borderColor: "#bfdbfe",
                isAdminOnly: true,
                isComingSoon: true,
                action: () => Alert.alert("Coming Soon", "Database Creator Tool is coming soon to the creators suite.")
            },
            {
                title: "Voice Recorder",
                description: "Record audio notes, speech practice, and pronunciation reviews.",
                icon: "mic-outline",
                screen: "VoiceRecorderPage",
                color: "#3b82f6",
                bg: "#eff6ff",
                borderColor: "#cbd5e1"
            },
            {
                title: "Video Recorder",
                description: "Capture high-definition video recordings for presentation and feedback.",
                icon: "film-outline",
                screen: "VideoRecorderPage",
                color: "#8b5cf6",
                bg: "#f5f3ff",
                borderColor: "#cbd5e1"
            },
            {
                title: "File Uploader",
                description: "Upload assignments, files, documents, and multimedia attachments.",
                icon: "cloud-upload-outline",
                screen: "FileUploadPage",
                color: "#d97706",
                bg: "#fef3c7",
                borderColor: "#fde68a"
            },
            {
                title: "Screenshot Tool",
                description: "Capture specific areas of your viewport or app layout instantly.",
                icon: "camera-outline",
                screen: "ScreenshotToolPage",
                color: "#6366f1",
                bg: "#eef2ff",
                borderColor: "#cbd5e1"
            },
            {
                title: "Screen Recorder",
                description: "Record your screen and browser window activities with voiceover.",
                icon: "videocam-outline",
                screen: "ScreenRecorderPage",
                color: "#10b981",
                bg: "#ecfdf5",
                borderColor: "#cbd5e1"
            },
            {
                title: "Web-Calling Tool",
                description: "Initiate web calling and interactive voice sessions.",
                icon: "call-outline",
                screen: "WebCallingPage",
                color: "#ec4899",
                bg: "#fdf2f8",
                borderColor: "#cbd5e1"
            }
        ];
        
        const isAdminOrTeacher = user?.role === 'Admin' || user?.role === 'Teacher';
        return config.filter(tool => !tool.isAdminOnly || isAdminOrTeacher);
    }, [user]);

    return (
        <View style={styles.container}>
            <AppHeader
                title="Practice Workspace"
                showBack={true}
                backAction={() => navigation.goBack()}
            />

            {/* Date Selector Header */}
            <View style={styles.dateSelectorSection}>
                <Text style={styles.sectionLabel}>WORKSPACE DATE LOGS</Text>
                {loading ? (
                    <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 10 }} />
                ) : (
                    <FlatList
                        horizontal
                        data={datesList}
                        keyExtractor={item => item}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.datesListContainer}
                        renderItem={({ item }) => {
                            const isActive = selectedDate === item;
                            const isToday = item === getTodayDdMmYyyy();
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedDate(item)}
                                    style={[
                                        styles.dateBadge,
                                        isActive && styles.dateBadgeActive
                                    ]}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={14}
                                        color={isActive ? colors.white : colors.textSecondary}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.dateText, isActive && styles.dateTextActive]}>
                                        {item}
                                    </Text>
                                    {isToday && (
                                        <View style={[styles.todayDot, isActive && styles.todayDotActive]} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Active Workspace Banner */}
                <View style={[
                    styles.infoBanner,
                    isTodaySelected ? styles.infoBannerActive : styles.infoBannerReadOnly
                ]}>
                    <Ionicons
                        name={isTodaySelected ? "lock-open-outline" : "lock-closed-outline"}
                        size={20}
                        color={isTodaySelected ? colors.success : colors.warning}
                        style={{ marginRight: 10, marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={[
                            styles.bannerTitle,
                            { color: isTodaySelected ? '#065f46' : '#92400e' }
                        ]}>
                            {isTodaySelected ? 'Active Practice Environment' : 'Archive Read-Only Mode'}
                        </Text>
                        <Text style={[
                            styles.bannerSub,
                            { color: isTodaySelected ? '#047857' : '#b45309' }
                        ]}>
                            {isTodaySelected
                                ? 'You can record audio clips, snap screenshots, and perform file deletions. Cloud uploads and sync are fully active.'
                                : 'You are viewing logs created on this date. File recording, uploads, and deletions are disabled for this archive date.'
                            }
                        </Text>
                    </View>
                </View>

                {/* Tools Grid */}
                <Text style={styles.gridHeader}>CHOOSE PRACTICE TOOL</Text>
                <View style={styles.grid}>
                    {practiceToolsConfig.map((tool, index) => {
                        const fileCount = getFileCountForTool(tool.title);
                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.85}
                                onPress={() => handleLaunchTool(tool)}
                                style={[styles.toolCard, { backgroundColor: tool.bg }]}
                            >
                                <View style={styles.toolCardHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: tool.color }]}>
                                        <Ionicons name={tool.icon} size={24} color={colors.white} />
                                    </View>
                                    <View style={styles.badge}>
                                        <Text style={[styles.badgeText, { color: tool.color }]}>
                                            {tool.isComingSoon ? 'Soon' : tool.isFormBuilder ? 'Active' : `${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.toolTitle}>{tool.title}</Text>
                                <Text style={styles.toolDesc}>{tool.description}</Text>
                                <View style={styles.launchRow}>
                                    <Text style={[styles.launchText, { color: tool.color }]}>
                                        {tool.isComingSoon ? 'Learn More' : 'Open Tool'}
                                    </Text>
                                    <Ionicons name="arrow-forward-outline" size={14} color={tool.color} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Templates Suite Modal */}
            <Modal
                visible={templatesModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setTemplatesModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setTemplatesModalVisible(false)}
                >
                    <View style={styles.templatesModalContainer}>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setTemplatesModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>TEMPLATES SUITE</Text>
                            <Text style={styles.modalSubTitle}>SELECT A TEMPLATE BUILDER TO GET STARTED</Text>
                        </View>

                        <ScrollView 
                            style={styles.templatesScroll}
                            contentContainerStyle={styles.templatesScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {[
                                {
                                    name: "Form Templates",
                                    description: "Create interactive question forms, quizzes, and tests.",
                                    icon: "document-text-outline",
                                    color: "#ef4444",
                                    bg: "#fee2e2",
                                    isActive: true,
                                    action: () => {
                                        setTemplatesModalVisible(false);
                                        navigation.navigate('TestBuilder');
                                    }
                                },
                                {
                                    name: "Card Form Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "card-outline",
                                    color: "#3b82f6",
                                    bg: "#dbeafe",
                                    isActive: false
                                },
                                {
                                    name: "App Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "phone-portrait-outline",
                                    color: "#6366f1",
                                    bg: "#eef2ff",
                                    isActive: false
                                },
                                {
                                    name: "Store Builder Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "cart-outline",
                                    color: "#1e293b",
                                    bg: "#f1f5f9",
                                    isActive: false
                                },
                                {
                                    name: "Table Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "grid-outline",
                                    color: "#059669",
                                    bg: "#d1fae5",
                                    isActive: false
                                },
                                {
                                    name: "Workflow Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "git-branch-outline",
                                    color: "#0f766e",
                                    bg: "#ccfbf1",
                                    isActive: false
                                },
                                {
                                    name: "PDF Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "document-outline",
                                    color: "#0284c7",
                                    bg: "#e0f2fe",
                                    isActive: false
                                },
                                {
                                    name: "Sign Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "pencil-outline",
                                    color: "#65a30d",
                                    bg: "#f7fee7",
                                    isActive: false
                                },
                                {
                                    name: "AI Agent Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "sparkles-outline",
                                    color: "#7c3aed",
                                    bg: "#f3e8ff",
                                    isActive: false
                                },
                                {
                                    name: "Board Templates",
                                    description: "Coming soon to the creators suite.",
                                    icon: "apps-outline",
                                    color: "#0891b2",
                                    bg: "#ecfeff",
                                    isActive: false
                                }
                            ].map((item, idx) => {
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.templateCard,
                                            !item.isActive && styles.templateCardInactive
                                        ]}
                                        onPress={() => {
                                            if (item.isActive) {
                                                item.action();
                                            } else {
                                                Alert.alert("Coming Soon", `${item.name} is coming soon to the creators suite.`);
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.templateIconCircle, { backgroundColor: item.bg }]}>
                                            <Ionicons name={item.icon} size={20} color={item.color} />
                                        </View>
                                        
                                        <View style={styles.templateInfo}>
                                            <View style={styles.templateTitleRow}>
                                                <Text style={styles.templateName}>{item.name}</Text>
                                                {!item.isActive && (
                                                    <View style={styles.soonBadge}>
                                                        <Text style={styles.soonBadgeText}>SOON</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.templateDesc} numberOfLines={2}>
                                                {item.description}
                                            </Text>
                                        </View>

                                        {item.isActive && (
                                            <Text style={[styles.openTemplateText, { color: colors.accent }]}>
                                                Open →
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg
    },
    dateSelectorSection: {
        backgroundColor: colors.bgCard,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    sectionLabel: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '900',
        color: colors.textMuted,
        paddingHorizontal: spacing.md,
        marginBottom: 6,
        letterSpacing: 1
    },
    datesListContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: 4
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border
    },
    dateBadgeActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent
    },
    dateText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary
    },
    dateTextActive: {
        color: colors.white
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
        marginLeft: 6
    },
    todayDotActive: {
        backgroundColor: colors.white
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 32
    },
    infoBanner: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        marginBottom: spacing.lg
    },
    infoBannerActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0'
    },
    infoBannerReadOnly: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a'
    },
    bannerTitle: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        marginBottom: 2
    },
    bannerSub: {
        fontSize: fontSizes.xs,
        fontWeight: '500',
        lineHeight: 16
    },
    gridHeader: {
        fontSize: fontSizes.xs - 1,
        fontWeight: '900',
        color: colors.textMuted,
        marginBottom: spacing.sm,
        letterSpacing: 1
    },
    grid: {
        gap: spacing.md
    },
    toolCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    toolCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    badge: {
        backgroundColor: colors.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    badgeText: {
        fontSize: fontSizes.xs,
        fontWeight: '900',
        textTransform: 'uppercase'
    },
    toolTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4
    },
    launchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    launchText: {
        fontSize: fontSizes.xs,
        fontWeight: '700'
    },
    toolDesc: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 12,
        lineHeight: 16
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md
    },
    templatesModalContainer: {
        width: '95%',
        maxHeight: '85%',
        backgroundColor: colors.bgCard,
        borderRadius: 24,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        position: 'relative'
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        zIndex: 10
    },
    modalHeader: {
        marginTop: 8,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingBottom: 12
    },
    modalTitle: {
        fontSize: fontSizes.lg + 1,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 0.5
    },
    modalSubTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        marginTop: 4,
        letterSpacing: 1
    },
    templatesScroll: {
        width: '100%'
    },
    templatesScrollContent: {
        paddingBottom: 16,
        gap: 12
    },
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.bgCard,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2
    },
    templateCardInactive: {
        backgroundColor: colors.bgSecondary,
        borderColor: colors.border,
        opacity: 0.85
    },
    templateIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    templateInfo: {
        flex: 1
    },
    templateTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    templateName: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.text
    },
    soonBadge: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 4
    },
    soonBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#4f46e5'
    },
    templateDesc: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
        fontWeight: '500'
    },
    openTemplateText: {
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 6
    }
});

export default StudentPracticeTools;
