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
    Share,
    Alert,
    SafeAreaView,
    Platform
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export const ShareModal = ({ visible, onClose, shareData }) => {
    const { user } = useAuth();
    const { socket } = useSocket();

    const [activeTab, setActiveTab] = useState('personal'); // 'personal' (recents) | 'all' (directory)
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [recents, setRecents] = useState([]);
    const [directory, setDirectory] = useState([]);
    const [sendingStatus, setSendingStatus] = useState({}); // { [contactId]: 'idle' | 'sending' | 'sent' }

    // Fetch conversations and contacts
    const fetchContacts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch recent conversations
            const recentRes = await axios.get('/messages/conversations/recent').catch(() => ({ data: [] }));
            setRecents(recentRes.data || []);

            // Fetch directory based on role
            let dirData = [];
            if (user.role === 'Teacher') {
                const res = await axios.get('/users/teacher-students').catch(() => ({ data: [] }));
                dirData = res.data || [];
            } else if (user.role === 'Student') {
                const res = await axios.get('/calls/teachers').catch(() => ({ data: [] }));
                dirData = res.data || [];
            } else if (user.role === 'Admin') {
                const res = await axios.get('/users').catch(() => ({ data: {} }));
                dirData = res.data?.users || res.data || [];
            }
            // Filter out current user from directory
            const filteredDir = dirData.filter(u => u && u._id !== user._id);
            setDirectory(filteredDir);
        } catch (error) {
            console.warn('[SHARE_MODAL] Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible && user) {
            fetchContacts();
            setSendingStatus({});
            setSearchQuery('');
        }
    }, [visible, user]);

    // Handle send event
    const handleSend = async (contact) => {
        if (!contact || !contact._id) return;
        
        const contactId = contact._id;
        setSendingStatus(prev => ({ ...prev, [contactId]: 'sending' }));

        try {
            let resMessage;
            if (shareData.type === 'file') {
                // Send file message
                const { data } = await axios.post('/messages', {
                    receiver: contactId,
                    recipientId: contactId,
                    text: shareData.message || '',
                    fileUrl: shareData.fileUrl,
                    fileName: shareData.fileName || 'file',
                    fileType: shareData.fileType || 'file'
                });
                resMessage = data;
            } else {
                // Send text/link message
                const { data } = await axios.post('/messages', {
                    receiver: contactId,
                    recipientId: contactId,
                    text: shareData.text || shareData.message || ''
                });
                resMessage = data;
            }

            // Emit socket message for real-time delivery
            if (socket && socket.connected) {
                socket.emit('chat-message', {
                    receiver: contactId,
                    recipientId: contactId,
                    message: resMessage
                });
            }

            setSendingStatus(prev => ({ ...prev, [contactId]: 'sent' }));
            Toast.show({
                type: 'success',
                text1: 'Shared',
                text2: `Successfully shared with ${contact.name}`
            });
        } catch (error) {
            console.warn('[SHARE_MODAL] Send failed:', error);
            setSendingStatus(prev => ({ ...prev, [contactId]: 'idle' }));
            Alert.alert('Error', 'Failed to share message. Please try again.');
        }
    };

    // System share fallback
    const handleSystemShare = async () => {
        try {
            let messageContent = '';
            if (shareData.type === 'file') {
                messageContent = shareData.fileUrl;
            } else {
                messageContent = shareData.text || shareData.message || '';
            }

            await Share.share({
                message: messageContent,
                url: shareData.type === 'file' ? shareData.fileUrl : undefined,
                title: shareData.fileName || 'Shared Link'
            });
        } catch (error) {
            console.warn('[SHARE_MODAL] Native share error:', error);
        }
    };

    // Filter contacts based on search query
    const getFilteredList = () => {
        if (activeTab === 'personal') {
            // Filter recents
            return recents.filter(item => {
                const contact = item.otherUser;
                if (!contact || !contact.name) return false;
                return contact.name.toLowerCase().includes(searchQuery.toLowerCase());
            });
        } else {
            // Filter directory
            return directory.filter(contact => {
                if (!contact || !contact.name) return false;
                return contact.name.toLowerCase().includes(searchQuery.toLowerCase());
            });
        }
    };

    const renderContactItem = ({ item }) => {
        const contact = activeTab === 'personal' ? item.otherUser : item;
        if (!contact || !contact.name) return null;

        const status = sendingStatus[contact._id] || 'idle';

        return (
            <View style={styles.contactItem}>
                <View style={[
                    styles.avatar,
                    { backgroundColor: contact.role === 'Teacher' ? colors.teacher : colors.student }
                ]}>
                    <Text style={styles.avatarText}>{contact.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRole}>{contact.role || 'Contact'}</Text>
                </View>

                {status === 'idle' && (
                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => handleSend(contact)}
                    >
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                )}

                {status === 'sending' && (
                    <View style={styles.sendingContainer}>
                        <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                )}

                {status === 'sent' && (
                    <View style={[styles.sendButton, styles.sentButton]}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.white} style={{ marginRight: 2 }} />
                        <Text style={styles.sendButtonText}>Sent</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.container}>
                        {/* Modal Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.title}>Send to</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {/* Search Input */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search contacts..."
                                placeholderTextColor={colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabsContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
                                onPress={() => setActiveTab('personal')}
                            >
                                <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
                                    Recent Chats
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                                onPress={() => setActiveTab('all')}
                            >
                                <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                                    All Contacts
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Loading / List */}
                        {loading && getFilteredList().length === 0 ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color={colors.accent} />
                            </View>
                        ) : (
                            <FlatList
                                data={getFilteredList()}
                                renderItem={renderContactItem}
                                keyExtractor={(item, index) => {
                                    const contact = activeTab === 'personal' ? item.otherUser : item;
                                    return contact?._id || String(index);
                                }}
                                contentContainerStyle={styles.listContainer}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                                        <Text style={styles.emptyText}>No contacts found</Text>
                                    </View>
                                }
                            />
                        )}

                        {/* System Share Fallback Footer */}
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.systemShareButton} onPress={handleSystemShare}>
                                <Ionicons name="share-social-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
                                <Text style={styles.systemShareText}>Share to other apps</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    safeArea: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.bg,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        height: '80%',
        width: '100%',
        paddingBottom: Platform.OS === 'ios' ? 12 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
    },
    closeBtn: {
        padding: spacing.xs,
    },
    title: {
        fontSize: fontSizes.lg,
        fontWeight: 'bold',
        color: colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        height: 44,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSizes.md,
        color: colors.text,
        paddingVertical: 0,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bgCard,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: colors.accent,
    },
    tabText: {
        fontSize: fontSizes.md,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: colors.accent,
        fontWeight: 'bold',
    },
    listContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: 'bold',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: fontSizes.md,
        fontWeight: '600',
        color: colors.text,
    },
    contactRole: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    sendButton: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        minWidth: 64,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    sentButton: {
        backgroundColor: colors.success,
    },
    sendButtonText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: 'bold',
    },
    sendingContainer: {
        minWidth: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        marginTop: spacing.sm,
        color: colors.textMuted,
        fontSize: fontSizes.md,
    },
    footer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgCard,
    },
    systemShareButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    systemShareText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: 'bold',
    },
});
