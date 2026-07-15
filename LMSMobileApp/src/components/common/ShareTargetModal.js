import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Image,
    Platform,
    StatusBar,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Custom dark colors to match WhatsApp dark mode exactly
const darkColors = {
    bg: '#0b141a', // WA chat screen dark background
    headerBg: '#1f2c34', // WA header dark
    cardBg: '#1f2c34',
    textMain: '#e9edef', // WA primary text
    textMuted: '#8696a0', // WA secondary text
    accent: '#00a884', // WA green theme color
    divider: '#222d34',
    searchBg: '#202c33',
    selectedBg: '#2a3942',
    white: '#ffffff',
    danger: '#f15c6d',
    previewCardBg: '#111b21',
};

const getYoutubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const ShareTargetModal = ({ visible, sharedText, onClose }) => {
    const { user } = useAuth();
    const { socket } = useSocket();

    const [activeTab, setActiveTab] = useState('lms'); // 'lms' | 'personal'
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Contact list states
    const [contacts, setContacts] = useState([]);
    const [recentChats, setRecentChats] = useState([]);
    const [personalContacts, setPersonalContacts] = useState([]);
    
    const [selectedContacts, setSelectedContacts] = useState([]); // Array of contact objects
    const [sending, setSending] = useState(false);

    // YouTube preview helpers
    const videoId = getYoutubeVideoId(sharedText);
    const hasYoutubePreview = !!videoId;

    // Load contacts and recent chats
    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch recent conversations (LMS)
            const recentRes = await axios.get('/messages/conversations/recent').catch(() => ({ data: [] }));
            setRecentChats(recentRes.data || []);

            // 2. Fetch directory based on role (LMS)
            let dirData = [];
            if (user.role === 'Teacher') {
                const res = await axios.get('/users/teacher-students').catch(() => ({ data: [] }));
                dirData = res.data || [];
            } else if (user.role === 'Student') {
                const res = await axios.get('/calls/teachers').catch(() => ({ data: [] }));
                dirData = res.data || [];
            } else if (user.role === 'Admin' || user.role === 'Editor' || user.role === 'Institute') {
                const res = await axios.get('/users').catch(() => ({ data: {} }));
                dirData = res.data?.users || res.data || [];
            }
            // Filter out current user
            const filteredDir = dirData.filter(u => u && u._id !== user._id);
            setContacts(filteredDir);

            // 3. Fetch personal / research contacts
            const personalRes = await axios.get('/research/contacts').catch(() => ({ data: [] }));
            setPersonalContacts(personalRes.data || []);
        } catch (error) {
            console.warn('[SHARE_TARGET] Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible && user) {
            loadData();
            setSelectedContacts([]);
            setSearchQuery('');
            setActiveTab('lms');
        }
    }, [visible, user]);

    const handleSelectContact = (contact, isPersonal) => {
        const isSelected = selectedContacts.some(c => c._id === contact._id);
        if (isSelected) {
            setSelectedContacts(prev => prev.filter(c => c._id !== contact._id));
        } else {
            setSelectedContacts(prev => [...prev, { ...contact, isPersonal }]);
        }
    };

    const handleSendShare = async () => {
        if (selectedContacts.length === 0) {
            Alert.alert('No contacts selected', 'Please select at least one contact to share the link.');
            return;
        }

        setSending(true);
        try {
            // Send to each selected contact in parallel
            await Promise.all(selectedContacts.map(async (contact) => {
                const contactId = contact._id;
                
                if (contact.isPersonal) {
                    // Send to personal contact endpoint
                    await axios.post('/research/messages', {
                        researchContact: contactId,
                        text: sharedText
                    });
                } else {
                    // Send to standard LMS messages endpoint
                    const { data } = await axios.post('/messages', {
                        receiver: contactId,
                        recipientId: contactId,
                        text: sharedText
                    });

                    // Emit socket event for live chat updates
                    if (socket && socket.connected) {
                        socket.emit('send-message', {
                            receiverId: contactId,
                            recipientId: contactId,
                            text: sharedText,
                            _id: data._id,
                            createdAt: data.createdAt,
                            sender: user._id
                        });
                    }
                }
            }));

            Toast.show({
                type: 'success',
                text1: 'Shared successfully',
                text2: `Sent to ${selectedContacts.length} contact(s)`
            });
            
            onClose();
        } catch (error) {
            console.error('[SHARE_TARGET] Share failed:', error);
            Alert.alert('Error', 'Failed to share the video link. Please try again.');
        } finally {
            setSending(false);
        }
    };

    // Filter lists based on search and active tab
    const getFilteredList = () => {
        const query = searchQuery.trim().toLowerCase();
        
        if (activeTab === 'personal') {
            // Filter Personal/Research contacts
            return personalContacts.filter(c => c && c.name?.toLowerCase().includes(query));
        } else {
            // Filter LMS contacts (Recents + Directory)
            const filteredRecents = recentChats
                .map(item => item.otherUser)
                .filter(u => u && u._id !== user?._id && u.name?.toLowerCase().includes(query));

            const filteredDir = contacts.filter(c => 
                c && c.name?.toLowerCase().includes(query) && 
                !filteredRecents.some(r => r._id === c._id)
            );

            return {
                recents: filteredRecents,
                directory: filteredDir
            };
        }
    };

    const filteredData = getFilteredList();

    // Prepare flat list items
    const getFlatListItems = () => {
        if (activeTab === 'personal') {
            return filteredData.map(c => ({ type: 'contact', data: c, isPersonal: true }));
        } else {
            const items = [];
            if (filteredData.recents?.length > 0) {
                items.push({ type: 'header', title: 'Frequently contacted' });
                filteredData.recents.forEach(c => items.push({ type: 'contact', data: c, isPersonal: false }));
            }
            if (filteredData.directory?.length > 0) {
                items.push({ type: 'header', title: 'Other contacts' });
                filteredData.directory.forEach(c => items.push({ type: 'contact', data: c, isPersonal: false }));
            }
            return items;
        }
    };

    const renderContactRow = (contact, isPersonal) => {
        if (!contact || !contact._id) return null;
        const isSelected = selectedContacts.some(c => c._id === contact._id);

        return (
            <TouchableOpacity
                key={contact._id}
                style={[styles.contactRow, isSelected && styles.selectedRow]}
                onPress={() => handleSelectContact(contact, isPersonal)}
                activeOpacity={0.8}
            >
                <View style={styles.avatarWrapper}>
                    <View style={[
                        styles.avatar,
                        { backgroundColor: isPersonal ? colors.accent : (contact.role === 'Teacher' ? colors.teacher : colors.student) }
                    ]}>
                        <Text style={styles.avatarText}>{contact.name[0]?.toUpperCase()}</Text>
                    </View>
                    {isSelected && (
                        <View style={styles.checkmarkBadge}>
                            <Ionicons name="checkmark" size={12} color="#ffffff" />
                        </View>
                    )}
                </View>

                <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactSub}>
                        {isPersonal ? 'Personal Contact' : (contact.role || 'LMS User')}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar backgroundColor={darkColors.headerBg} barStyle="light-content" />
                <SafeAreaView style={styles.safeArea}>
                    
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color={darkColors.textMain} />
                        </TouchableOpacity>
                        
                        <View style={styles.headerTitleArea}>
                            <Text style={styles.headerTitle}>
                                {selectedContacts.length > 0 
                                    ? `${selectedContacts.length} selected` 
                                    : 'Send to...'}
                            </Text>
                            {selectedContacts.length > 0 && (
                                <Text style={styles.headerSubtitle} numberOfLines={1}>
                                    {selectedContacts.map(c => c.name).join(', ')}
                                </Text>
                            )}
                        </View>

                        <View style={{ width: 24 }} />
                    </View>

                    {/* Sub-tabs selector for LMS vs Personal */}
                    <View style={styles.tabSelectorRow}>
                        <TouchableOpacity
                            style={[styles.tabBtn, activeTab === 'lms' && styles.activeTabBtn]}
                            onPress={() => {
                                setActiveTab('lms');
                                setSearchQuery('');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabBtnText, activeTab === 'lms' && styles.activeTabBtnText]}>
                                LMS CONTACTS
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.tabBtn, activeTab === 'personal' && styles.activeTabBtn]}
                            onPress={() => {
                                setActiveTab('personal');
                                setSearchQuery('');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabBtnText, activeTab === 'personal' && styles.activeTabBtnText]}>
                                PERSONAL CONTACTS
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={darkColors.textMuted} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={activeTab === 'personal' ? 'Search personal contacts...' : 'Search LMS contacts...'}
                            placeholderTextColor={darkColors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={darkColors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Scrollable Contact Lists */}
                    {loading && getFlatListItems().length === 0 ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={darkColors.accent} />
                        </View>
                    ) : (
                        <FlatList
                            data={getFlatListItems()}
                            keyExtractor={(item, index) => item.type === 'header' ? `header-${index}` : item.data._id}
                            contentContainerStyle={styles.listContainer}
                            renderItem={({ item }) => {
                                if (item.type === 'header') {
                                    return <Text style={styles.listHeader}>{item.title}</Text>;
                                }
                                return renderContactRow(item.data, item.isPersonal);
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="people-outline" size={48} color={darkColors.textMuted} />
                                    <Text style={styles.emptyText}>No contacts found</Text>
                                </View>
                            }
                        />
                    )}

                    {/* Bottom Preview and Actions */}
                    <View style={styles.footer}>
                        
                        {/* YouTube / Text Link Preview Card */}
                        <View style={styles.previewCard}>
                            {hasYoutubePreview ? (
                                <View style={styles.youtubeRow}>
                                    <Image 
                                        source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
                                        style={styles.thumbnail}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.youtubeMeta}>
                                        <Text style={styles.youtubeTitle} numberOfLines={1}>YouTube Video Link</Text>
                                        <Text style={styles.youtubeUrl} numberOfLines={2}>{sharedText}</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.plainPreviewText} numberOfLines={3}>{sharedText}</Text>
                            )}
                        </View>

                        {/* Send Panel */}
                        <View style={styles.sendPanel}>
                            <View style={styles.sendNamesWrapper}>
                                <Text style={styles.sendNamesText} numberOfLines={1}>
                                    {selectedContacts.length > 0 
                                        ? selectedContacts.map(c => c.name).join(', ') 
                                        : 'Select contacts'}
                                </Text>
                            </View>

                            {sending ? (
                                <View style={styles.sendBtnLoading}>
                                    <ActivityIndicator size="small" color="#ffffff" />
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={[
                                        styles.sendBtn, 
                                        selectedContacts.length === 0 && styles.sendBtnDisabled
                                    ]}
                                    onPress={handleSendShare}
                                    disabled={selectedContacts.length === 0}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="send" size={20} color="#ffffff" />
                                </TouchableOpacity>
                            )}
                        </View>

                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: darkColors.bg,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: darkColors.headerBg,
        paddingHorizontal: spacing.sm,
        height: 60,
    },
    iconBtn: {
        padding: spacing.sm,
    },
    headerTitleArea: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: darkColors.textMain,
    },
    headerSubtitle: {
        fontSize: 12,
        color: darkColors.textMuted,
        marginTop: 2,
    },
    tabSelectorRow: {
        flexDirection: 'row',
        backgroundColor: darkColors.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: darkColors.divider,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTabBtn: {
        borderBottomColor: darkColors.accent,
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: darkColors.textMuted,
        letterSpacing: 0.5,
    },
    activeTabBtnText: {
        color: darkColors.accent,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: darkColors.searchBg,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        height: 40,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: darkColors.textMain,
        paddingVertical: 0,
    },
    listContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: 220, // Keep space for footer preview card
    },
    listHeader: {
        fontSize: 13,
        fontWeight: 'bold',
        color: darkColors.textMuted,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        letterSpacing: 0.5,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: darkColors.divider,
    },
    selectedRow: {
        backgroundColor: 'rgba(0, 168, 132, 0.08)',
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: spacing.md,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: darkColors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    checkmarkBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: darkColors.accent,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: darkColors.bg,
    },
    contactDetails: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: darkColors.textMain,
    },
    contactSub: {
        fontSize: 12,
        color: darkColors.textMuted,
        marginTop: 2,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        marginTop: spacing.sm,
        color: darkColors.textMuted,
        fontSize: 15,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: darkColors.headerBg,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: darkColors.divider,
    },
    previewCard: {
        backgroundColor: darkColors.previewCardBg,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    youtubeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbnail: {
        width: 80,
        height: 60,
        borderRadius: borderRadius.sm,
        marginRight: spacing.sm,
    },
    youtubeMeta: {
        flex: 1,
    },
    youtubeTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: darkColors.textMain,
    },
    youtubeUrl: {
        fontSize: 11,
        color: darkColors.textMuted,
        marginTop: 2,
    },
    plainPreviewText: {
        fontSize: 13,
        color: darkColors.textMain,
        lineHeight: 18,
    },
    sendPanel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sendNamesWrapper: {
        flex: 1,
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    sendNamesText: {
        fontSize: 15,
        color: darkColors.textMain,
        fontWeight: '600',
    },
    sendBtn: {
        backgroundColor: darkColors.accent,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    sendBtnDisabled: {
        backgroundColor: '#555',
        opacity: 0.5,
    },
    sendBtnLoading: {
        backgroundColor: darkColors.accent,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.7,
    },
});
