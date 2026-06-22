import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    Search, Send, Phone, Video, MessageSquare, 
    MoreVertical, User, Circle, ArrowLeft, Pencil 
} from 'lucide-react';

const ChatPage = () => {
    const { user } = useAuth();
    const { socket, onlineUsers, callUser } = useSocket();

    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [mobileActiveTab, setMobileActiveTab] = useState('list'); // 'list' | 'chat'
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [showOriginalMap, setShowOriginalMap] = useState({});

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Fetch contacts list
    const fetchContacts = async () => {
        try {
            setLoadingContacts(true);
            const { data } = await axios.get('/api/chat/contacts');
            setContacts(data);
            setLoadingContacts(false);
        } catch (error) {
            console.error("Error loading chat contacts:", error);
            toast.error("Failed to load contacts");
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    // Load messages when contact is selected
    useEffect(() => {
        if (!selectedContact) return;

        const fetchMessages = async () => {
            try {
                setLoadingMessages(true);
                const { data } = await axios.get(`/api/chat/messages/${selectedContact._id}`);
                setMessages(data);
                setLoadingMessages(false);
                
                // Mark as read
                await axios.put(`/api/chat/messages/${selectedContact._id}/read`);
                
                // Reset unread count locally
                setContacts(prev => prev.map(c => 
                    c._id === selectedContact._id ? { ...c, unreadCount: 0 } : c
                ));

                // Scroll to bottom
                scrollToBottom();
            } catch (error) {
                console.error("Error loading message history:", error);
                toast.error("Failed to load chat history");
                setLoadingMessages(false);
            }
        };

        fetchMessages();
        setIsTyping(false); // Reset typing status when switching contacts
    }, [selectedContact]);

    // Handle real-time socket events for chat
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (msg) => {
            // Check if message is from the currently active contact
            if (selectedContact && msg.sender === selectedContact._id) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
                
                // Mark this message as read in database
                axios.put(`/api/chat/messages/${selectedContact._id}/read`).catch(err => {
                    console.error("Error marking message as read:", err);
                });
            } else {
                // Increment unread count for that contact in the list
                setContacts(prev => prev.map(c => {
                    if (c._id === msg.sender) {
                        return { 
                            ...c, 
                            unreadCount: (c.unreadCount || 0) + 1,
                            lastMessage: {
                                text: msg.text,
                                sender: msg.sender,
                                createdAt: msg.createdAt
                            }
                        };
                    }
                    return c;
                }));
                // Try playing alert sound or show a toast notification
                toast.success(`New message from contact!`);
            }
        };

        const handleTypingStatus = ({ senderId, isTyping: typing }) => {
            if (selectedContact && senderId === selectedContact._id) {
                setIsTyping(typing);
            }
        };

        const handleMessageEdited = ({ messageId, text, isEdited, originalText }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === messageId) {
                    return {
                        ...m,
                        text,
                        isEdited,
                        originalText
                    };
                }
                return m;
            }));
        };

        socket.on('receive-message', handleReceiveMessage);
        socket.on('typing-status', handleTypingStatus);
        socket.on('message-edited', handleMessageEdited);

        return () => {
            socket.off('receive-message', handleReceiveMessage);
            socket.off('typing-status', handleTypingStatus);
            socket.off('message-edited', handleMessageEdited);
        };
    }, [socket, selectedContact]);

    // Auto-scroll logic
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const startEditing = (msg) => {
        setEditingMessageId(msg._id);
        setNewMessage(msg.text);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setNewMessage('');
        handleStopTyping();
    };

    // Send or edit chat message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        const messageText = newMessage;
        setNewMessage('');

        if (editingMessageId) {
            try {
                const originalMsg = messages.find(m => m._id === editingMessageId);
                const originalTextVal = originalMsg ? (originalMsg.originalText || originalMsg.text) : '';

                const { data } = await axios.put(`/api/chat/messages/${editingMessageId}`, {
                    text: messageText
                });

                setMessages(prev => prev.map(m => m._id === editingMessageId ? data : m));
                setEditingMessageId(null);

                if (socket) {
                    socket.emit('edit-message', {
                        messageId: editingMessageId,
                        receiverId: selectedContact._id,
                        text: messageText,
                        isEdited: true,
                        originalText: originalTextVal
                    });
                }

                setContacts(prev => prev.map(c => {
                    if (c._id === selectedContact._id) {
                        return {
                            ...c,
                            lastMessage: {
                                text: messageText,
                                sender: user._id,
                                createdAt: data.updatedAt
                            }
                        };
                    }
                    return c;
                }));

                handleStopTyping();
            } catch (error) {
                console.error("Failed to edit message:", error);
                toast.error("Message could not be edited");
            }
            return;
        }

        try {
            // Save to DB first
            const { data } = await axios.post('/api/chat/messages', {
                receiver: selectedContact._id,
                text: messageText
            });

            // Append locally
            setMessages(prev => [...prev, data]);
            scrollToBottom();

            // Emit socket event for real-time delivery
            if (socket) {
                socket.emit('send-message', {
                    receiverId: selectedContact._id,
                    text: messageText,
                    _id: data._id,
                    createdAt: data.createdAt
                });
            }

            // Update last message in local contact list
            setContacts(prev => prev.map(c => {
                if (c._id === selectedContact._id) {
                    return {
                        ...c,
                        lastMessage: {
                            text: messageText,
                            sender: user._id,
                            createdAt: data.createdAt
                        }
                    };
                }
                return c;
            }));

            // Stop typing status immediately on send
            handleStopTyping();
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Message could not be sent");
        }
    };

    // Typing indicators
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !selectedContact) return;

        // Emit typing status
        socket.emit('typing', { targetId: selectedContact._id });

        // Throttle/Timeout to stop typing status after inactivity
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            handleStopTyping();
        }, 2000);
    };

    const handleStopTyping = () => {
        if (socket && selectedContact) {
            socket.emit('stop-typing', { targetId: selectedContact._id });
        }
    };

    const selectContactHandler = (contact) => {
        setSelectedContact(contact);
        setMobileActiveTab('chat');
    };

    // Filters contacts based on search keyword
    const filteredContacts = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isContactOnline = (contactId) => {
        return onlineUsers.includes(contactId);
    };

    const formatMessageTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatContactDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <DashboardLayout role={user?.role} fullWidth={true}>
            <div className="flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[500px]">
                {/* Left Side Pane: Contact List */}
                <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-100 flex-shrink-0 ${
                    mobileActiveTab === 'chat' ? 'hidden md:flex' : 'flex'
                }`}>
                    <div className="p-4 border-b border-slate-100">
                        <h1 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <MessageSquare className="text-indigo-600" size={22} />
                            <span>Messages Directory</span>
                        </h1>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {loadingContacts ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                Loading contacts...
                            </div>
                        ) : filteredContacts.length > 0 ? (
                            filteredContacts.map((c) => {
                                const online = isContactOnline(c._id);
                                const isSelected = selectedContact?._id === c._id;
                                return (
                                    <div
                                        key={c._id}
                                        onClick={() => selectContactHandler(c)}
                                        className={`p-4 flex items-center gap-3 cursor-pointer transition-colors relative ${
                                            isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div className="w-11 h-11 rounded-full bg-indigo-150 text-indigo-700 flex items-center justify-center font-black overflow-hidden shadow-sm">
                                                {c.avatar ? (
                                                    <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    c.name[0]?.toUpperCase()
                                                )}
                                            </div>
                                            {online ? (
                                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-500/20"></span>
                                            ) : (
                                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-350 rounded-full border-2 border-white"></span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h3 className="font-semibold text-slate-800 text-sm truncate pr-2">{c.name}</h3>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {c.lastMessage ? formatContactDate(c.lastMessage.createdAt) : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate pr-6">
                                                {c.lastMessage ? (
                                                    c.lastMessage.sender === user._id ? (
                                                        <span className="font-medium text-slate-500">You: {c.lastMessage.text}</span>
                                                    ) : (
                                                        c.lastMessage.text
                                                    )
                                                ) : (
                                                    <span className="italic opacity-60">No messages yet</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Unread badge & Role badge */}
                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                                {c.role}
                                            </span>
                                            {c.unreadCount > 0 && (
                                                <span className="bg-indigo-600 text-white font-extrabold text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-sm">
                                                    {c.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-xs select-none">
                                <MessageSquare size={36} className="mx-auto opacity-20 mb-2" />
                                No contacts found
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side Pane: Conversation Window */}
                <div className={`flex-1 flex flex-col bg-slate-50/50 ${
                    mobileActiveTab === 'list' ? 'hidden md:flex' : 'flex'
                }`}>
                    {selectedContact ? (
                        <>
                            {/* Active Chat Header */}
                            <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button 
                                        onClick={() => setMobileActiveTab('list')}
                                        className="p-2 -ml-1 text-slate-500 hover:bg-slate-100 rounded-full md:hidden flex-shrink-0 transition-colors"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div className="relative flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-700 flex items-center justify-center font-black overflow-hidden shadow-sm">
                                            {selectedContact.avatar ? (
                                                <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                                            ) : (
                                                selectedContact.name[0]?.toUpperCase()
                                            )}
                                        </div>
                                        {isContactOnline(selectedContact._id) ? (
                                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-500/20"></span>
                                        ) : (
                                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-350 rounded-full border-2 border-white"></span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-bold text-slate-800 text-sm truncate">{selectedContact.name}</h2>
                                        <p className="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1">
                                            <span className="uppercase">{selectedContact.role}</span>
                                            <Circle size={4} className="fill-slate-400 text-slate-400" />
                                            <span>{isContactOnline(selectedContact._id) ? 'Online Now' : 'Offline'}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Call Quick Action System */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => callUser(selectedContact._id, selectedContact.name, selectedContact.role, 'audio')}
                                        className="p-2.5 text-slate-550 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all active:scale-95 shadow-sm bg-white"
                                        title="Voice Call"
                                    >
                                        <Phone size={16} />
                                    </button>
                                    <button
                                        onClick={() => callUser(selectedContact._id, selectedContact.name, selectedContact.role, 'video')}
                                        className="p-2.5 text-slate-550 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all active:scale-95 shadow-sm bg-white"
                                        title="Video Call"
                                    >
                                        <Video size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Message scrolling panel */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loadingMessages ? (
                                    <div className="py-20 text-center text-slate-450 text-xs">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                        Fetching chat history...
                                    </div>
                                ) : messages.length > 0 ? (
                                    messages.map((msg) => {
                                        const isSelf = msg.sender === user._id;
                                        return (
                                            <div 
                                                key={msg._id} 
                                                className={`flex items-end gap-2 group ${isSelf ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {isSelf && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(msg)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all self-center"
                                                        title="Edit Message"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                )}
                                                <div className={`max-w-[70%] rounded-3xl px-4 py-2.5 shadow-sm ${
                                                    isSelf 
                                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                                }`}>
                                                    <p className="text-sm font-medium leading-relaxed break-words">{msg.text}</p>
                                                    
                                                    {isSelf && msg.isEdited && showOriginalMap[msg._id] && (
                                                        <div className="text-[11px] text-indigo-100 bg-indigo-750/30 border border-indigo-500/10 rounded-2xl p-2 mt-1.5 break-words text-left">
                                                            <span className="font-bold block text-[9px] uppercase tracking-wider text-indigo-300 mb-0.5">Original message</span>
                                                            {msg.originalText}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                                        {msg.isEdited && (
                                                            <span className={`text-[9px] font-bold ${isSelf ? 'text-indigo-300' : 'text-slate-400'}`}>
                                                                (edited)
                                                            </span>
                                                        )}
                                                        {isSelf && msg.isEdited && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowOriginalMap(prev => ({
                                                                        ...prev,
                                                                        [msg._id]: !prev[msg._id]
                                                                    }));
                                                                }}
                                                                className="text-[9px] font-extrabold underline text-indigo-200 hover:text-white"
                                                            >
                                                                {showOriginalMap[msg._id] ? 'Hide Original' : 'Show Original'}
                                                            </button>
                                                        )}
                                                        <span className={`text-[9px] font-bold block ${
                                                            isSelf ? 'text-indigo-200' : 'text-slate-400'
                                                        }`}>
                                                            {formatMessageTime(msg.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-20 select-none">
                                        <MessageSquare size={48} className="mx-auto text-slate-200 mb-3" />
                                        <h4 className="font-bold text-slate-700 text-sm">Start conversation!</h4>
                                        <p className="text-slate-400 text-xs mt-1">Send a message to start conversation with {selectedContact.name}.</p>
                                    </div>
                                )}

                                {/* Typing indicator panel */}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5 shadow-sm text-slate-500">
                                            <span className="text-xs font-bold">{selectedContact.name} is typing</span>
                                            <div className="flex gap-0.5 items-center mt-1 select-none">
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Edit mode banner */}
                            {editingMessageId && (
                                <div className="px-4 py-2 bg-indigo-50 border-t border-slate-150 flex justify-between items-center text-xs font-bold text-indigo-750 flex-shrink-0">
                                    <span className="flex items-center gap-1.5">
                                        <Pencil size={12} />
                                        Editing message...
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={cancelEditing} 
                                        className="text-red-500 hover:text-red-750 underline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Message composer box */}
                            <form 
                                onSubmit={handleSendMessage} 
                                className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center flex-shrink-0"
                            >
                                <input
                                    type="text"
                                    placeholder="Type message here..."
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                                >
                                    <Send size={16} className="fill-current" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-center p-8 select-none">
                            <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100 shadow-sm animate-pulse">
                                <MessageSquare size={36} />
                            </div>
                            <h3 className="text-slate-800 font-extrabold text-lg">Select a conversation</h3>
                            <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                                Select a contact from your class directory sidebar to begin messaging in real-time.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ChatPage;
