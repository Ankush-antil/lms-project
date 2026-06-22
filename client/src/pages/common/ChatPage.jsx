import { useState, useEffect, useRef, useMemo } from 'react';
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

    // Test relevant chat states
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
    const [showSidebarTests, setShowSidebarTests] = useState(false);
    const [studentTests, setStudentTests] = useState([]);
    const [loadingStudentTests, setLoadingStudentTests] = useState(false);
    const [expandedInboxId, setExpandedInboxId] = useState(null);
    const [expandedTestId, setExpandedTestId] = useState(null);
    const [selectedInboxId, setSelectedInboxId] = useState(null);
    // Doubt chat messages (fetched via student+test endpoint, not teacher<->student general messages)
    const [doubtMessages, setDoubtMessages] = useState([]);
    const [loadingDoubtMessages, setLoadingDoubtMessages] = useState(false);
    // All test messages for this student (across all tests, for active doubts detection)
    const [allStudentTestMessages, setAllStudentTestMessages] = useState([]);
    // Map of testId -> { questions: {[qIndex]: count} } for active doubts in inbox grid
    const [testDoubtCounts, setTestDoubtCounts] = useState({});

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
        setSelectedTestId(null);
        setSelectedQuestionIndex(null);
        setShowSidebarTests(false);
        setStudentTests([]);
        setExpandedInboxId(null);
        setExpandedTestId(null);
        setSelectedInboxId(null);
        setDoubtMessages([]);
        setAllStudentTestMessages([]);
        setTestDoubtCounts({});
    }, [selectedContact]);

    // Load student tests when "Test Relevant Chat" is enabled
    useEffect(() => {
        if (!showSidebarTests || !selectedContact || selectedContact.role !== 'Student' || user.role !== 'Teacher') {
            return;
        }

        const fetchStudentTests = async () => {
            try {
                setLoadingStudentTests(true);
                const { data } = await axios.get(`/api/chat/student-tests/${selectedContact._id}`);
                setStudentTests(data);
                setLoadingStudentTests(false);
            } catch (error) {
                console.error("Error loading student tests:", error);
                toast.error("Failed to load student's assigned tests");
                setLoadingStudentTests(false);
            }
        };

        fetchStudentTests();
    }, [showSidebarTests, selectedContact, user]);

    // Load all test messages for this student (for detecting active doubts in inbox grid)
    useEffect(() => {
        if (!showSidebarTests || !selectedContact || selectedContact.role !== 'Student' || user.role !== 'Teacher') {
            return;
        }

        const fetchAllTestMessages = async () => {
            try {
                // Fetch ALL messages for this student that have test context using a broad query
                // We get this from the general messages endpoint but also via the test endpoint
                // Use a broad query by getting messages with test field set
                const { data } = await axios.get(`/api/chat/messages/${selectedContact._id}`);
                setAllStudentTestMessages(data.filter(m => m.test));
            } catch (error) {
                console.error('Error loading student test messages for active doubt detection:', error);
            }
        };

        fetchAllTestMessages();
    }, [showSidebarTests, selectedContact, user]);

    // Load doubt messages when a specific test question is selected (uses new broad endpoint)
    useEffect(() => {
        if (!selectedContact || selectedTestId === null || selectedQuestionIndex === null) {
            setDoubtMessages([]);
            return;
        }

        const fetchDoubtMessages = async () => {
            try {
                setLoadingDoubtMessages(true);
                const { data } = await axios.get(
                    `/api/chat/test-doubt-messages/${selectedContact._id}/${selectedTestId}?questionIndex=${selectedQuestionIndex}`
                );
                setDoubtMessages(data);
                setLoadingDoubtMessages(false);
                scrollToBottom();
            } catch (error) {
                console.error('Error loading doubt messages:', error);
                toast.error('Failed to load doubt chat');
                setLoadingDoubtMessages(false);
            }
        };

        fetchDoubtMessages();
    }, [selectedContact, selectedTestId, selectedQuestionIndex]);

    // Also fetch ALL messages for the student across all tests (so inbox grid can detect active doubts)
    // We do this separately by querying test-doubt-messages for each test in the inbox
    // The allStudentTestMessages + doubtMessages together power both the grid and the chat view

    // Populate testDoubtCounts when the inbox changes or studentTests loads
    useEffect(() => {
        if (!selectedContact || !selectedInboxId || studentTests.length === 0) return;

        const inbox = studentTests.reduce((acc, test) => {
            const indexStr = test.index || 'No Index';
            if (!acc[indexStr]) acc[indexStr] = [];
            acc[indexStr].push(test);
            return acc;
        }, {});
        const testsInInbox = inbox[selectedInboxId] || [];
        if (testsInInbox.length === 0) return;

        const fetchCounts = async () => {
            const counts = {};
            await Promise.all(testsInInbox.map(async (test) => {
                try {
                    const { data } = await axios.get(
                        `/api/chat/test-doubt-messages/${selectedContact._id}/${test._id}`
                    );
                    if (data.length > 0) {
                        const qMap = {};
                        data.forEach(m => {
                            if (m.questionIndex !== undefined) {
                                qMap[m.questionIndex] = (qMap[m.questionIndex] || 0) + 1;
                            }
                        });
                        counts[String(test._id)] = qMap;
                    } else {
                        counts[String(test._id)] = {};
                    }
                } catch (e) {
                    counts[String(test._id)] = {};
                }
            }));
            setTestDoubtCounts(counts);
        };

        fetchCounts();
    }, [selectedContact, selectedInboxId, studentTests]);

    const getDisplayTitle = (title) => {
        if (!title) return 'Inbox No';
        const cleanTitle = title.trim();
        if (cleanTitle.toLowerCase().startsWith('inbox no')) return cleanTitle;
        if (cleanTitle.toLowerCase().startsWith('index')) {
            return cleanTitle.replace(/index/i, 'Inbox No');
        }
        if (/^\d+$/.test(cleanTitle)) {
            return `Inbox No ${cleanTitle}`;
        }
        return cleanTitle;
    };

    // Group student tests by their index (Inbox)
    const studentInboxes = useMemo(() => {
        const grouped = studentTests.reduce((acc, test) => {
            const indexStr = test.index || 'No Index';
            if (!acc[indexStr]) acc[indexStr] = [];
            acc[indexStr].push(test);
            return acc;
        }, {});

        const getNum = (s) => parseInt(s.match(/\d+/)?.[0] || 0);

        return Object.keys(grouped)
            .sort((a, b) => getNum(a) - getNum(b))
            .map(indexStr => ({
                id: indexStr,
                title: getDisplayTitle(indexStr),
                tests: grouped[indexStr]
            }));
    }, [studentTests]);

    // Handle real-time socket events for chat
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (msg) => {
            // If it's a test doubt message from the currently selected student
            if (selectedContact && msg.sender === selectedContact._id && msg.test) {
                // If the teacher is currently viewing this exact doubt question, append to doubtMessages
                if (String(msg.test) === String(selectedTestId) && msg.questionIndex === selectedQuestionIndex) {
                    setDoubtMessages(prev => [...prev, msg]);
                    scrollToBottom();
                }
                // Also bump the testDoubtCounts for real-time indicator update
                if (msg.questionIndex !== undefined) {
                    setTestDoubtCounts(prev => {
                        const testId = String(msg.test);
                        const existing = prev[testId] || {};
                        return {
                            ...prev,
                            [testId]: {
                                ...existing,
                                [msg.questionIndex]: (existing[msg.questionIndex] || 0) + 1
                            }
                        };
                    });
                }
                return;
            }

            // Check if message is from the currently active contact (general chat)
            if (selectedContact && msg.sender === selectedContact._id && !msg.test) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
                
                // Mark this message as read in database
                axios.put(`/api/chat/messages/${selectedContact._id}/read`).catch(err => {
                    console.error("Error marking message as read:", err);
                });
            } else if (!selectedContact || msg.sender !== selectedContact._id) {
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
            const isDoubtChat = selectedTestId !== null && selectedQuestionIndex !== null;

            // For doubt chats: the student originally sent to the test creator (could be Admin/Teacher)
            // We reply directly to the student so they receive it in their test drawer
            const receiverId = isDoubtChat ? selectedContact._id : selectedContact._id;

            const payload = {
                receiver: receiverId,
                text: messageText
            };

            if (isDoubtChat) {
                const activeTest = studentTests.find(t => String(t._id) === String(selectedTestId));
                payload.test = selectedTestId;
                payload.testTitle = activeTest?.title || 'Untitled Test';
                payload.questionIndex = selectedQuestionIndex;
                payload.questionText = activeTest?.questions?.[selectedQuestionIndex]?.text
                    ? activeTest.questions[selectedQuestionIndex].text.replace(/<[^>]*>/g, '').trim()
                    : `Question ${selectedQuestionIndex + 1}`;
            }

            // Save to DB first
            const { data } = await axios.post('/api/chat/messages', payload);

            // For doubt chats: update doubtMessages state so UI refreshes immediately
            if (isDoubtChat) {
                setDoubtMessages(prev => [...prev, data]);
            } else {
                setMessages(prev => [...prev, data]);
            }
            scrollToBottom();

            // Emit socket event for real-time delivery
            if (socket) {
                socket.emit('send-message', {
                    receiverId: receiverId,
                    text: messageText,
                    _id: data._id,
                    createdAt: data.createdAt,
                    sender: user._id,
                    ...(isDoubtChat ? {
                        test: selectedTestId,
                        testTitle: payload.testTitle,
                        questionIndex: selectedQuestionIndex,
                        questionText: payload.questionText
                    } : {})
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

    // Filter messages for General vs Test
    const generalMessages = messages.filter(m => !m.test);
    const testMessages = messages.filter(m => m.test);

    // Group test messages by test and question index
    const testMap = {};
    testMessages.forEach(m => {
        if (!testMap[m.test]) {
            testMap[m.test] = {
                id: m.test,
                title: m.testTitle || 'Untitled Test',
                questions: {}
            };
        }
        if (m.questionIndex !== undefined) {
            if (!testMap[m.test].questions[m.questionIndex]) {
                testMap[m.test].questions[m.questionIndex] = {
                    index: m.questionIndex,
                    text: m.questionText || `Question ${m.questionIndex + 1}`,
                    messages: []
                };
            }
            testMap[m.test].questions[m.questionIndex].messages.push(m);
        }
    });

    const testChats = Object.values(testMap);

    // activeQuestionMessages now comes from dedicated doubtMessages state (fetched via broad endpoint)
    const activeQuestionMessages = doubtMessages;

    // For inbox grid: combine allStudentTestMessages + doubtMessages for active doubts detection
    // allStudentTestMessages has messages the logged-in teacher exchanged with student
    // But student doubts may have gone to Admin/other teacher (the test creator)
    // So we ALSO need to check per-test via the new endpoint in the grid view
    // We use a helper that fetches doubt counts per test lazily (done inside the grid render)

    return (
        <DashboardLayout role={user?.role} fullWidth={true}>
            <div className="flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[500px]">
                {/* Left Side Pane: Contact List */}
                <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-100 flex-shrink-0 ${
                    mobileActiveTab === 'chat' ? 'hidden md:flex' : 'flex'
                }`}>
                    {showSidebarTests && selectedContact ? (
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <button
                                onClick={() => {
                                    setShowSidebarTests(false);
                                    setSelectedTestId(null);
                                    setSelectedQuestionIndex(null);
                                }}
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors mb-2.5 text-xs font-black"
                            >
                                <ArrowLeft size={14} />
                                Back to Directory
                            </button>
                            <h1 className="text-sm font-black text-slate-800 truncate">
                                Test Relevant Chats
                            </h1>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 truncate">
                                For: {selectedContact.name}
                            </p>
                        </div>
                    ) : (
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
                    )}

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {showSidebarTests && selectedContact ? (
                            <div className="p-4 space-y-3 bg-slate-50/10">
                                <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider block mb-1">ASSIGNED INBOXES</span>
                                {loadingStudentTests ? (
                                    <div className="p-8 text-center text-slate-400 text-xs">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                        Loading inboxes...
                                    </div>
                                ) : studentInboxes.length > 0 ? (
                                    <div className="space-y-2">
                                        {studentInboxes.map(inbox => {
                                            const isSelectedInbox = selectedInboxId === inbox.id;
                                            return (
                                                <button
                                                    key={inbox.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedInboxId(isSelectedInbox ? null : inbox.id);
                                                        setSelectedTestId(null);
                                                        setSelectedQuestionIndex(null);
                                                    }}
                                                    className={`w-full text-left py-3 px-4 flex items-center justify-between text-xs font-black rounded-2xl border transition-all ${
                                                        isSelectedInbox 
                                                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10' 
                                                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50 text-slate-700'
                                                    }`}
                                                >
                                                    <span className="truncate flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${isSelectedInbox ? 'bg-indigo-600' : 'bg-slate-400'}`}></span>
                                                        {inbox.title}
                                                    </span>
                                                    <span className="text-[10px] text-slate-450 font-extrabold bg-slate-100 px-2 py-0.5 rounded-full">
                                                        {inbox.tests.length} {inbox.tests.length === 1 ? 'Test' : 'Tests'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-400 text-xs">
                                        No assigned tests/inboxes found for this student.
                                    </div>
                                )}
                            </div>
                        ) : loadingContacts ? (
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
                                        className={`flex flex-col transition-colors border-b border-slate-100/50 relative ${
                                            isSelected ? 'bg-indigo-50/20' : 'hover:bg-slate-50/30'
                                        }`}
                                    >
                                        {/* Clickable Header Info card */}
                                        <div
                                            onClick={() => {
                                                setSelectedContact(c);
                                                setSelectedTestId(null);
                                                setSelectedQuestionIndex(null);
                                            }}
                                            className="p-4 flex items-center gap-3 cursor-pointer"
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
                                            {user.role === 'Teacher' && selectedContact.role === 'Student' && (
                                                <button
                                                    onClick={() => {
                                                        if (selectedTestId !== null || selectedInboxId !== null) {
                                                            setSelectedTestId(null);
                                                            setSelectedQuestionIndex(null);
                                                            setSelectedInboxId(null);
                                                            setShowSidebarTests(false);
                                                        } else {
                                                            setShowSidebarTests(prev => !prev);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-[10px] font-black rounded-lg border bg-white hover:bg-slate-50 text-indigo-600 border-indigo-100 transition-all active:scale-95 shadow-sm mr-1.5"
                                                >
                                                    {(selectedTestId !== null || selectedInboxId !== null) ? 'Show General Chat' : (showSidebarTests ? 'Hide Test Chat' : 'Test Relevant Chat')}
                                                </button>
                                            )}
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

                            {selectedTestId !== null && selectedQuestionIndex !== null ? (
                                <>
                                    {/* Doubt Question Header */}
                                    <div className="p-3.5 bg-white border-b border-slate-100 flex items-center gap-3 flex-shrink-0 text-left">
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedQuestionIndex(null)}
                                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95 flex-shrink-0"
                                            title="Back to Test Doubts"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-black uppercase text-indigo-650 tracking-wider block">Active Doubt Context</span>
                                            <h3 className="font-extrabold text-slate-800 text-xs truncate">
                                                {studentTests.find(t => String(t._id) === String(selectedTestId))?.title || testMap[selectedTestId]?.title || 'Untitled Test'}
                                            </h3>
                                            <p className="text-[10px] text-slate-500 truncate font-semibold mt-0.5">
                                                Q{selectedQuestionIndex + 1}: {studentTests.find(t => String(t._id) === String(selectedTestId))?.questions?.[selectedQuestionIndex]?.text 
                                                    ? studentTests.find(t => String(t._id) === String(selectedTestId))?.questions[selectedQuestionIndex].text.replace(/<[^>]*>/g, '').trim() 
                                                    : (testMap[selectedTestId]?.questions?.[selectedQuestionIndex]?.text || `Question ${selectedQuestionIndex + 1}`)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Chat Messages Scrolling Pane */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {activeQuestionMessages.map(msg => {
                                            const isSelf = msg.sender === user._id;
                                            return (
                                                <div key={msg._id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] rounded-3xl px-4 py-2.5 shadow-sm ${
                                                        isSelf 
                                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                                    }`}>
                                                        <p className="text-sm font-medium leading-relaxed break-words">{msg.text}</p>
                                                        <span className={`text-[8px] font-bold block text-right mt-1 ${isSelf ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            {formatMessageTime(msg.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Composer Form */}
                                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center flex-shrink-0">
                                        <input
                                            type="text"
                                            placeholder={`Reply to student doubt on Q${selectedQuestionIndex + 1}...`}
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
                            ) : selectedInboxId !== null && selectedTestId !== null ? (
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Header for Test Doubts List */}
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedTestId(null)}
                                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95 flex-shrink-0"
                                            title="Back to Tests"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-lg">
                                                {studentTests.find(t => String(t._id) === String(selectedTestId))?.title || testMap[selectedTestId]?.title || 'Untitled Test'}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Below are the questions from this test where the student has raised doubts. Select one to open the chat window.
                                            </p>
                                        </div>
                                    </div>

                                    {/* List of Questions with Doubts */}
                                    {(() => {
                                        const activeTest = studentTests.find(t => String(t._id) === String(selectedTestId));
                                        if (!activeTest) return null;

                                        const testDoubtData = testDoubtCounts[String(selectedTestId)] || {};
                                        const doubtQuestions = activeTest.questions
                                            ? activeTest.questions.map((q, idx) => ({ ...q, index: idx })).filter(q => testDoubtData[q.index] !== undefined)
                                            : [];

                                        const msgCountForQ = (qIdx) => testDoubtData[qIdx] || 0;

                                        if (doubtQuestions.length === 0) {
                                            return (
                                                <div className="py-20 text-center text-slate-400 text-sm font-medium">
                                                    No active doubts found for this test.
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="max-w-2xl space-y-3">
                                                {doubtQuestions.map(q => {
                                                    const cleanQText = q.text ? q.text.replace(/<[^>]*>/g, '').trim() : `Question ${q.index + 1}`;
                                                    const msgCount = msgCountForQ(q.index);
                                                    return (
                                                        <button
                                                            key={q.index}
                                                            type="button"
                                                            onClick={() => setSelectedQuestionIndex(q.index)}
                                                            className="w-full text-left p-4 rounded-3xl border border-slate-100 hover:border-indigo-150 hover:bg-indigo-50/10 transition-all flex items-center justify-between gap-4 text-sm font-bold text-slate-800 shadow-sm active:scale-98 group"
                                                        >
                                                            <span className="truncate flex-1">
                                                                <span className="text-indigo-600 font-extrabold mr-2">Question {q.index + 1}:</span>
                                                                {cleanQText}
                                                            </span>
                                                            <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1 rounded-full flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                {msgCount} {msgCount === 1 ? 'message' : 'messages'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : selectedInboxId !== null ? (
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Selected Inbox Header / Breadcrumb inside right pane */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                                                {studentInboxes.find(inbox => inbox.id === selectedInboxId)?.title || `Inbox No ${selectedInboxId}`}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Select a test below to view the student's doubts and chat messages.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tests Grid */}
                                    {(() => {
                                        const selectedInbox = studentInboxes.find(inbox => inbox.id === selectedInboxId);
                                        const inboxTests = selectedInbox ? selectedInbox.tests : [];

                                        if (inboxTests.length === 0) {
                                            return (
                                                <div className="py-20 text-center text-slate-400 text-xs">
                                                    No assigned tests found in this inbox.
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {inboxTests.map(test => {
                                                     const testId = String(test._id);
                                                     const doubtData = testDoubtCounts[testId];
                                                     // doubtData is a map of questionIndex -> count
                                                     const totalDoubtQs = doubtData ? Object.keys(doubtData).length : 0;
                                                     const hasDoubts = totalDoubtQs > 0;

                                                    return (
                                                        <div 
                                                            key={test._id} 
                                                            className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                                        >
                                                            <div>
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded-full tracking-wider">
                                                                        Test Card
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-semibold">
                                                                        {test.questions?.length || 0} Total Qs
                                                                    </span>
                                                                </div>
                                                                <h4 className="font-bold text-slate-800 text-sm leading-snug mb-4">
                                                                    {test.title}
                                                                </h4>

                                                                <div className="flex items-center gap-2 mb-5">
                                                                    <span className={`w-2 h-2 rounded-full ${hasDoubts ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                                                    <span className="text-xs font-semibold text-slate-500">
                                                                        {hasDoubts 
                                                                            ? `${totalDoubtQs} active doubt${totalDoubtQs === 1 ? '' : 's'}`
                                                                            : 'No active doubts'
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTestId(test._id);
                                                                    setSelectedQuestionIndex(null);
                                                                }}
                                                                disabled={!hasDoubts}
                                                                className={`w-full py-2.5 px-4 text-xs font-black rounded-2xl border transition-all flex items-center justify-center gap-2 shadow-sm ${
                                                                    hasDoubts 
                                                                        ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 cursor-pointer' 
                                                                        : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                <MessageSquare size={14} />
                                                                {hasDoubts ? 'View Test Doubts' : 'No Doubts Raised'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <>
                                    {/* Message scrolling panel */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {loadingMessages ? (
                                            <div className="py-20 text-center text-slate-450 text-xs">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                                Fetching chat history...
                                            </div>
                                        ) : generalMessages.length > 0 ? (
                                            generalMessages.map((msg) => {
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
                                                                <div className="text-[11px] text-indigo-105 bg-indigo-750/30 border border-indigo-500/10 rounded-2xl p-2 mt-1.5 break-words text-left">
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
                            )}
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
