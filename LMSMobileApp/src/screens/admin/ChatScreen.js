import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Modal, TextInput, KeyboardAvoidingView,
    Platform, ActivityIndicator, ScrollView, Alert, Image, StatusBar
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, EmptyState } from '../../components/common/UIComponents';
import * as DocumentPicker from 'expo-document-picker';
import { BASE_URL } from '../../config/api';
import { CameraView, Camera } from 'expo-camera';
import { ImagePreviewModal } from '../../components/common/ImagePreviewModal';

const ChatScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { callUser, onlineUsers, socket } = useSocket();
    
    const [directory, setDirectory] = useState([]);
    const [recentChats, setRecentChats] = useState([]);
    const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'chats'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contactType, setContactType] = useState('LMS'); // 'LMS' | 'Personal'
    const [personalContacts, setPersonalContacts] = useState([]);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showCreateContact, setShowCreateContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');

    // Chat modal states
    const [activeContact, setActiveContact] = useState(null);
    const [previewImageUrl, setPreviewImageUrl] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isPeerTyping, setIsPeerTyping] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraFacing, setCameraFacing] = useState('back');
    const [cameraFlash, setCameraFlash] = useState('off');
    const chatScrollViewRef = useRef(null);
    const cameraRef = useRef(null);

    const handleCloseChat = () => {
        if (socket && socket.connected && activeContact) {
            socket.emit('stop-typing', { targetId: activeContact._id });
        }
        setActiveContact(null);
        setChatMessages([]);
        setIsPeerTyping(false);
        setRequestStatus(null);
        setShowEmojiPicker(false);
        setShowCamera(false);
    };

    const loadPersonalChatHistory = async (contact) => {
        setActiveContact(contact);
        setLoading(true);
        try {
            const { data } = await axios.get(`/research/messages/${contact._id}`);
            setChatMessages(data || []);
            setRequestStatus({ status: 'accepted' });
        } catch (err) {
            console.error('Failed to load personal messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePersonalContact = async () => {
        if (!newContactName.trim()) return;
        try {
            setLoading(true);
            await axios.post('/research/contacts', { name: newContactName.trim() });
            setNewContactName('');
            setShowCreateContact(false);
            Alert.alert('Success', 'Personal contact created successfully!');
            fetchData();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to create personal contact');
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            // Aggregated directory for Admin
            const [usersRes, recentChatsRes, researchRes] = await Promise.all([
                axios.get('/users').catch(() => ({ data: [] })),
                axios.get('/messages/conversations/recent').catch(() => ({ data: [] })),
                axios.get('/research/contacts').catch(() => ({ data: [] }))
            ]);
            
            // Filter out current user from directory
            const allUsers = (usersRes.data?.users || usersRes.data || []).filter(u => u._id !== user?._id);
            setDirectory(allUsers);
            setRecentChats(recentChatsRes.data || []);
            setPersonalContacts(researchRes.data || []);
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
            if (contactType === 'Personal') {
                const { data } = await axios.post('/research/messages', {
                    researchContact: activeContact._id,
                    text: tempText
                });
                setChatMessages(prev => [...prev, data]);
            } else {
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
            }
            fetchData();
        } catch (err) {
            Alert.alert('Send Failure', 'Message send failed.');
        }
    };

    const uploadAttachment = async (uri, name, mimeType) => {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                name: name || 'file',
                type: mimeType || 'image/jpeg',
            });
            const { data } = await axios.post('/chat/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return data; // returns { fileUrl, fileName, fileType }
        } catch (err) {
            console.error('File upload failed:', err);
            throw err;
        }
    };

    const handleSendFile = async (uri, name, mimeType) => {
        try {
            setLoading(true);
            const uploadRes = await uploadAttachment(uri, name, mimeType);
            
            let data;
            if (contactType === 'Personal') {
                const res = await axios.post('/research/messages', {
                    researchContact: activeContact._id,
                    text: '',
                    fileUrl: uploadRes.fileUrl,
                    fileName: uploadRes.fileName,
                    fileType: uploadRes.fileType
                });
                data = res.data;
            } else {
                const res = await axios.post('/messages', {
                    recipientId: activeContact._id,
                    text: '',
                    fileUrl: uploadRes.fileUrl,
                    fileName: uploadRes.fileName,
                    fileType: uploadRes.fileType
                });
                data = res.data;
                
                // Emit socket message for instant updates
                if (socket && socket.connected) {
                    socket.emit('chat-message', {
                        recipientId: activeContact._id,
                        message: data
                    });
                }
            }
            
            setChatMessages(prev => [...prev, data]);
            fetchData();
        } catch (err) {
            Alert.alert('Upload Error', 'Failed to upload and send file.');
        } finally {
            setLoading(false);
        }
    };

    const handlePickCamera = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
            return;
        }
        setShowCamera(true);
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const options = { quality: 0.8, skipProcessing: false };
                const photo = await cameraRef.current.takePictureAsync(options);
                if (photo && photo.uri) {
                    const fileName = photo.uri.split('/').pop() || 'photo.jpg';
                    handleSendFile(photo.uri, fileName, 'image/jpeg');
                    setShowCamera(false);
                }
            } catch (err) {
                console.error('Failed to take picture:', err);
                Alert.alert('Error', 'Failed to take photo.');
            }
        }
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                handleSendFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
            }
        } catch (err) {
            console.error('Document picker error:', err);
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
            {/* Custom Header with dropdown selector pill */}
            <View style={styles.customHeader}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                    <Text style={styles.headerTitleText}>Messages</Text>
                    
                    <View style={{ zIndex: 10, position: 'relative' }}>
                        <TouchableOpacity 
                            style={styles.pillButton} 
                            onPress={() => setShowTypeDropdown(prev => !prev)}
                        >
                            <Text style={styles.pillButtonText}>
                                {contactType === 'LMS' ? 'LMS Contact' : 'Personal Contact'}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color="#555" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>

                        {showTypeDropdown && (
                            <View style={styles.dropdownMenu}>
                                <TouchableOpacity 
                                    style={[styles.dropdownItem, contactType === 'LMS' && styles.dropdownItemActive]} 
                                    onPress={() => {
                                        setContactType('LMS');
                                        setShowTypeDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, contactType === 'LMS' && styles.dropdownTextActive]}>LMS Contact</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.dropdownItem, contactType === 'Personal' && styles.dropdownItemActive]} 
                                    onPress={() => {
                                        setContactType('Personal');
                                        setShowTypeDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, contactType === 'Personal' && styles.dropdownTextActive]}>Personal Contact</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {contactType === 'Personal' ? (
                <View style={{ flex: 1 }}>
                    {/* Search box */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search conversations..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Create Contact pill */}
                    <TouchableOpacity 
                        style={styles.createContactPillBtn} 
                        onPress={() => setShowCreateContact(true)}
                    >
                        <Text style={styles.createContactPillBtnText}>+ CREATE CONTACT</Text>
                    </TouchableOpacity>

                    <FlatList
                        data={personalContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.chatThread} 
                                onPress={() => loadPersonalChatHistory(item)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                                </View>
                                <View style={styles.threadInfo}>
                                    <Text style={styles.threadName}>{item.name}</Text>
                                    <Text style={styles.threadMsg} numberOfLines={1}>
                                        {item.lastMessage?.text || (item.lastMessage?.fileUrl ? 'Attachment' : 'No messages yet')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <EmptyState 
                                title="No research contacts found" 
                                subtitle="Create one above to start." 
                            />
                        }
                    />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Tabs */}
                    <View style={styles.tabs}>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'directory' && styles.tabActive]} 
                            onPress={() => setActiveTab('directory')}
                        >
                            <Text style={[styles.tabText, activeTab === 'directory' && styles.tabTextActive]}>Directory</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'chats' && styles.tabActive]} 
                            onPress={() => setActiveTab('chats')}
                        >
                            <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
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
                </View>
            )}

            {/* Create Personal Contact Modal */}
            <Modal visible={showCreateContact} transparent animationType="fade" onRequestClose={() => setShowCreateContact(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreateContact(false)}>
                    <View style={styles.createContactCard} onStartShouldSetResponder={() => true}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.modalTitle}>Create personal Contact</Text>
                            <TouchableOpacity onPress={() => setShowCreateContact(false)}>
                                <Ionicons name="close" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>Create a personal space for your research notes and records.</Text>
                        
                        <View style={{ marginVertical: 16 }}>
                            <Text style={styles.modalInputLabel}>CONTACT NAME</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. My Math Notes, Voice Diary..."
                                placeholderTextColor="#999"
                                value={newContactName}
                                onChangeText={setNewContactName}
                            />
                        </View>

                        <TouchableOpacity style={styles.saveContactBtn} onPress={handleCreatePersonalContact}>
                            <Text style={styles.saveContactBtnText}>SAVE CONTACT</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Live Chat Messaging Modal */}
            <Modal
                visible={!!activeContact}
                animationType="slide"
                onRequestClose={handleCloseChat}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: '#efeae2' }}
                >
                    <View style={styles.chatHeader}>
                        <TouchableOpacity onPress={handleCloseChat} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#ffffff" />
                            <View style={styles.chatHeaderAvatar}>
                                <Text style={styles.chatHeaderAvatarText}>{activeContact?.name?.[0]?.toUpperCase()}</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.chatTitleArea}>
                            <Text style={styles.chatTitleName}>{activeContact?.name}</Text>
                            <Text style={styles.chatTitleRole}>
                                {activeContact && isUserOnline(activeContact._id) ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                        {requestStatus?.status === 'accepted' && (
                            <View style={styles.chatActions}>
                                <TouchableOpacity onPress={() => handleCall(activeContact, 'video')} style={{ paddingHorizontal: 6 }}>
                                    <Ionicons name="videocam" size={22} color="#ffffff" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleCall(activeContact, 'audio')} style={{ paddingHorizontal: 6 }}>
                                    <Ionicons name="call" size={20} color="#ffffff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={{ paddingHorizontal: 4 }}>
                                    <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
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
                                            {msg.fileUrl ? (
                                                msg.fileType?.startsWith('image/') ? (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            const url = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BASE_URL}${msg.fileUrl}`;
                                                            setPreviewImageUrl(url);
                                                            setShowPreviewModal(true);
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Image 
                                                            source={{ uri: msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BASE_URL}${msg.fileUrl}` }} 
                                                            style={{ width: 220, height: 160, borderRadius: 8, marginBottom: 4 }} 
                                                            resizeMode="cover" 
                                                        />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isMe ? '#cbeabf' : '#f0f0f0', padding: 8, borderRadius: 8, marginBottom: 4 }}>
                                                        <Ionicons name="document-text-outline" size={24} color="#008069" />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#000' }} numberOfLines={1}>
                                                                {msg.fileName || 'Attachment'}
                                                            </Text>
                                                            <Text style={{ fontSize: 9, color: '#666' }}>
                                                                {msg.fileType || 'File'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )
                                            ) : null}
                                            {msg.text ? (
                                                <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextPeer]}>
                                                    {msg.text}
                                                </Text>
                                            ) : null}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4, alignSelf: 'flex-end' }}>
                                                <Text style={{ fontSize: 9, color: '#777777', fontWeight: '500' }}>
                                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </Text>
                                                {isMe && <Ionicons name="checkmark-done" size={14} color="#53bdeb" />}
                                            </View>
                                        </View>
                                    );
                                })}
                                {isPeerTyping && (
                                    <Text style={styles.typingText}>{activeContact?.name} is typing...</Text>
                                )}
                            </ScrollView>

                            {showEmojiPicker && (
                                <View style={styles.emojiContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScroll}>
                                        {['😀', '😂', '😍', '👍', '🙏', '🎉', '🔥', '❤️', '👏', '✨', '😢', '😎', '🙌', '💯', '🤔', '🚀'].map(emoji => (
                                            <TouchableOpacity 
                                                key={emoji} 
                                                onPress={() => setChatInput(prev => prev + emoji)}
                                                style={styles.emojiButton}
                                            >
                                                <Text style={styles.emojiText}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.whatsappInputArea}>
                                <View style={styles.whatsappInputContainer}>
                                    <TouchableOpacity style={styles.inputIconButton} onPress={() => setShowEmojiPicker(prev => !prev)}>
                                        <Ionicons name="happy-outline" size={22} color={showEmojiPicker ? '#00a884' : '#777'} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={styles.whatsappTextInput}
                                        placeholder="Message"
                                        placeholderTextColor="#777"
                                        value={chatInput}
                                        onChangeText={setChatInput}
                                        multiline
                                    />
                                    <TouchableOpacity style={styles.inputIconButton} onPress={handlePickDocument}>
                                        <Ionicons name="attach-outline" size={22} color="#777" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.inputIconButton} onPress={handlePickCamera}>
                                        <Ionicons name="camera-outline" size={22} color="#777" />
                                    </TouchableOpacity>
                                </View>
                                
                                <TouchableOpacity 
                                    style={styles.whatsappVoiceSendButton}
                                    onPress={() => {
                                        if (chatInput.trim()) {
                                            handleSendMessage();
                                        } else {
                                            Alert.alert('Voice Note', 'Voice recording feature coming soon!');
                                        }
                                    }}
                                >
                                    <Ionicons 
                                        name={chatInput.trim() ? "send" : "mic"} 
                                        size={20} 
                                        color="#ffffff" 
                                        style={chatInput.trim() ? { marginLeft: 2 } : {}}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Custom Camera Capture Modal */}
                            <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
                                <View style={{ flex: 1, backgroundColor: '#000' }}>
                                    <CameraView style={StyleSheet.absoluteFillObject} facing={cameraFacing} flash={cameraFlash} ref={cameraRef}>
                                        <View style={{ flex: 1, justifyContent: 'space-between', padding: 24 }}>
                                            {/* Top Control Bar */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 48 : 24 }}>
                                                <TouchableOpacity 
                                                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }} 
                                                    onPress={() => setShowCamera(false)}
                                                >
                                                    <Ionicons name="close" size={26} color="#ffffff" />
                                                </TouchableOpacity>
                                                
                                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                                    <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Ionicons name="moon-outline" size={20} color="#ffffff" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
                                                        onPress={() => setCameraFlash(prev => prev === 'off' ? 'on' : 'off')}
                                                    >
                                                        <Ionicons 
                                                            name={cameraFlash === 'on' ? "flash" : "flash-off"} 
                                                            size={20} 
                                                            color={cameraFlash === 'on' ? "#ffeb3b" : "#ffffff"} 
                                                        />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* Bottom Capture Controls Bar */}
                                            <View style={{ marginBottom: 12 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 }}>
                                                    {/* Left: Gallery button */}
                                                    <TouchableOpacity 
                                                        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                                                        onPress={() => {
                                                            setShowCamera(false);
                                                            handlePickDocument();
                                                        }}
                                                    >
                                                        <Ionicons name="images-outline" size={22} color="#ffffff" />
                                                    </TouchableOpacity>

                                                    {/* Center: Capture button */}
                                                    <TouchableOpacity 
                                                        style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: '#ffffff', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }} 
                                                        onPress={takePicture}
                                                    >
                                                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffffff' }} />
                                                    </TouchableOpacity>

                                                    {/* Right: Flip camera button */}
                                                    <TouchableOpacity 
                                                        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                                                        onPress={() => setCameraFacing(prev => prev === 'back' ? 'front' : 'back')}
                                                    >
                                                        <Ionicons name="camera-reverse-outline" size={24} color="#ffffff" />
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Mode Selector Pill */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
                                                    <Text style={{ color: '#888888', fontSize: 13, fontWeight: '700' }}>Video</Text>
                                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
                                                        <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>Photo</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </CameraView>
                                </View>
                            </Modal>
                        </>
                    )}
                </KeyboardAvoidingView>
            </Modal>

            <ImagePreviewModal
                visible={showPreviewModal}
                imageUrl={previewImageUrl}
                onClose={() => setShowPreviewModal(false)}
            />
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
        paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 14,
        paddingBottom: 14,
        paddingHorizontal: spacing.md,
        backgroundColor: '#008069',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chatHeaderAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#00a884',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatHeaderAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    chatTitleArea: { flex: 1 },
    chatTitleName: { fontSize: fontSizes.md + 1, fontWeight: '800', color: '#ffffff' },
    chatTitleRole: { fontSize: 11, color: '#c7f3e8', fontWeight: '600', marginTop: 1 },
    chatActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    messagesScroll: { flex: 1, padding: spacing.md },
    messagesContent: { paddingBottom: 24 },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1,
    },
    messageBubbleMe: {
        alignSelf: 'flex-end',
        backgroundColor: '#d9fdd3',
        borderBottomRightRadius: 2,
    },
    messageBubblePeer: {
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 2,
    },
    messageText: { fontSize: fontSizes.md, color: '#000000', lineHeight: 20 },
    messageTextMe: { color: '#000000' },
    messageTextPeer: { color: '#000000' },
    typingText: { fontSize: fontSizes.xs, color: colors.textMuted, fontStyle: 'italic', alignSelf: 'flex-start', marginLeft: 8 },
    whatsappInputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        backgroundColor: 'transparent',
        gap: 8,
    },
    whatsappInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 8,
        height: 48,
        elevation: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    whatsappTextInput: {
        flex: 1,
        fontSize: fontSizes.md,
        color: '#000000',
        paddingHorizontal: 8,
        paddingVertical: 0,
        maxHeight: 100,
    },
    inputIconButton: {
        padding: 8,
    },
    whatsappVoiceSendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#00a884',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
    },
    emojiContainer: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingVertical: 8,
    },
    emojiScroll: {
        paddingHorizontal: 12,
        gap: 14,
    },
    emojiButton: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiText: {
        fontSize: 24,
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 12,
        paddingBottom: 14,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    headerTitleText: {
        fontSize: fontSizes.xl,
        fontWeight: '900',
        color: colors.text,
    },
    pillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    pillButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 36,
        right: 0,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 6,
        minWidth: 150,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        zIndex: 999,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    dropdownItemActive: {
        backgroundColor: '#3b82f6',
    },
    dropdownText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
    },
    dropdownTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    createContactPillBtn: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 24,
        marginHorizontal: spacing.md,
        marginVertical: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    createContactPillBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    createContactCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    modalTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '900',
        color: '#0f172a',
    },
    modalSubtitle: {
        fontSize: 11,
        color: '#64748b',
        lineHeight: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    modalInputLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748b',
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
    },
    saveContactBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 24,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    saveContactBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#ffffff',
    },
});

export default ChatScreen;
