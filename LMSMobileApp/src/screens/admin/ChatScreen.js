import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Modal, TextInput, KeyboardAvoidingView,
    Platform, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, EmptyState } from '../../components/common/UIComponents';

const ChatScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { callUser, onlineUsers, socket } = useSocket();
    
    const [directory, setDirectory] = useState([]);
    const [recentChats, setRecentChats] = useState([]);
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'directory'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Chat modal states
    const [activeContact, setActiveContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isPeerTyping, setIsPeerTyping] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null);
    const chatScrollViewRef = useRef(null);

    const handleCloseChat = () => {
        if (socket && socket.connected && activeContact) {
            socket.emit('stop-typing', { targetId: activeContact._id });
        }
        setActiveContact(null);
        setChatMessages([]);
        setIsPeerTyping(false);
        setRequestStatus(null);
    };

    const fetchData = async () => {
        try {
            // Aggregated directory for Admin
            const [usersRes, recentChatsRes] = await Promise.all([
                axios.get('/users').catch(() => ({ data: [] })),
                axios.get('/messages/conversations/recent').catch(() => ({ data: [] }))
            ]);
            
            // Filter out current user from directory
            const allUsers = (usersRes.data?.users || usersRes.data || []).filter(u => u._id !== user?._id);
            setDirectory(allUsers);
            setRecentChats(recentChatsRes.data || []);
        } catch (e) {
            console.error('[CHAT_SCREEN] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Listen for incoming messages and typing alerts
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg) => {
            const isFromActive = activeContact && (msg.sender === activeContact._id || msg.sender?._id === activeContact._id);
            if (isFromActive) {
                setChatMessages(prev => [...prev, msg]);
                axios.post(`/messages/read/${msg._id}`).catch(() => {});
            } else {
                fetchData();
            }
        };

        const handleTyping = ({ senderId }) => {
            if (activeContact && senderId === activeContact._id) {
                setIsPeerTyping(true);
            }
        };

        const handleStopTyping = ({ senderId }) => {
            if (activeContact && senderId === activeContact._id) {
                setIsPeerTyping(false);
            }
        };

        socket.on('chat-message', handleNewMessage);
        socket.on('typing', handleTyping);
        socket.on('stop-typing', handleStopTyping);

        return () => {
            socket.off('chat-message', handleNewMessage);
            socket.off('typing', handleTyping);
            socket.off('stop-typing', handleStopTyping);
        };
    }, [socket, activeContact]);

    const loadChatHistory = async (contact) => {
        setActiveContact(contact);
        setLoading(true);
        try {
            // Check status of chat request first
            const statusRes = await axios.get(`/chat/request/status/${contact._id}`);
            setRequestStatus(statusRes.data);

            const { data } = await axios.get(`/messages/${contact._id}`);
            setChatMessages(data || []);
            // Mark conversation messages as read
            await axios.post(`/messages/read-all/${contact._id}`).catch(() => {});
        } catch (err) {
            console.error('Failed to load chat history:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async () => {
        if (!activeContact) return;
        try {
            setLoading(true);
            await axios.post('/chat/request', { receiverId: activeContact._id });
            Alert.alert('Request Sent', 'Chat request successfully sent!');
            const statusRes = await axios.get(`/chat/request/status/${activeContact._id}`);
            setRequestStatus(statusRes.data);
        } catch (err) {
            console.error('Failed to send request:', err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to send request');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!activeContact || !requestStatus?.request?._id) return;
        try {
            setLoading(true);
            await axios.put(`/chat/request/${requestStatus.request._id}/accept`);
            Alert.alert('Accepted', 'Chat request accepted!');
            const statusRes = await axios.get(`/chat/request/status/${activeContact._id}`);
            setRequestStatus(statusRes.data);
        } catch (err) {
            console.error('Failed to accept request:', err);
            Alert.alert('Error', 'Failed to accept request');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectRequest = async () => {
        if (!activeContact || !requestStatus?.request?._id) return;
        try {
            setLoading(true);
            await axios.put(`/chat/request/${requestStatus.request._id}/reject`);
            Alert.alert('Rejected', 'Chat request rejected');
            const statusRes = await axios.get(`/chat/request/status/${activeContact._id}`);
            setRequestStatus(statusRes.data);
        } catch (err) {
            console.error('Failed to reject request:', err);
            Alert.alert('Error', 'Failed to reject request');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !activeContact) return;
        
        const tempText = chatInput.trim();
        setChatInput('');
        try {
            const { data } = await axios.post('/messages', {
                recipientId: activeContact._id,
                text: tempText
            });
            setChatMessages(prev => [...prev, data]);
            
            // Emit socket message for instant updates
            if (socket && socket.connected) {
                socket.emit('chat-message', {
                    recipientId: activeContact._id,
                    message: data
                });
            }
            fetchData();
        } catch (err) {
            Alert.alert('Send Failure', 'Message send failed.');
        }
    };

    const isUserOnline = (userId) => {
        return onlineUsers.some(u => u.userId === userId);
    };

    const handleCall = (contact, type) => {
        if (!isUserOnline(contact._id)) {
            Alert.alert('Offline', `${contact.name} is currently offline.`);
            return;
        }
        callUser(contact._id, contact.name, contact.role, type);
    };

    const filteredDirectory = directory.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderContactCard = ({ item }) => {
        const online = isUserOnline(item._id);
        return (
            <TouchableOpacity 
                style={styles.contactCard} 
                onPress={() => loadChatHistory(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.avatar, { backgroundColor: item.role === 'Teacher' ? colors.teacher : colors.student }]}>
                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                    {online && <View style={styles.onlineIndicator} />}
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactRole}>{item.role}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleCall(item, 'audio')} style={styles.callIcon}>
                        <Ionicons name="call-outline" size={20} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleCall(item, 'video')} style={styles.callIcon}>
                        <Ionicons name="videocam-outline" size={20} color={colors.success} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Chat & Calls" />
            
            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'chats' && styles.tabActive]} 
                    onPress={() => setActiveTab('chats')}
                >
                    <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'directory' && styles.tabActive]} 
                    onPress={() => setActiveTab('directory')}
                >
                    <Text style={[styles.tabText, activeTab === 'directory' && styles.tabTextActive]}>Directory</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {activeTab === 'chats' ? (
                <FlatList
                    data={recentChats}
                    keyExtractor={(item, index) => item._id || item.otherUser?._id || String(index)}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    renderItem={({ item }) => {
                        const contact = item.otherUser;
                        if (!contact) return null;
                        const online = isUserOnline(contact._id);
                        return (
                            <TouchableOpacity 
                                style={styles.chatThread} 
                                onPress={() => loadChatHistory(contact)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.avatar, { backgroundColor: contact.role === 'Teacher' ? colors.teacher : colors.student }]}>
                                    <Text style={styles.avatarText}>{contact.name?.[0]?.toUpperCase()}</Text>
                                    {online && <View style={styles.onlineIndicator} />}
                                </View>
                                <View style={styles.threadInfo}>
                                    <Text style={styles.threadName}>{contact.name}</Text>
                                    <Text style={styles.threadMsg} numberOfLines={1}>
                                        {item.lastMessage?.text || 'Sent an attachment'}
                                    </Text>
                                </View>
                                {item.unreadCount > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={<EmptyState title="No Conversations" subtitle="Go to the directory tab to start a new chat." />}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search contacts..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <FlatList
                        data={filteredDirectory}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.list}
                        renderItem={renderContactCard}
                        ListEmptyComponent={<EmptyState title="No Contacts" subtitle="No users found matching search query." />}
                    />
                </View>
            )}

            {/* Live Chat Messaging Modal */}
            <Modal
                visible={!!activeContact}
                animationType="slide"
                onRequestClose={handleCloseChat}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: colors.bg }}
                >
                    <View style={styles.chatHeader}>
                        <TouchableOpacity onPress={handleCloseChat} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.chatTitleArea}>
                            <Text style={styles.chatTitleName}>{activeContact?.name}</Text>
                            <Text style={styles.chatTitleRole}>
                                {activeContact && isUserOnline(activeContact._id) ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                        {requestStatus?.status === 'accepted' && (
                            <View style={styles.chatActions}>
                                <TouchableOpacity onPress={() => handleCall(activeContact, 'audio')} style={styles.callIcon}>
                                    <Ionicons name="call-outline" size={20} color={colors.accent} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleCall(activeContact, 'video')} style={styles.callIcon}>
                                    <Ionicons name="videocam-outline" size={20} color={colors.success} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {requestStatus && requestStatus.status !== 'accepted' ? (
                        <View style={styles.requestContainer}>
                            <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textMuted} />
                            
                            {requestStatus.status === 'none' && (
                                <View style={styles.requestContent}>
                                    <Text style={styles.requestTitle}>Chat Request Required</Text>
                                    <Text style={styles.requestDesc}>
                                        You need to send a chat request to {activeContact?.name} before you can start messaging.
                                    </Text>
                                    <TouchableOpacity style={styles.requestBtn} onPress={handleSendRequest}>
                                        <Text style={styles.requestBtnText}>Send Chat Request</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {requestStatus.status === 'pending' && (
                                <View style={styles.requestContent}>
                                    {requestStatus.request?.sender === user?._id ? (
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={styles.requestTitle}>Request Pending</Text>
                                            <Text style={styles.requestDesc}>
                                                Your chat request to {activeContact?.name} is pending review. You will be able to chat once they accept.
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={styles.requestTitle}>Received Chat Request</Text>
                                            <Text style={styles.requestDesc}>
                                                {activeContact?.name} wants to start a chat with you.
                                            </Text>
                                            <View style={styles.requestActionsRow}>
                                                <TouchableOpacity style={[styles.requestBtn, { backgroundColor: colors.success }]} onPress={handleAcceptRequest}>
                                                    <Text style={styles.requestBtnText}>Accept</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.requestBtn, { backgroundColor: colors.danger }]} onPress={handleRejectRequest}>
                                                    <Text style={styles.requestBtnText}>Reject</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {requestStatus.status === 'rejected' && (
                                <View style={styles.requestContent}>
                                    <Text style={styles.requestTitle}>Request Rejected</Text>
                                    <Text style={styles.requestDesc}>
                                        The chat request was rejected.
                                    </Text>
                                    {requestStatus.canRequest ? (
                                        <TouchableOpacity style={styles.requestBtn} onPress={handleSendRequest}>
                                            <Text style={styles.requestBtnText}>Try Sending Again</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={[styles.requestDesc, { fontStyle: 'italic', marginTop: 10 }]}>
                                            You can try sending another request in a few hours.
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    ) : (
                        <>
                            <ScrollView
                                ref={chatScrollViewRef}
                                style={styles.messagesScroll}
                                contentContainerStyle={styles.messagesContent}
                                onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                            >
                                {chatMessages.map((msg, index) => {
                                    const isMe = msg.sender === user?._id || msg.sender?._id === user?._id;
                                    return (
                                        <View 
                                            key={msg._id || msg.tempId || `msg-${index}`} 
                                            style={[
                                                styles.messageBubble, 
                                                isMe ? styles.messageBubbleMe : styles.messageBubblePeer
                                            ]}
                                        >
                                            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextPeer]}>
                                                {msg.text}
                                            </Text>
                                        </View>
                                    );
                                })}
                                {isPeerTyping && (
                                    <Text style={styles.typingText}>{activeContact?.name} is typing...</Text>
                                )}
                            </ScrollView>

                            <View style={styles.inputArea}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type a message..."
                                    placeholderTextColor={colors.textMuted}
                                    value={chatInput}
                                    onChangeText={setChatInput}
                                />
                                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                                    <Ionicons name="send" size={20} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    tabs: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    requestContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.bg,
    },
    requestContent: {
        alignItems: 'center',
        marginTop: spacing.md,
        width: '100%',
    },
    requestTitle: {
        fontSize: fontSizes.lg,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    requestDesc: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    requestBtn: {
        backgroundColor: colors.accent,
        paddingVertical: 12,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
    },
    requestBtnText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: 'bold',
    },
    requestActionsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    tab: {
        flex: 1,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.accent,
    },
    tabText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '500' },
    tabTextActive: { color: colors.accent, fontWeight: 'bold' },
    list: { padding: spacing.md },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    avatarText: { fontSize: fontSizes.md + 2, fontWeight: '800', color: colors.white },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: colors.bgCard,
    },
    contactInfo: { flex: 1 },
    contactName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    contactRole: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
    actions: { flexDirection: 'row', gap: 12 },
    callIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    chatThread: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    threadInfo: { flex: 1 },
    threadName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    threadMsg: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    unreadBadge: {
        backgroundColor: colors.accent,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: { fontSize: 10, fontWeight: 'bold', color: colors.white },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgCard,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    
    // Chat Header Modal
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingTop: Platform.OS === 'ios' ? 44 : 12,
        paddingBottom: 12,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    chatTitleArea: { flex: 1 },
    chatTitleName: { fontSize: fontSizes.md + 2, fontWeight: '800', color: colors.text },
    chatTitleRole: { fontSize: 10, color: colors.success, fontWeight: '600', marginTop: 1 },
    chatActions: { flexDirection: 'row', gap: 10 },
    messagesScroll: { flex: 1, padding: spacing.md },
    messagesContent: { paddingBottom: 24 },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: borderRadius.lg,
        marginBottom: 8,
    },
    messageBubbleMe: {
        alignSelf: 'flex-end',
        backgroundColor: colors.accent,
        borderBottomRightRadius: 2,
    },
    messageBubblePeer: {
        alignSelf: 'flex-start',
        backgroundColor: colors.bgCard,
        borderBottomLeftRadius: 2,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    messageText: { fontSize: fontSizes.md },
    messageTextMe: { color: colors.white },
    messageTextPeer: { color: colors.text },
    typingText: { fontSize: fontSizes.xs, color: colors.textMuted, fontStyle: 'italic', alignSelf: 'flex-start', marginLeft: 8 },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.bgCard,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        height: 44,
        color: colors.text,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ChatScreen;
