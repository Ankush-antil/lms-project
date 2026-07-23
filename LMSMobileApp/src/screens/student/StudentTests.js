import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ScrollView,
    Alert,
    Linking,
    Dimensions
} from 'react-native';
import axios from 'axios';
import { AppHeader, LoadingScreen, EmptyState, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const screenWidth = Dimensions.get('window').width;

const StudentTests = ({ navigation }) => {
    const { user } = useAuth();
    
    // Data states
    const [profile, setProfile] = useState(null);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [inboxConfigs, setInboxConfigs] = useState([]);
    const [activityConfigs, setActivityConfigs] = useState([]);
    const [studyMaterials, setStudyMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // UI states
    const [selectedInbox, setSelectedInbox] = useState(null); // null = browse list, object = inbox details
    const [viewMode, setViewMode] = useState('upcoming'); // upcoming | submitted | returned | evaluated | expired | material | tools | analytics
    const [search, setSearch] = useState('');
    const [expandedSubjects, setExpandedSubjects] = useState({}); // { [subjectName]: boolean }

    const fetchData = async () => {
        try {
            const [profileRes, testsRes, subsRes, configsRes, actConfigsRes, materialsRes] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/tests'),
                axios.get('/submissions'),
                axios.get('/users/inbox-configs').catch(() => ({ data: [] })),
                axios.get('/users/activity-configs').catch(() => ({ data: [] })),
                axios.get('/study-materials').catch(() => ({ data: [] }))
            ]);
            setProfile(profileRes.data || null);
            setTests(testsRes.data || []);
            setSubmissions(subsRes.data || []);
            setInboxConfigs(configsRes.data || []);
            setActivityConfigs(actConfigsRes.data || []);
            setStudyMaterials(materialsRes.data || []);
        } catch (e) {
            console.error('[ACTIVITIES FETCH ERROR]', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Helper: check if test has expired
    const isTestExpired = (test) => {
        if (!test.settings?.endTime) return false;
        return Date.now() > new Date(test.settings.endTime).getTime();
    };

    // Memoize submissions lookup map
    const submissionMap = useMemo(() => {
        const map = new Map();
        submissions.forEach(sub => {
            const testId = sub.test?._id || sub.test;
            if (testId) map.set(String(testId), sub);
        });
        return map;
    }, [submissions]);

    // Calculate maximum course duration/weeks
    const courseDuration = useMemo(() => {
        const profileDuration = profile?.studentProfile?.course?.duration;
        if (profileDuration && profileDuration > 0) return profileDuration;

        let maxIndex = 0;
        tests.forEach(test => {
            if (test.index) {
                const match = test.index.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0]);
                    if (num > maxIndex) maxIndex = num;
                }
            }
        });
        return Math.max(maxIndex, 5); // Default to at least 5 inboxes
    }, [profile, tests]);

    // Subject Days Mapping (Exactly matches web client logic)
    const subjectDaysMapping = useMemo(() => {
        if (!profile || !profile.studentProfile?.course) return [];
        const course = profile.studentProfile.course;
        const subjects = course.subjects || [];
        const durations = course.subjectDurations || [];
        const totalDuration = course.duration || 5;

        let currentDayIndex = 1;
        const mapping = [];

        if (durations && durations.length > 0) {
            durations.forEach(d => {
                const subName = d.subjectName;
                const subDur = Number(d.duration) || 0;
                const daysList = [];
                for (let i = 1; i <= subDur; i++) {
                    if (currentDayIndex <= totalDuration) {
                        daysList.push({
                            dayNum: i,
                            indexNum: currentDayIndex,
                            id: `Inbox ${currentDayIndex}`
                        });
                        currentDayIndex++;
                    }
                }
                if (daysList.length > 0) {
                    mapping.push({
                        subjectName: subName,
                        days: daysList
                    });
                }
            });
        }

        if (currentDayIndex <= totalDuration) {
            const mappedSubjectNames = mapping.map(m => m.subjectName.toLowerCase());
            const remainingSubjects = subjects.filter(s => !mappedSubjectNames.includes(s.toLowerCase()));

            if (remainingSubjects.length > 0) {
                const remainingDays = totalDuration - currentDayIndex + 1;
                const daysPerSubject = Math.floor(remainingDays / remainingSubjects.length);
                const extraDays = remainingDays % remainingSubjects.length;

                remainingSubjects.forEach((subName, idx) => {
                    const subDur = daysPerSubject + (idx < extraDays ? 1 : 0);
                    const daysList = [];
                    for (let i = 1; i <= subDur; i++) {
                        if (currentDayIndex <= totalDuration) {
                            daysList.push({
                                dayNum: i,
                                indexNum: currentDayIndex,
                                id: `Inbox ${currentDayIndex}`
                            });
                            currentDayIndex++;
                        }
                    }
                    if (daysList.length > 0) {
                        mapping.push({
                            subjectName: subName,
                            days: daysList
                        });
                    }
                });
            }
        }

        return mapping;
    }, [profile]);

    // Helper: Match test to inbox IDs based on subjectDaysMapping (Matches Web StudentTests.jsx)
    const getMatchingInboxIdsForTest = (test, mapping) => {
        if (!test || !test.index) return ['no index'];

        const normalizeKey = (raw) => {
            if (!raw) return 'no index';
            const trimmed = String(raw).trim().toLowerCase();
            const match = trimmed.match(/\d+/);
            return match ? `inbox ${match[0]}` : trimmed;
        };

        const testIndexNorm = normalizeKey(test.index);
        const testSubjects = (test.subject || '')
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);

        if (testSubjects.length === 0 || !mapping || mapping.length === 0) {
            return [testIndexNorm];
        }

        const firstSub = testSubjects[0];
        const firstSubGroup = mapping.find(
            g => g.subjectName.toLowerCase() === firstSub ||
                 g.subjectName.toLowerCase().includes(firstSub) ||
                 firstSub.includes(g.subjectName.toLowerCase())
        );

        let localDayNum = null;
        if (firstSubGroup) {
            const matchedDay = firstSubGroup.days.find(d => normalizeKey(d.id) === testIndexNorm);
            if (matchedDay) {
                localDayNum = matchedDay.dayNum;
            } else {
                const match = testIndexNorm.match(/\d+/);
                if (match) localDayNum = parseInt(match[0], 10);
            }
        } else {
            const match = testIndexNorm.match(/\d+/);
            if (match) localDayNum = parseInt(match[0], 10);
        }

        if (localDayNum === null) {
            return [testIndexNorm];
        }

        const matchedGlobalIds = [];
        testSubjects.forEach(subName => {
            const group = mapping.find(
                g => g.subjectName.toLowerCase() === subName ||
                     g.subjectName.toLowerCase().includes(subName) ||
                     subName.includes(g.subjectName.toLowerCase())
            );
            if (group) {
                const dayObj = group.days.find(d => d.dayNum === localDayNum);
                if (dayObj) {
                    matchedGlobalIds.push(normalizeKey(dayObj.id));
                }
            }
        });

        if (matchedGlobalIds.length === 0) {
            matchedGlobalIds.push(testIndexNorm);
        }

        return matchedGlobalIds;
    };

    // Build the dynamic list of inboxes
    const inboxItems = useMemo(() => {
        const normalizeKey = (raw) => {
            if (!raw) return 'no index';
            const trimmed = String(raw).trim().toLowerCase();
            const match = trimmed.match(/\d+/);
            return match ? `inbox ${match[0]}` : trimmed;
        };

        const validDayIds = new Set(
            subjectDaysMapping.flatMap(g => g.days.map(d => normalizeKey(d.id)))
        );

        // Group tests by matched global inbox IDs
        const testsGrouped = tests.reduce((acc, test) => {
            const matchedIds = getMatchingInboxIdsForTest(test, subjectDaysMapping);
            matchedIds.forEach(id => {
                const normalized = normalizeKey(id);

                // Find the subject this inbox belongs to
                const inboxSubject = (() => {
                    const foundGroup = subjectDaysMapping.find(g =>
                        g.days.some(d => normalizeKey(d.id) === normalized)
                    );
                    return foundGroup ? foundGroup.subjectName : null;
                })();

                // Filter out if test has a subject and it doesn't match the inbox's subject
                if (inboxSubject && test.subject) {
                    const testSubs = test.subject.split(',').map(s => s.trim().toLowerCase());
                    const inboxSubNorm = inboxSubject.trim().toLowerCase();
                    const hasMatch = testSubs.some(s => s === inboxSubNorm || inboxSubNorm.includes(s) || s.includes(inboxSubNorm));
                    if (!hasMatch) return;
                }

                if (!acc[normalized]) acc[normalized] = [];
                if (!acc[normalized].some(t => t._id === test._id)) {
                    acc[normalized].push(test);
                }
            });
            return acc;
        }, {});

        // Group study materials by normalized index
        const materialsGrouped = studyMaterials.reduce((acc, mat) => {
            const indexStr = mat.inboxId || 'No Index';
            const normalized = normalizeKey(indexStr);
            if (!acc[normalized]) acc[normalized] = [];
            acc[normalized].push(mat);
            return acc;
        }, {});

        const standardKeys = [];
        for (let i = 1; i <= courseDuration; i++) {
            standardKeys.push(`Inbox ${i}`);
        }

        const enrollmentDate = profile?.studentProfile?.enrollmentDate || profile?.createdAt || new Date();

        return standardKeys.map(keyName => {
            const normalized = normalizeKey(keyName);
            const testsInInbox = testsGrouped[normalized] || [];
            const materialsInInbox = materialsGrouped[normalized] || [];

            const config = inboxConfigs.find(c => normalizeKey(c.inboxId) === normalized);
            const isVisible = config ? config.visible : true;

            const match = keyName.match(/\d+/);
            const idxNum = match ? parseInt(match[0], 10) : 1;
            const week = Math.ceil(idxNum / 7);
            const offsetDays = (week - 1) * 7;
            const inboxUnlockDateMs = new Date(enrollmentDate).getTime() + offsetDays * 24 * 60 * 60 * 1000;
            const isInboxDisabled = false; // Always unlocked per policy
            const customTitle = config && config.displayName ? config.displayName : keyName;

            // Count activities in various states
            let pendingCount = 0;
            let completedCount = 0;
            
            testsInInbox.forEach(t => {
                const sub = submissionMap.get(String(t._id));
                const isConfiguredHidden = activityConfigs.some(ac => ac.test === t._id && ac.visible === false);
                if (isConfiguredHidden || t.isAssigned === false) return;

                if (sub && (sub.status === 'evaluated' || sub.status === 'submitted')) {
                    completedCount++;
                } else if (!isTestExpired(t)) {
                    pendingCount++;
                }
            });

            return {
                id: keyName,
                title: customTitle,
                pending: pendingCount,
                completed: completedCount,
                tests: testsInInbox,
                materials: materialsInInbox,
                visible: isVisible,
                disabled: isInboxDisabled,
                unlockDate: new Date(inboxUnlockDateMs)
            };
        }).filter(item => item.visible);
    }, [tests, studyMaterials, inboxConfigs, activityConfigs, submissionMap, courseDuration, profile, subjectDaysMapping]);

    // Group Inboxes by Subject for display in Browse level
    const groupedInboxes = useMemo(() => {
        const normalizeKey = (raw) => {
            if (!raw) return '';
            const trimmed = String(raw).trim().toLowerCase();
            const match = trimmed.match(/\d+/);
            return match ? `inbox ${match[0]}` : trimmed;
        };

        const resultGroups = subjectDaysMapping.map(group => {
            const matchedDays = group.days.map(day => {
                const inboxItem = inboxItems.find(item => normalizeKey(item.id) === normalizeKey(day.id));
                if (!inboxItem) return null;

                const config = inboxConfigs.find(c => c.inboxId?.trim().toLowerCase() === day.id?.trim().toLowerCase());
                const cleanDisplayName = config && config.displayName ? config.displayName : `Inbox ${day.dayNum}`;

                return {
                    ...inboxItem,
                    displayTitle: cleanDisplayName,
                    dayNum: day.dayNum,
                    indexNum: day.indexNum
                };
            }).filter(Boolean);

            // Filter inbox list by search query if any
            const filteredDays = matchedDays.filter(day =>
                day.displayTitle.toLowerCase().includes(search.toLowerCase())
            );

            // Sort days under this subject numerically based on the leading digits of displayTitle
            filteredDays.sort((a, b) => {
                const getNum = (title) => {
                    const match = String(title).match(/^(\d+)/);
                    return match ? parseInt(match[1], 10) : 999999;
                };
                return getNum(a.displayTitle) - getNum(b.displayTitle);
            });

            return {
                subjectName: group.subjectName,
                days: filteredDays
            };
        }).filter(group => group.days.length > 0);

        // Sort the subject groups themselves numerically based on their subjectName prefix
        resultGroups.sort((a, b) => {
            const getNum = (name) => {
                const match = String(name).match(/^(\d+)/);
                return match ? parseInt(match[1], 10) : 999999;
            };
            return getNum(a.subjectName) - getNum(b.subjectName);
        });

        return resultGroups;
    }, [subjectDaysMapping, inboxItems, inboxConfigs, search]);

    // Initialize expand/collapse states once mapping is loaded
    useEffect(() => {
        if (subjectDaysMapping.length > 0 && Object.keys(expandedSubjects).length === 0) {
            const initial = {};
            subjectDaysMapping.forEach(g => {
                initial[g.subjectName] = true; // expanded by default
            });
            setExpandedSubjects(initial);
        }
    }, [subjectDaysMapping]);

    const toggleSubject = (name) => {
        setExpandedSubjects(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Get selected inbox's current list of activities based on selected tab (viewMode)
    const activeInboxActivities = useMemo(() => {
        if (!selectedInbox) return [];

        if (viewMode === 'material') {
            return selectedInbox.materials.filter(m => 
                m.title?.toLowerCase().includes(search.toLowerCase())
            );
        }

        return (selectedInbox.tests || []).filter(test => {
            const matchesSearch = test.title?.toLowerCase().includes(search.toLowerCase()) || 
                                 test.subject?.toLowerCase().includes(search.toLowerCase());
            if (!matchesSearch) return false;

            const sub = submissionMap.get(String(test._id));
            const isConfiguredHidden = activityConfigs.some(c => c.test === test._id && c.visible === false);
            
            if (isConfiguredHidden || test.isAssigned === false) return false;

            if (viewMode === 'upcoming') {
                return (!sub || sub.status === 'reported') && !isTestExpired(test);
            } else if (viewMode === 'submitted') {
                return sub && sub.status === 'submitted';
            } else if (viewMode === 'returned') {
                return !isTestExpired(test) && sub && sub.status === 'returned';
            } else if (viewMode === 'evaluated') {
                return sub && sub.status === 'evaluated';
            } else if (viewMode === 'expired') {
                const isUnfinished = !sub || sub.status === 'returned' || sub.status === 'reported';
                return isTestExpired(test) && isUnfinished;
            }
            return false;
        });
    }, [selectedInbox, viewMode, submissionMap, activityConfigs, search]);

    if (loading) return <LoadingScreen />;

    // --- LEVEL 1: Browse Inboxes Grouped by Subject ---
    if (!selectedInbox) {
        return (
            <View style={styles.container}>
                <AppHeader title="Activities Inbox" />
                
                {/* Search */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search inboxes..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <ScrollView
                    style={styles.scrollContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                >
                    {groupedInboxes.map(subjectGroup => {
                        const isExpanded = expandedSubjects[subjectGroup.subjectName] !== false;
                        return (
                            <View key={subjectGroup.subjectName} style={styles.subjectSection}>
                                <TouchableOpacity
                                    style={styles.subjectHeader}
                                    activeOpacity={0.7}
                                    onPress={() => toggleSubject(subjectGroup.subjectName)}
                                >
                                    <View style={styles.subjectTitleRow}>
                                        <Text style={styles.subjectTitle}>{subjectGroup.subjectName}</Text>
                                        <View style={styles.subjectCountCircle}>
                                            <Text style={styles.subjectCountText}>{subjectGroup.days.length}</Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={isExpanded ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={colors.text}
                                    />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.inboxesList}>
                                        {subjectGroup.days.map(dayItem => {
                                            const isLocked = dayItem.disabled;
                                            return (
                                                <TouchableOpacity
                                                    key={dayItem.id}
                                                    style={[styles.inboxCard, isLocked && styles.inboxCardDisabled]}
                                                    activeOpacity={isLocked ? 0.9 : 0.7}
                                                    onPress={() => {
                                                        if (isLocked) {
                                                            Alert.alert(
                                                                'Locked Inbox',
                                                                `This inbox will unlock on ${dayItem.unlockDate.toLocaleDateString()}`
                                                            );
                                                        } else {
                                                            setSearch(''); // clear search
                                                            setSelectedInbox(dayItem);
                                                            setViewMode('upcoming');
                                                        }
                                                    }}
                                                >
                                                    <View style={[styles.inboxIconContainer, { backgroundColor: isLocked ? '#f3f4f6' : '#eef2ff' }]}>
                                                        <Ionicons
                                                            name={isLocked ? "lock-closed-outline" : "folder-open-outline"}
                                                            size={22}
                                                            color={isLocked ? colors.textMuted : colors.accent}
                                                        />
                                                    </View>
                                                    <View style={styles.inboxInfo}>
                                                        <Text style={[styles.inboxTitle, isLocked && styles.inboxTitleDisabled]}>
                                                            {dayItem.displayTitle}
                                                        </Text>
                                                        <Text style={styles.inboxMeta}>
                                                            {isLocked 
                                                                ? `Unlocks: ${dayItem.unlockDate.toLocaleDateString()}`
                                                                : `${dayItem.tests.length} activities • ${dayItem.materials.length} materials`
                                                            }
                                                        </Text>
                                                    </View>
                                                    {!isLocked && (
                                                        <View style={styles.inboxBadges}>
                                                            {dayItem.pending > 0 && (
                                                                <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                                                                    <Text style={[styles.statusBadgeText, { color: '#d97706' }]}>
                                                                        {dayItem.pending} pending
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        );
    }

    // --- LEVEL 2: Inbox Activities Detail View (Tabbed UI) ---
    const handleOpenFile = async (fileUrl) => {
        if (!fileUrl) return;
        try {
            const url = fileUrl.startsWith('http') ? fileUrl : `${axios.defaults.baseURL || ''}${fileUrl}`;
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open file URL');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to open file');
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title={selectedInbox.displayTitle || selectedInbox.title}
                showBack
                backAction={() => {
                    setSelectedInbox(null);
                    setSearch('');
                }}
            />

            {/* View Mode Tabs (Scrollable Tab Selector matching web exactly!) */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                    {[
                        { id: 'upcoming', label: 'Upcoming', icon: 'flash-outline', color: '#ef4444' },
                        { id: 'submitted', label: 'Submitted', icon: 'document-text-outline', color: colors.accent },
                        { id: 'returned', label: 'Returned', icon: 'refresh-circle-outline', color: colors.warning },
                        { id: 'evaluated', label: 'Evaluated', icon: 'checkmark-done-circle-outline', color: colors.success },
                        { id: 'expired', label: 'Expired', icon: 'time-outline', color: colors.textMuted },
                        { id: 'material', label: 'Study Material', icon: 'book-outline', color: '#8b5cf6' },
                        { id: 'tools', label: 'Tools', icon: 'construct-outline', color: '#a855f7' },
                        { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', color: '#f59e0b' }
                    ].map(tab => {
                        const isActive = viewMode === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[styles.tabButton, isActive && { backgroundColor: `${tab.color}15`, borderColor: tab.color }]}
                                onPress={() => setViewMode(tab.id)}
                            >
                                <Ionicons name={tab.icon} size={15} color={isActive ? tab.color : colors.textSecondary} />
                                <Text style={[styles.tabButtonText, isActive && { color: tab.color, fontWeight: '700' }]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Content view depending on active viewMode tab */}
            {viewMode === 'tools' ? (
                /* --- TOOLS TAB --- */
                <ScrollView contentContainerStyle={styles.toolsContainer} showsVerticalScrollIndicator={false}>
                    <Text style={styles.tabSectionHeader}>Inbox Practice Tools</Text>
                    {[
                        { title: "Voice Recorder", icon: "mic-outline", screen: "VoiceRecorderPage", color: "#2563eb", bg: "#eff6ff" },
                        { title: "Video Recorder", icon: "videocam-outline", screen: "VideoRecorderPage", color: "#7c3aed", bg: "#f5f3ff" },
                        { title: "Screenshot Tool", icon: "camera-outline", screen: "ScreenshotToolPage", color: "#4f46e5", bg: "#eef2ff" },
                        { title: "Screen Recorder", icon: "play-circle-outline", screen: "ScreenRecorderPage", color: "#059669", bg: "#ecfdf5" },
                        { title: "Web-Calling Tool", icon: "call-outline", screen: "WebCallingPage", color: "#db2777", bg: "#fdf2f8" },
                        { title: "Notes Writing", icon: "create-outline", screen: "Notes", color: "#b45309", bg: "#fffbeb" }
                    ].map((tool, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.toolCard}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate(tool.screen, { inboxId: selectedInbox.id })}
                        >
                            <View style={[styles.toolIconContainer, { backgroundColor: tool.bg }]}>
                                <Ionicons name={tool.icon} size={22} color={tool.color} />
                            </View>
                            <View style={styles.toolInfo}>
                                <Text style={styles.toolTitle}>{tool.title}</Text>
                                <Text style={styles.toolDesc}>Record & upload practice logs for {selectedInbox.displayTitle}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            ) : viewMode === 'analytics' ? (
                /* --- ANALYTICS TAB --- */
                <ScrollView contentContainerStyle={styles.analyticsContainer} showsVerticalScrollIndicator={false}>
                    <Text style={styles.tabSectionHeader}>Inbox Completion Progress</Text>
                    <View style={styles.analyticsStatsRow}>
                        <View style={styles.analyticsStatBox}>
                            <Ionicons name="documents-outline" size={26} color={colors.accent} />
                            <Text style={styles.statBoxVal}>{selectedInbox.tests.length}</Text>
                            <Text style={styles.statBoxLabel}>Total Items</Text>
                        </View>
                        <View style={styles.analyticsStatBox}>
                            <Ionicons name="checkmark-done-circle-outline" size={26} color={colors.success} />
                            <Text style={styles.statBoxVal}>{selectedInbox.completed}</Text>
                            <Text style={styles.statBoxLabel}>Completed</Text>
                        </View>
                        <View style={styles.analyticsStatBox}>
                            <Ionicons name="time-outline" size={26} color="#f59e0b" />
                            <Text style={styles.statBoxVal}>{selectedInbox.pending}</Text>
                            <Text style={styles.statBoxLabel}>Pending</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressCard}>
                        <Text style={styles.progressCardTitle}>Inbox Completion Status</Text>
                        {selectedInbox.tests.length > 0 ? (
                            (() => {
                                const percent = Math.round((selectedInbox.completed / selectedInbox.tests.length) * 100);
                                return (
                                    <View style={{ marginTop: spacing.md }}>
                                        <View style={styles.progressBarWrapper}>
                                            <View style={[styles.progressBarFilled, { width: `${percent}%` }]} />
                                        </View>
                                        <Text style={styles.percentText}>{percent}% Completed</Text>
                                    </View>
                                );
                            })()
                        ) : (
                            <Text style={styles.percentText}>No activities to evaluate</Text>
                        )}
                    </View>
                </ScrollView>
            ) : (
                /* --- TESTS & STUDY MATERIALS LIST --- */
                <View style={{ flex: 1 }}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={`Search in ${selectedInbox.displayTitle}...`}
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search ? (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <FlatList
                        data={activeInboxActivities}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.activitiesList}
                        renderItem={({ item }) => {
                            const isMaterial = viewMode === 'material';
                            
                            if (isMaterial) {
                                return (
                                    <TouchableOpacity
                                        style={styles.activityCard}
                                        activeOpacity={0.7}
                                        onPress={() => handleOpenFile(item.fileUrl)}
                                    >
                                        <View style={[styles.activityIconCircle, { backgroundColor: '#f3e8ff' }]}>
                                            <Ionicons name="document" size={22} color="#8b5cf6" />
                                        </View>
                                        <View style={styles.activityInfo}>
                                            <Text style={styles.activityTitle} numberOfLines={2}>{item.title}</Text>
                                            <Text style={styles.activityMeta}>Document File • Click to view</Text>
                                        </View>
                                        <Ionicons name="download-outline" size={18} color="#8b5cf6" />
                                    </TouchableOpacity>
                                );
                            }

                            const sub = submissionMap.get(String(item._id));
                            const isCompleted = sub && (sub.status === 'evaluated' || sub.status === 'submitted');

                            return (
                                <TouchableOpacity
                                    style={styles.activityCard}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        if (isCompleted && sub) {
                                            navigation.navigate('ViewTestResult', { submissionId: sub._id });
                                        } else if (viewMode !== 'expired') {
                                            navigation.navigate('TakeTest', { testId: item._id });
                                        }
                                    }}
                                >
                                    <View style={[
                                        styles.activityIconCircle,
                                        { backgroundColor: isCompleted ? '#ecfdf5' : '#eef2ff' }
                                    ]}>
                                        <Ionicons
                                            name={isCompleted ? 'checkmark-circle' : 'document-text'}
                                            size={22}
                                            color={isCompleted ? colors.success : colors.accent}
                                        />
                                    </View>
                                    <View style={styles.activityInfo}>
                                        <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.activityMeta}>
                                            {item.subject} • {item.settings?.duration || '–'} mins
                                        </Text>
                                        {item.activity && (
                                            <View style={styles.activityBadgeRow}>
                                                <Badge label={item.activity} color={colors.accent} bg="#eef2ff" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.activityRight}>
                                        {isCompleted ? (
                                            <View>
                                                <Text style={styles.scoreText}>{sub?.totalScore ?? '–'}</Text>
                                                <Text style={styles.scoreLabel}>Score</Text>
                                            </View>
                                        ) : viewMode === 'expired' ? (
                                            <Badge label="Expired" color={colors.textMuted} bg="#f3f4f6" />
                                        ) : (
                                            <View style={styles.startBtn}>
                                                <Text style={styles.startBtnText}>Start</Text>
                                            </View>
                                        )}
                                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <EmptyState
                                icon="sparkles-outline"
                                title="All caught up!"
                                subtitle={`No activities found under ${viewMode.toUpperCase()}`}
                            />
                        }
                    />
                </View>
            )}
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
        margin: spacing.md,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSizes.md,
        color: colors.text,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    subjectSection: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        elevation: 1,
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        backgroundColor: colors.bgSecondary,
    },
    subjectTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    subjectTitle: {
        fontSize: fontSizes.sm + 1,
        fontWeight: '900',
        color: colors.text,
        textTransform: 'uppercase',
        flex: 1,
    },
    subjectCountCircle: {
        backgroundColor: colors.accent,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    subjectCountText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    inboxesList: {
        padding: spacing.sm,
        gap: spacing.xs,
    },
    inboxCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        padding: spacing.sm + 2,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    inboxCardDisabled: {
        opacity: 0.6,
    },
    inboxIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    inboxInfo: {
        flex: 1,
    },
    inboxTitle: {
        fontSize: fontSizes.md - 1,
        fontWeight: '700',
        color: colors.text,
    },
    inboxTitleDisabled: {
        color: colors.textMuted,
    },
    inboxMeta: {
        fontSize: fontSizes.xs - 1,
        color: colors.textMuted,
        marginTop: 1,
    },
    inboxBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    
    // Level 2 Tabbed Detail Styles
    tabsContainer: {
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingVertical: 8,
    },
    tabsScroll: {
        paddingHorizontal: spacing.md,
        gap: 6,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        backgroundColor: colors.bg,
    },
    tabButtonText: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '750',
        textTransform: 'uppercase',
    },
    tabSectionHeader: {
        fontSize: fontSizes.md - 1,
        fontWeight: 'bold',
        color: colors.text,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activitiesList: {
        paddingHorizontal: spacing.md,
        paddingBottom: 24,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    activityIconCircle: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: fontSizes.md - 1,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    activityMeta: {
        fontSize: fontSizes.xs - 1,
        color: colors.textMuted,
    },
    activityBadgeRow: {
        marginTop: 4,
        flexDirection: 'row',
    },
    activityRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    scoreText: {
        fontSize: fontSizes.md,
        fontWeight: '800',
        color: colors.success,
        textAlign: 'right',
    },
    scoreLabel: {
        fontSize: 9,
        color: colors.textMuted,
        textAlign: 'right',
    },
    startBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 5,
        borderRadius: borderRadius.sm,
    },
    startBtnText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Tools Tab Styles
    toolsContainer: {
        paddingBottom: 32,
    },
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        elevation: 1.5,
    },
    toolIconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    toolInfo: {
        flex: 1,
    },
    toolTitle: {
        fontSize: fontSizes.md - 1,
        fontWeight: '750',
        color: colors.text,
        marginBottom: 2,
    },
    toolDesc: {
        fontSize: fontSizes.xs - 1,
        color: colors.textMuted,
        lineHeight: 14,
    },

    // Analytics Tab Styles
    analyticsContainer: {
        paddingBottom: 32,
    },
    analyticsStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    analyticsStatBox: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        elevation: 1,
    },
    statBoxVal: {
        fontSize: fontSizes.xl + 2,
        fontWeight: '900',
        color: colors.text,
        marginTop: 6,
    },
    statBoxLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    progressCard: {
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        marginHorizontal: spacing.md,
        elevation: 1.5,
    },
    progressCardTitle: {
        fontSize: fontSizes.sm + 1,
        fontWeight: '800',
        color: colors.text,
    },
    progressBarWrapper: {
        height: 8,
        backgroundColor: colors.border,
        borderRadius: 4,
        overflow: 'hidden',
        width: '100%',
        marginBottom: 6,
    },
    progressBarFilled: {
        height: '100%',
        backgroundColor: colors.success,
    },
    percentText: {
        fontSize: fontSizes.xs,
        fontWeight: '700',
        color: colors.textSecondary,
    }
});

export default StudentTests;
