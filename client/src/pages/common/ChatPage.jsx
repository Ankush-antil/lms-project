import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Search, Send, Phone, Video, MessageSquare,
    MoreVertical, User, Circle, ArrowLeft, Pencil,
    Paperclip, File, Download, X, Loader2
} from 'lucide-react';

const ChatPage = () => {
    const { user } = useAuth();
    const { socket, onlineUsers, callUser, setChatNotifications } = useSocket();
    const location = useLocation();

    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isDoubtTyping, setIsDoubtTyping] = useState(false);
    const [mobileActiveTab, setMobileActiveTab] = useState('list'); // 'list' | 'chat'
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [showOriginalMap, setShowOriginalMap] = useState({});

    // Contact filtering and custom lists states
    const [activeFilterTab, setActiveFilterTab] = useState('All'); // 'All' | 'Teacher' | 'Editor' | 'Student' | 'list_xxx'
    const [customLists, setCustomLists] = useState([]);

    // Lists creation flow states
    const [showListsIntro, setShowListsIntro] = useState(false);
    const [showCreateList, setShowCreateList] = useState(false);
    const [showAddUsers, setShowAddUsers] = useState(false);

    const [draftListName, setDraftListName] = useState('');
    const [draftSelectedUsers, setDraftSelectedUsers] = useState([]); // Array of user objects

    const [directoryUsers, setDirectoryUsers] = useState([]);
    const [directorySearch, setDirectorySearch] = useState('');
    const [loadingDirectory, setLoadingDirectory] = useState(false);

    // Load custom lists from local storage
    useEffect(() => {
        if (user?._id) {
            const saved = localStorage.getItem(`chat_lists_${user._id}`);
            if (saved) {
                try {
                    setCustomLists(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse custom lists", e);
                }
            }
        }
    }, [user?._id]);

    // Fetch all users in the institute for starting a new chat or building custom lists
    useEffect(() => {
        if (showListsIntro || showAddUsers) {
            const fetchDirectory = async () => {
                try {
                    setLoadingDirectory(true);
                    const { data } = await axios.get('/api/chat/directory');
                    setDirectoryUsers(data);
                    setLoadingDirectory(false);
                } catch (error) {
                    console.error("Error loading chat directory:", error);
                    toast.error("Failed to load user directory");
                    setLoadingDirectory(false);
                }
            };
            fetchDirectory();
        }
    }, [showListsIntro, showAddUsers]);

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
    const [inboxConfigs, setInboxConfigs] = useState([]);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const pendingContactIdRef = useRef(null);   // holds openContactId from notification
    const pendingDoubtRef = useRef(null);        // holds { testId, questionIndex } from doubt notification

    // File attachment states & refs
    const [attachedFile, setAttachedFile] = useState(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState('');
    const fileInputRef = useRef(null);
    const scrollContainerRef = useRef(null);

    // Infinite pagination & Search states
    const [limitDays, setLimitDays] = useState(3);
    const [doubtLimitDays, setDoubtLimitDays] = useState(3);
    const [showSearch, setShowSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchDate, setSearchDate] = useState('');

    const prevLimitDays = useRef(3);
    const prevDoubtLimitDays = useRef(3);

    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const oldScrollHeightRef = useRef(0);

    // Refs to keep socket handler always reading current state (avoids stale closure)
    const selectedContactRef = useRef(null);
    const selectedTestIdRef = useRef(null);
    const selectedQuestionIndexRef = useRef(null);
    const userRef = useRef(user);


    // Keep refs in sync with current state
    useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
    useEffect(() => { selectedTestIdRef.current = selectedTestId; }, [selectedTestId]);
    useEffect(() => { selectedQuestionIndexRef.current = selectedQuestionIndex; }, [selectedQuestionIndex]);
    useEffect(() => { userRef.current = user; }, [user]);

    // Fetch contacts list
    const fetchContacts = async () => {
        try {
            setLoadingContacts(true);
            const { data } = await axios.get('/api/chat/contacts');
            setContacts(data);
            setLoadingContacts(false);
            // If navigated from a notification, auto-select the contact immediately
            // (no extra render cycle — eliminates blink)
            const pendingId = pendingContactIdRef.current;
            if (pendingId) {
                const match = data.find(c => String(c._id) === String(pendingId));
                if (match) {
                    setSelectedContact(match);
                    setMobileActiveTab('chat');
                    // If it's a doubt notification, open the test sidebar right away
                    if (pendingDoubtRef.current) {
                        setShowSidebarTests(true);
                    }
                }
                pendingContactIdRef.current = null;
            }
        } catch (error) {
            console.error("Error loading chat contacts:", error);
            toast.error("Failed to load contacts");
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        // Capture openContactId (and doubt context) from notification BEFORE fetching
        pendingContactIdRef.current = location.state?.openContactId || null;
        if (location.state?.isDoubt && location.state?.testId != null) {
            pendingDoubtRef.current = {
                testId: String(location.state.testId),
                questionIndex: location.state.questionIndex
            };
        }
        fetchContacts();
        // Clear all chat notifications — user is now on the chat page
        setChatNotifications([]);
    }, []);

    // Handle notification click when user is ALREADY on the chat page
    // (component doesn't remount so the above useEffect[] won't run again)
    useEffect(() => {
        const openId = location.state?.openContactId;
        if (!openId) return;

        // Clear the notification
        setChatNotifications(prev => prev.filter(n => String(n.senderId) !== String(openId)));

        // If it's a doubt notification, store the context
        if (location.state?.isDoubt && location.state?.testId != null) {
            pendingDoubtRef.current = {
                testId: String(location.state.testId),
                questionIndex: location.state.questionIndex
            };
        } else {
            pendingDoubtRef.current = null;
        }

        if (contacts.length > 0) {
            // Contacts already loaded — select immediately
            const match = contacts.find(c => String(c._id) === String(openId));
            if (match) {
                setSelectedContact(match);
                setMobileActiveTab('chat');
                // If doubt, open the test sidebar (student tests fetch will fire)
                if (pendingDoubtRef.current) {
                    setShowSidebarTests(true);
                }
            }
        } else {
            // Contacts not yet loaded — store for fetchContacts to pick up
            pendingContactIdRef.current = openId;
        }
    }, [location.state?.openContactId]); // eslint-disable-line


    // Reset states when contact is selected
    useEffect(() => {
        if (!selectedContact) return;
        setMessages([]); // Clear previous messages
        setLimitDays(3);
        setDoubtLimitDays(3);
        setSearchKeyword('');
        setSearchDate('');
        setShowSearch(false);
        setIsTyping(false);
        setIsDoubtTyping(false);
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
        setAttachedFile(null);
        setIsUploadingFile(false);
        prevLimitDays.current = 3;
        prevDoubtLimitDays.current = 3;
    }, [selectedContact]);

    // Load messages when contact, limitDays, or search queries change
    useEffect(() => {
        if (!selectedContact) return;

        const fetchMessages = async () => {
            try {
                const isInitial = limitDays === 3;
                if (isInitial || searchKeyword || searchDate) {
                    setLoadingMessages(true);
                } else {
                    setIsFetchingMore(true);
                }

                let url = `/api/chat/messages/${selectedContact._id}?limitDays=${limitDays}`;
                if (searchKeyword) url += `&search=${encodeURIComponent(searchKeyword)}`;
                if (searchDate) url += `&date=${searchDate}`;

                const { data } = await axios.get(url);

                setMessages(data);

                // Scroll to bottom on initial fetch or search update
                if (limitDays === 3 || searchKeyword || searchDate) {
                    scrollToBottom();
                }

                // Mark as read (only if not searching)
                if (!searchKeyword && !searchDate) {
                    await axios.put(`/api/chat/messages/${selectedContact._id}/read`);
                    setContacts(prev => prev.map(c =>
                        c._id === selectedContact._id ? { ...c, unreadCount: 0 } : c
                    ));
                }
            } catch (error) {
                console.error("Error loading message history:", error);
                toast.error("Failed to load chat history");
            } finally {
                setLoadingMessages(false);
                setIsFetchingMore(false);
            }
        };

        fetchMessages();
    }, [selectedContact, limitDays, searchKeyword, searchDate]);

    // Load student tests when "Test Relevant Chat" is enabled
    // Works for both Teacher (viewing student's tests) and Student (viewing their own tests)
    useEffect(() => {
        const isTeacherViewingStudent = showSidebarTests && selectedContact && selectedContact.role === 'Student' && user.role === 'Teacher';
        const isStudentViewingOwn = showSidebarTests && user.role === 'Student' && selectedContact && (selectedContact.role === 'Teacher' || selectedContact.role === 'Admin');

        if (!isTeacherViewingStudent && !isStudentViewingOwn) {
            return;
        }

        // For teacher: fetch the selected student's tests. For student: fetch their own tests.
        const targetStudentId = user.role === 'Student' ? user._id : selectedContact._id;

        const fetchStudentTestsAndConfigs = async () => {
            try {
                setLoadingStudentTests(true);
                const [testsRes, configsRes] = await Promise.all([
                    axios.get(`/api/chat/student-tests/${targetStudentId}`),
                    axios.get(`/api/users/inbox-configs/${targetStudentId}`).catch(() => ({ data: [] }))
                ]);
                const data = testsRes.data || [];
                setStudentTests(data);
                setInboxConfigs(configsRes.data || []);
                setLoadingStudentTests(false);

                // If we came from a doubt notification, auto-select the test+question
                const pending = pendingDoubtRef.current;
                if (pending && pending.testId) {
                    const matchTest = data.find(t => String(t._id) === pending.testId);
                    if (matchTest) {
                        // Expand the inbox that contains this test
                        const inboxId = matchTest.index || 'No Index';
                        setSelectedInboxId(inboxId);
                        setExpandedInboxId(inboxId);
                        setExpandedTestId(String(matchTest._id));
                        setSelectedTestId(String(matchTest._id));
                        if (pending.questionIndex !== null && pending.questionIndex !== undefined) {
                            setSelectedQuestionIndex(pending.questionIndex);
                        }
                    }
                    pendingDoubtRef.current = null;
                }
            } catch (error) {
                console.error("Error loading student tests:", error);
                toast.error("Failed to load assigned tests");
                setLoadingStudentTests(false);
            }
        };

        fetchStudentTestsAndConfigs();
    }, [showSidebarTests, selectedContact, user]);

    // Load all test messages for active doubt detection in inbox grid
    useEffect(() => {
        const isTeacherViewingStudent = showSidebarTests && selectedContact && selectedContact.role === 'Student' && user.role === 'Teacher';
        const isStudentViewingOwn = showSidebarTests && user.role === 'Student' && selectedContact && (selectedContact.role === 'Teacher' || selectedContact.role === 'Admin');

        if (!isTeacherViewingStudent && !isStudentViewingOwn) {
            return;
        }

        const contactId = selectedContact._id;
        const fetchAllTestMessages = async () => {
            try {
                const { data } = await axios.get(`/api/chat/messages/${contactId}`);
                setAllStudentTestMessages(data.filter(m => m.test));
            } catch (error) {
                console.error('Error loading test messages for active doubt detection:', error);
            }
        };

        fetchAllTestMessages();
    }, [showSidebarTests, selectedContact, user]);

    // Reset doubt limits when test or question index changes
    useEffect(() => {
        setDoubtLimitDays(3);
        setDoubtMessages([]);
        setIsDoubtTyping(false);
        prevDoubtLimitDays.current = 3;
    }, [selectedTestId, selectedQuestionIndex]);

    // Load doubt messages when a specific test question is selected
    // For teacher: fetch by student (selectedContact._id)
    // For student: fetch by their own ID
    useEffect(() => {
        setAttachedFile(null);
        setIsUploadingFile(false);
        if (!selectedContact || selectedTestId === null || selectedQuestionIndex === null) {
            setDoubtMessages([]);
            return;
        }

        const targetStudentId = user.role === 'Student' ? user._id : selectedContact._id;

        const fetchDoubtMessages = async () => {
            try {
                const isInitial = doubtLimitDays === 3;
                if (isInitial || searchKeyword || searchDate) {
                    setLoadingDoubtMessages(true);
                } else {
                    setIsFetchingMore(true);
                }

                let url = `/api/chat/test-doubt-messages/${targetStudentId}/${selectedTestId}?questionIndex=${selectedQuestionIndex}&limitDays=${doubtLimitDays}`;
                if (searchKeyword) url += `&search=${encodeURIComponent(searchKeyword)}`;
                if (searchDate) url += `&date=${searchDate}`;

                const { data } = await axios.get(url);

                setDoubtMessages(data);

                // Scroll to bottom on initial load or search update
                if (doubtLimitDays === 3 || searchKeyword || searchDate) {
                    scrollToBottom();
                }
            } catch (error) {
                console.error('Error loading doubt messages:', error);
                toast.error('Failed to load doubt chat');
            } finally {
                setLoadingDoubtMessages(false);
                setIsFetchingMore(false);
            }
        };

        fetchDoubtMessages();
    }, [selectedContact, selectedTestId, selectedQuestionIndex, doubtLimitDays, searchKeyword, searchDate, user]);

    // Also fetch ALL messages for the student across all tests (so inbox grid can detect active doubts)
    // We do this separately by querying test-doubt-messages for each test in the inbox
    // The allStudentTestMessages + doubtMessages together power both the grid and the chat view

    // Populate testDoubtCounts when studentTests loads
    useEffect(() => {
        if (!selectedContact || studentTests.length === 0) return;

        // For teacher: look up by student (selectedContact._id). For student: use own ID.
        const targetStudentId = user.role === 'Student' ? user._id : selectedContact._id;

        const fetchCounts = async () => {
            const counts = {};
            await Promise.all(studentTests.map(async (test) => {
                try {
                    const { data } = await axios.get(
                        `/api/chat/test-doubt-messages/${targetStudentId}/${test._id}`
                    );
                    if (data.length > 0) {
                        const qMap = { _hasMessages: true };
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
    }, [selectedContact, studentTests, user]);

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

        const mapped = Object.keys(grouped)
            .sort((a, b) => getNum(a) - getNum(b))
            .map(indexStr => {
                const filteredTests = grouped[indexStr].filter(test => {
                    const testId = String(test._id);
                    const doubtData = testDoubtCounts[testId];
                    return doubtData && (Object.keys(doubtData).length > 0 || doubtData._hasMessages);
                });

                const config = inboxConfigs.find(c => c.inboxId?.trim().toLowerCase() === indexStr.trim().toLowerCase());
                const customTitle = config && config.displayName ? config.displayName : getDisplayTitle(indexStr);

                return {
                    id: indexStr,
                    title: customTitle,
                    tests: filteredTests
                };
            });

        return mapped.filter(inbox => inbox.tests.length > 0);
    }, [studentTests, testDoubtCounts, inboxConfigs, user]);

    // Handle real-time socket events for chat
    // Uses refs so the handler always has current values without re-registering on every state change
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (msg) => {
            const curContact = selectedContactRef.current;
            const curTestId = selectedTestIdRef.current;
            const curQIndex = selectedQuestionIndexRef.current;
            const curUser = userRef.current;

            // If it's a test doubt message
            const isDoubtMsgFromContact = curContact && msg.sender === curContact._id && msg.test;
            const isDoubtReplyToStudent = curUser?.role === 'Student' && msg.receiver === curUser._id && msg.test && String(msg.test) === String(curTestId);

            if (isDoubtMsgFromContact || isDoubtReplyToStudent) {
                if (String(msg.test) === String(curTestId) && msg.questionIndex === curQIndex) {
                    setDoubtMessages(prev => [...prev, msg]);
                    scrollToBottom();
                }
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

            // General chat message from the currently open contact
            if (curContact && msg.sender === curContact._id && !msg.test) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
                axios.put(`/api/chat/messages/${curContact._id}/read`).catch(err => {
                    console.error('Error marking message as read:', err);
                });
            } else {
                // Message from someone else — bump unread count
                setContacts(prev => prev.map(c => {
                    if (c._id === msg.sender) {
                        return {
                            ...c,
                            unreadCount: (c.unreadCount || 0) + 1,
                            lastMessage: {
                                text: msg.text || (msg.fileType?.startsWith('image/') ? '📷 Photo' : '📁 Document'),
                                sender: msg.sender,
                                createdAt: msg.createdAt,
                                fileUrl: msg.fileUrl,
                                fileName: msg.fileName,
                                fileType: msg.fileType
                            }
                        };
                    }
                    return c;
                }));
            }
        };

        const handleTypingStatus = (data) => {
            console.log("[SOCKET] Received typing-status:", data);
            const { senderId, isTyping: typing, test, questionIndex } = data || {};
            console.log("[SOCKET] Current Refs: contactId =", selectedContactRef.current?._id, "testId =", selectedTestIdRef.current, "qIndex =", selectedQuestionIndexRef.current);
            if (selectedContactRef.current && senderId === selectedContactRef.current._id) {
                if (test && questionIndex !== undefined) {
                    const matchTest = String(test) === String(selectedTestIdRef.current);
                    const matchQ = String(questionIndex) === String(selectedQuestionIndexRef.current);
                    console.log("[SOCKET] Doubt typing check: matchTest =", matchTest, "matchQ =", matchQ);
                    if (matchTest && matchQ) {
                        setIsDoubtTyping(typing);
                    } else {
                        setIsDoubtTyping(false);
                    }
                } else {
                    setIsTyping(typing);
                }
            }
        };

        const handleMessageEdited = ({ messageId, text, isEdited, originalText }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === messageId) return { ...m, text, isEdited, originalText };
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
    }, [socket]); // Only re-register when socket itself changes — refs handle the rest


    const prevMessagesLength = useRef(0);
    const prevDoubtLength = useRef(0);

    // Auto-scroll logic
    const scrollToBottom = (behavior = 'smooth') => {
        const doScroll = () => {
            const container = scrollContainerRef.current;
            const end = messagesEndRef.current;
            if (container) {
                if (behavior === 'auto') {
                    container.scrollTop = container.scrollHeight;
                } else {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior
                    });
                }
            }
            // Double fallback using scrollIntoView
            end?.scrollIntoView({ behavior: behavior === 'auto' ? 'auto' : 'smooth' });
        };

        // Scroll immediately
        doScroll();

        // Scroll again progressively to account for DOM layout passes, style applications, and image/media loading
        setTimeout(doScroll, 50);
        setTimeout(doScroll, 150);
        setTimeout(doScroll, 300);
        setTimeout(doScroll, 600);
        setTimeout(doScroll, 1000);
    };

    const handleScroll = (e) => {
        const container = e.currentTarget;
        if (container.scrollTop === 0 && !loadingMessages && !loadingDoubtMessages && !isFetchingMore && !searchKeyword && !searchDate) {
            const isDoubt = selectedTestId !== null && selectedQuestionIndex !== null;
            if (isDoubt) {
                if (container.scrollHeight > container.clientHeight) {
                    oldScrollHeightRef.current = container.scrollHeight;
                    setDoubtLimitDays(prev => prev + 1);
                }
            } else {
                if (container.scrollHeight > container.clientHeight) {
                    oldScrollHeightRef.current = container.scrollHeight;
                    setLimitDays(prev => prev + 1);
                }
            }
        }
    };

    // Auto scroll when general messages update
    useEffect(() => {
        if (!loadingMessages && messages.length > 0) {
            if (limitDays === prevLimitDays.current) {
                const behavior = messages.length - prevMessagesLength.current === 1 ? 'smooth' : 'auto';
                scrollToBottom(behavior);
            }
        }
        prevMessagesLength.current = messages.length;
        prevLimitDays.current = limitDays;
    }, [loadingMessages, messages, limitDays]);

    // Auto scroll when doubt messages update
    useEffect(() => {
        if (!loadingDoubtMessages && doubtMessages.length > 0) {
            if (doubtLimitDays === prevDoubtLimitDays.current) {
                const behavior = doubtMessages.length - prevDoubtLength.current === 1 ? 'smooth' : 'auto';
                scrollToBottom(behavior);
            }
        }
        prevDoubtLength.current = doubtMessages.length;
        prevDoubtLimitDays.current = doubtLimitDays;
    }, [loadingDoubtMessages, doubtMessages, doubtLimitDays]);

    // Auto scroll to bottom when typing status starts
    useEffect(() => {
        if (isTyping) {
            scrollToBottom('smooth');
        }
    }, [isTyping]);

    useEffect(() => {
        if (isDoubtTyping) {
            scrollToBottom('smooth');
        }
    }, [isDoubtTyping]);

    // Zero-jitter Scroll Restoration for pagination prepending
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (container && oldScrollHeightRef.current > 0) {
            const newHeight = container.scrollHeight;
            container.scrollTop = newHeight - oldScrollHeightRef.current;
            oldScrollHeightRef.current = 0; // reset
        }
    }, [messages, doubtMessages]);

    const startEditing = (msg) => {
        setEditingMessageId(msg._id);
        setNewMessage(msg.text);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setNewMessage('');
        handleStopTyping();
    };

    // File upload logic
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset file input value so same file can be selected again
        e.target.value = '';

        if (file.size > 50 * 1024 * 1024) {
            toast.error("File size cannot exceed 50MB");
            return;
        }

        setUploadingFileName(file.name);
        setIsUploadingFile(true);
        setAttachedFile(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await axios.post('/api/chat/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setAttachedFile({
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileType: data.fileType
            });
            toast.success("File uploaded successfully");
        } catch (error) {
            console.error("File upload failed:", error);
            toast.error(error.response?.data?.message || "File upload failed");
        } finally {
            setIsUploadingFile(false);
        }
    };

    const clearAttachment = () => {
        setAttachedFile(null);
        setIsUploadingFile(false);
        setUploadingFileName('');
    };

    // Send or edit chat message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (editingMessageId) {
            if (!newMessage.trim()) return;
            const messageText = newMessage;
            setNewMessage('');
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

        if (!newMessage.trim() && !attachedFile) return;
        if (!selectedContact) return;

        const messageText = newMessage;
        setNewMessage('');

        const currentAttachment = attachedFile;
        setAttachedFile(null);

        try {
            const isDoubtChat = selectedTestId !== null && selectedQuestionIndex !== null;

            const receiverId = selectedContact._id;

            const payload = {
                receiver: receiverId,
                text: messageText
            };

            if (currentAttachment) {
                payload.fileUrl = currentAttachment.fileUrl;
                payload.fileName = currentAttachment.fileName;
                payload.fileType = currentAttachment.fileType;
            }

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
                    fileUrl: data.fileUrl,
                    fileName: data.fileName,
                    fileType: data.fileType,
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
                            text: messageText || (data.fileType?.startsWith('image/') ? '📷 Photo' : '📁 Document'),
                            sender: user._id,
                            createdAt: data.createdAt,
                            fileUrl: data.fileUrl,
                            fileName: data.fileName,
                            fileType: data.fileType
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
            setAttachedFile(currentAttachment);
        }
    };

    // Typing indicators
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !selectedContact) return;

        // Emit typing status using refs to prevent stale closure bugs
        const currentTestId = selectedTestIdRef.current;
        const currentQIndex = selectedQuestionIndexRef.current;
        const isDoubt = currentTestId !== null && currentQIndex !== null;
        console.log("[SOCKET] Emitting typing: target =", selectedContact._id, "isDoubt =", isDoubt, "test =", currentTestId, "qIndex =", currentQIndex);
        socket.emit('typing', {
            targetId: selectedContact._id,
            ...(isDoubt ? { test: currentTestId, questionIndex: currentQIndex } : {})
        });

        // Throttle/Timeout to stop typing status after inactivity
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            handleStopTyping();
        }, 2000);
    };

    const handleStopTyping = () => {
        if (socket && selectedContact) {
            const currentTestId = selectedTestIdRef.current;
            const currentQIndex = selectedQuestionIndexRef.current;
            const isDoubt = currentTestId !== null && currentQIndex !== null;
            socket.emit('stop-typing', {
                targetId: selectedContact._id,
                ...(isDoubt ? { test: currentTestId, questionIndex: currentQIndex } : {})
            });
        }
    };

    const selectContactHandler = (contact) => {
        const exists = contacts.some(c => String(c._id) === String(contact._id));
        if (!exists) {
            setContacts(prev => [contact, ...prev]);
        }
        setSelectedContact(contact);
        setMobileActiveTab('chat');
        setSelectedTestId(null);
        setSelectedQuestionIndex(null);
    };

    const handleSaveCustomList = () => {
        if (!draftListName.trim() || draftSelectedUsers.length === 0) {
            toast.error("Please provide a name and select at least one user.");
            return;
        }

        const newList = {
            id: 'list_' + Date.now(),
            name: draftListName.trim(),
            users: draftSelectedUsers
        };

        const updated = [...customLists, newList];
        setCustomLists(updated);
        localStorage.setItem(`chat_lists_${user._id}`, JSON.stringify(updated));

        toast.success(`List "${draftListName}" created successfully!`);
        setShowCreateList(false);
        setDraftListName('');
        setDraftSelectedUsers([]);
        setActiveFilterTab(newList.id);
    };

    // Combine core filters with custom lists
    const filterTabs = useMemo(() => {
        const core = ['All', 'Teacher', 'Editor', 'Student'];
        const customItems = customLists.map(l => ({ id: l.id, name: l.name }));
        return [...core, ...customItems];
    }, [customLists]);

    const isContactAllowed = (contact) => {
        if (!user) return true;
        
        // Student controls
        if (user.role === 'Student') {
            const chatCtrl = user.studentProfile?.controls?.chat;
            if (!chatCtrl) return true;
            if (chatCtrl.enabled === false) return false;

            const role = contact.role;
            if (role === 'Teacher') {
                return chatCtrl.chatWithTeacher !== false;
            }
            if (role === 'Admin' || role === 'Institute') {
                return chatCtrl.chatWithAdmin !== false;
            }
            if (role === 'Editor') {
                return chatCtrl.chatWithEditor !== false;
            }
            return true;
        }

        // Teacher controls
        if (user.role === 'Teacher') {
            const chatCtrl = user.teacherProfile?.controls?.chat;
            if (!chatCtrl) return true;
            if (chatCtrl.enabled === false) return false;

            const role = contact.role;
            if (role === 'Student') {
                return chatCtrl.chatStudent !== false;
            }
            if (role === 'Editor') {
                return chatCtrl.chatEditor !== false;
            }
            if (role === 'Admin' || role === 'Institute' || role === 'Teacher') {
                return chatCtrl.chatInstitute !== false;
            }
            return true;
        }

        return true;
    };

    // Enhanced contacts list that includes custom list users so they can be chatted with instantly
    const allAvailableContacts = useMemo(() => {
        let list = [...contacts];
        customLists.forEach(cl => {
            if (cl.users) {
                cl.users.forEach(u => {
                    if (!list.some(c => String(c._id) === String(u._id))) {
                        list.push(u);
                    }
                });
            }
        });
        if (user?.role === 'Student' || user?.role === 'Teacher') {
            list = list.filter(isContactAllowed);
        }
        return list;
    }, [contacts, customLists, user]);

    useEffect(() => {
        if (selectedContact && !isContactAllowed(selectedContact)) {
            setSelectedContact(null);
            if (mobileActiveTab === 'chat') {
                setMobileActiveTab('list');
            }
        }
    }, [selectedContact, user]);

    // Filters contacts based on search keyword and active filter tab
    const filteredContacts = useMemo(() => {
        return allAvailableContacts.filter(contact => {
            const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email.toLowerCase().includes(searchTerm.toLowerCase());

            // Check if activeFilterTab is a custom list ID
            const activeCustomList = customLists.find(l => l.id === activeFilterTab);
            if (activeCustomList) {
                const isInCustomList = activeCustomList.users?.some(u => String(u._id) === String(contact._id));
                return matchesSearch && isInCustomList;
            }

            // Otherwise, filter by core role
            const matchesTab = activeFilterTab === 'All' || contact.role === activeFilterTab;
            return matchesSearch && matchesTab;
        });
    }, [allAvailableContacts, searchTerm, activeFilterTab, customLists]);

    const isContactOnline = (contactId) => {
        return onlineUsers.includes(contactId);
    };

    const formatMessageTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderHighlightedText = (text, keyword) => {
        if (!keyword || !text) return text;
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 text-slate-950 rounded-sm px-0.5 font-black">
                    {part}
                </mark>
            ) : (
                part
            )
        );
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

    const chatCtrl = user?.role === 'Student' 
        ? user?.studentProfile?.controls?.chat 
        : (user?.role === 'Teacher' ? user?.teacherProfile?.controls?.chat : null);
    const isChatDisabled = (user?.role === 'Student' || user?.role === 'Teacher') && chatCtrl?.enabled === false;
    const chatMode = chatCtrl?.mode || 'hide';

    if (isChatDisabled && chatMode === 'hide') {
        return (
            <DashboardLayout role={user?.role} fullWidth={true}>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                        <Lock size={28} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Feature Restricted</h2>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Chat features have been disabled by your administrator.
                    </p>
                    {chatCtrl?.note && (
                        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-2 font-bold max-w-sm">
                            Reason: {chatCtrl.note}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role={user?.role} fullWidth={true}>
            <div className={`relative flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[500px] ${isChatDisabled ? 'opacity-60 pointer-events-none select-none' : ''}`}>
                {isChatDisabled && (
                    <div 
                        title={chatCtrl?.note || 'Chat features are Disabled'}
                        className="absolute inset-0 bg-slate-50/10 backdrop-blur-[0.5px] z-50 flex items-center justify-center pointer-events-auto cursor-not-allowed"
                    >
                        <div className="bg-[#0b1329] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-800 animate-slide-up">
                            <Lock size={16} className="text-amber-500" />
                            <span className="text-xs font-bold">Chat features are Disabled{chatCtrl?.note ? ` - ${chatCtrl.note}` : ''}</span>
                        </div>
                    </div>
                )}
                {/* Left Side Pane: Contact List */}
                <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-100 flex-shrink-0 ${mobileActiveTab === 'chat' ? 'hidden md:flex' : 'flex'
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
                                {user.role === 'Student' ? 'My Test Doubts' : 'Test Relevant Chats'}
                            </h1>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 truncate">
                                {user.role === 'Student' ? `With: ${selectedContact.name}` : `For: ${selectedContact.name}`}
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

                            {/* Contact Filter Tabs & Custom Lists & Create Button */}
                            <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto pb-1 scrollbar-thin">
                                {filterTabs.map((tab) => {
                                    const tabId = typeof tab === 'object' ? tab.id : tab;
                                    const tabLabel = typeof tab === 'object' ? tab.name : (tab === 'All' ? 'All' : `${tab}s`);
                                    const isActive = activeFilterTab === tabId;
                                    return (
                                        <button
                                            key={tabId}
                                            type="button"
                                            onClick={() => setActiveFilterTab(tabId)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer ${isActive
                                                ? 'bg-indigo-600 border-indigo-650 text-white shadow-md shadow-indigo-150/30'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                                }`}
                                        >
                                            {tabLabel}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => {
                                        setDraftListName('');
                                        setDraftSelectedUsers([]);
                                        setShowListsIntro(true);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 border border-slate-200 flex items-center justify-center transition-all cursor-pointer font-black text-sm shrink-0 ml-auto"
                                    title="Create Chat List"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {showSidebarTests && selectedContact ? (
                            <div className="p-4 space-y-3 bg-slate-50/10">
                                <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider block mb-1">
                                    {user.role === 'Student' ? 'MY INBOXES' : 'ASSIGNED INBOXES'}
                                </span>
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
                                                    className={`w-full text-left py-3 px-4 flex items-center justify-between text-xs font-black rounded-2xl border transition-all ${isSelectedInbox
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
                                        {user.role === 'Student' ? 'No inboxes found for your account.' : 'No assigned tests/inboxes found for this student.'}
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
                                        className={`flex flex-col transition-colors border-b border-slate-100/50 relative ${isSelected ? 'bg-indigo-50/20' : 'hover:bg-slate-50/30'
                                            }`}
                                    >
                                        {/* Clickable Header Info card */}
                                        <div
                                            onClick={() => selectContactHandler(c)}
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
                                                            <span className="font-medium text-slate-500">
                                                                You: {c.lastMessage.text || (c.lastMessage.fileType?.startsWith('image/') ? '📷 Photo' : '📁 Document')}
                                                            </span>
                                                        ) : (
                                                            c.lastMessage.text || (c.lastMessage.fileType?.startsWith('image/') ? '📷 Photo' : '📁 Document')
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
                <div className={`flex-1 flex flex-col bg-slate-50/50 ${mobileActiveTab === 'list' ? 'hidden md:flex' : 'flex'
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
                                    {((user.role === 'Teacher' && selectedContact.role === 'Student') ||
                                        (user.role === 'Student' && (selectedContact.role === 'Teacher' || selectedContact.role === 'Admin'))) && (
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
                                                {(selectedTestId !== null || selectedInboxId !== null)
                                                    ? 'Show General Chat'
                                                    : (showSidebarTests
                                                        ? (user.role === 'Student' ? 'Hide My Doubts' : 'Hide Test Chat')
                                                        : (user.role === 'Student' ? 'My Test Doubts' : 'Test Relevant Chat')
                                                    )
                                                }
                                            </button>
                                        )}
                                    <button
                                        onClick={() => setShowSearch(prev => !prev)}
                                        className={`p-2.5 rounded-xl transition-all active:scale-95 shadow-sm border ${showSearch
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-650'
                                            : 'bg-white border-slate-100 text-slate-550 hover:bg-slate-50'
                                            }`}
                                        title="Search Chat History"
                                    >
                                        <Search size={16} />
                                    </button>
                                    {/* Audio Call Button */}
                                    {(!user || (user.role !== 'Student' && user.role !== 'Teacher') || chatCtrl?.audioCall !== false || chatCtrl?.mode === 'disable') && (
                                        <button
                                            onClick={() => {
                                                if (chatCtrl && chatCtrl.audioCall === false) {
                                                    toast.error(chatCtrl.subNotes?.audioCall || chatCtrl.note || "Audio calling is disabled by your administrator.");
                                                    return;
                                                }
                                                callUser(selectedContact._id, selectedContact.name, selectedContact.role, 'audio');
                                            }}
                                            className={`p-2.5 border border-slate-100 rounded-xl transition-all active:scale-95 shadow-sm bg-white 
                                                ${(chatCtrl && chatCtrl.audioCall === false) 
                                                    ? 'opacity-40 cursor-not-allowed text-slate-300' 
                                                    : 'text-slate-550 hover:bg-slate-50'}`}
                                            title={chatCtrl && chatCtrl.audioCall === false
                                                ? (chatCtrl.subNotes?.audioCall || chatCtrl.note || "Voice call is disabled")
                                                : "Voice Call"
                                            }
                                        >
                                            <Phone size={16} />
                                        </button>
                                    )}

                                    {/* Video Call Button */}
                                    {(!user || (user.role !== 'Student' && user.role !== 'Teacher') || chatCtrl?.videoCall !== false || chatCtrl?.mode === 'disable') && (
                                        <button
                                            onClick={() => {
                                                if (chatCtrl && chatCtrl.videoCall === false) {
                                                    toast.error(chatCtrl.subNotes?.videoCall || chatCtrl.note || "Video calling is disabled by your administrator.");
                                                    return;
                                                }
                                                callUser(selectedContact._id, selectedContact.name, selectedContact.role, 'video');
                                            }}
                                            className={`p-2.5 border border-slate-100 rounded-xl transition-all active:scale-95 shadow-sm bg-white 
                                                ${(chatCtrl && chatCtrl.videoCall === false) 
                                                    ? 'opacity-40 cursor-not-allowed text-slate-300' 
                                                    : 'text-slate-550 hover:bg-slate-50'}`}
                                            title={chatCtrl && chatCtrl.videoCall === false
                                                ? (chatCtrl.subNotes?.videoCall || chatCtrl.note || "Video call is disabled")
                                                : "Video Call"
                                            }
                                        >
                                            <Video size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search filters panel */}
                            {showSearch && (
                                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2.5 items-center justify-between animate-fade-in flex-shrink-0">
                                    <div className="flex flex-1 gap-2.5 min-w-[280px]">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search messages..."
                                                value={searchKeyword}
                                                onChange={(e) => setSearchKeyword(e.target.value)}
                                                className="w-full bg-white border border-slate-150 rounded-xl py-1.5 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50"
                                            />
                                        </div>
                                        <div className="relative w-36 sm:w-44 flex-shrink-0">
                                            <input
                                                type="date"
                                                value={searchDate}
                                                onChange={(e) => setSearchDate(e.target.value)}
                                                className="w-full bg-white border border-slate-150 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50"
                                            />
                                        </div>
                                    </div>
                                    {(searchKeyword || searchDate) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchKeyword('');
                                                setSearchDate('');
                                            }}
                                            className="text-xs font-black text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100/50 px-2.5 py-1.5 rounded-xl transition-all"
                                        >
                                            <X size={12} />
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}

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
                                    <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
                                        {activeQuestionMessages.length === 0 ? (
                                            <div className="text-center py-20 select-none">
                                                <MessageSquare size={48} className="mx-auto text-slate-200 mb-3 animate-pulse" />
                                                <h4 className="font-bold text-slate-700 text-sm">
                                                    {(searchKeyword || searchDate) ? "No doubts found" : "No doubts raised"}
                                                </h4>
                                                <p className="text-slate-405 text-xs mt-1">
                                                    {(searchKeyword || searchDate)
                                                        ? "Try clearing your search filters to see all doubt messages."
                                                        : "Send a message below to start discussion about this question."
                                                    }
                                                </p>
                                            </div>
                                        ) : (
                                            activeQuestionMessages.map(msg => {
                                                const isSelf = msg.sender === user._id;
                                                return (
                                                    <div key={msg._id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] rounded-3xl px-4 py-2.5 shadow-sm ${isSelf
                                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                                            }`}>
                                                            {msg.fileUrl && (
                                                                <div className="mb-2 max-w-xs overflow-hidden rounded-2xl border border-slate-100/10">
                                                                    {msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                            <img src={msg.fileUrl} alt={msg.fileName || 'Attached Image'} onLoad={() => scrollToBottom('smooth')} className="max-w-full h-auto max-h-60 object-cover hover:opacity-90 transition-opacity" />
                                                                        </a>
                                                                    ) : (
                                                                        <div className={`flex items-center gap-3 p-3 rounded-2xl ${isSelf ? 'bg-indigo-700/50 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                                                            <File size={24} className={isSelf ? 'text-indigo-200' : 'text-indigo-600'} />
                                                                            <div className="flex-1 min-w-0 text-left">
                                                                                <p className="text-xs font-bold truncate">{msg.fileName || 'Attachment'}</p>
                                                                                <span className="text-[10px] opacity-75 uppercase">{msg.fileType ? msg.fileType.split('/')[1] : 'FILE'}</span>
                                                                            </div>
                                                                            <a
                                                                                href={msg.fileUrl}
                                                                                download={msg.fileName}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className={`p-1.5 rounded-xl hover:bg-black/10 transition-colors ${isSelf ? 'text-white' : 'text-slate-600'}`}
                                                                                title="Download file"
                                                                            >
                                                                                <Download size={16} />
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {msg.text && <p className="text-sm font-medium leading-relaxed break-words">{renderHighlightedText(msg.text, searchKeyword)}</p>}
                                                            <span className={`text-[8px] font-bold block text-right mt-1 ${isSelf ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                                {formatMessageTime(msg.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        {isDoubtTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-white border border-slate-100 rounded-3xl rounded-tl-none px-4 py-3 flex items-center shadow-sm">
                                                    <div className="flex gap-1 items-center select-none py-0.5">
                                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Attachment Preview Box */}
                                    {(isUploadingFile || attachedFile) && (
                                        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 animate-fade-in flex-shrink-0">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {isUploadingFile ? (
                                                    <Loader2 size={16} className="animate-spin text-indigo-600 flex-shrink-0" />
                                                ) : (
                                                    <File size={16} className="text-indigo-600 flex-shrink-0" />
                                                )}
                                                <span className="text-xs font-semibold text-slate-600 truncate text-left">
                                                    {isUploadingFile ? `Uploading ${uploadingFileName}...` : attachedFile.fileName}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearAttachment}
                                                className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                                                title="Remove attachment"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Composer Form */}
                                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingFile}
                                            className="p-3 text-slate-550 hover:bg-slate-50 hover:text-indigo-600 border border-slate-100 rounded-2xl transition-all active:scale-95 shadow-sm bg-white flex-shrink-0 disabled:opacity-50"
                                            title="Attach File"
                                        >
                                            <Paperclip size={16} />
                                        </button>
                                        <input
                                            type="text"
                                            placeholder={user.role === 'Student' ? `Ask your doubt on Q${selectedQuestionIndex + 1}...` : `Reply to student doubt on Q${selectedQuestionIndex + 1}...`}
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={(!newMessage.trim() && !attachedFile) || isUploadingFile}
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
                                                {user.role === 'Student'
                                                    ? 'Below are questions where you raised doubts. Select one to open the chat.'
                                                    : 'Below are the questions from this test where the student has raised doubts. Select one to open the chat window.'
                                                }
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
                                                {user.role === 'Student'
                                                    ? 'Select a test below to view your doubts and continue conversations.'
                                                    : "Select a test below to view the student's doubts and chat messages."
                                                }
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
                                                     No tests with active doubts found in this inbox.
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
                                                                className={`w-full py-2.5 px-4 text-xs font-black rounded-2xl border transition-all flex items-center justify-center gap-2 shadow-sm ${hasDoubts
                                                                    ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 cursor-pointer'
                                                                    : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                <MessageSquare size={14} />
                                                                {hasDoubts
                                                                    ? (user.role === 'Student' ? 'View My Doubts' : 'View Test Doubts')
                                                                    : 'No Doubts Raised'}
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
                                    <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
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
                                                        <div className={`max-w-[70%] rounded-3xl px-4 py-2.5 shadow-sm ${isSelf
                                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                                            }`}>
                                                            {msg.fileUrl && (
                                                                <div className="mb-2 max-w-xs overflow-hidden rounded-2xl border border-slate-100/10">
                                                                    {msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                            <img src={msg.fileUrl} alt={msg.fileName || 'Attached Image'} onLoad={() => scrollToBottom('smooth')} className="max-w-full h-auto max-h-60 object-cover hover:opacity-90 transition-opacity" />
                                                                        </a>
                                                                    ) : (
                                                                        <div className={`flex items-center gap-3 p-3 rounded-2xl ${isSelf ? 'bg-indigo-700/50 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                                                            <File size={24} className={isSelf ? 'text-indigo-250' : 'text-indigo-600'} />
                                                                            <div className="flex-1 min-w-0 text-left">
                                                                                <p className="text-xs font-bold truncate">{msg.fileName || 'Attachment'}</p>
                                                                                <span className="text-[10px] opacity-75 uppercase">{msg.fileType ? msg.fileType.split('/')[1] : 'FILE'}</span>
                                                                            </div>
                                                                            <a
                                                                                href={msg.fileUrl}
                                                                                download={msg.fileName}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className={`p-1.5 rounded-xl hover:bg-black/10 transition-colors ${isSelf ? 'text-white' : 'text-slate-600'}`}
                                                                                title="Download file"
                                                                            >
                                                                                <Download size={16} />
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {msg.text && <p className="text-sm font-medium leading-relaxed break-words">{renderHighlightedText(msg.text, searchKeyword)}</p>}

                                                            {isSelf && msg.isEdited && showOriginalMap[msg._id] && (
                                                                <div className="text-[11px] text-indigo-105 bg-indigo-750/30 border border-indigo-500/10 rounded-2xl p-2 mt-1.5 break-words text-left">
                                                                    <span className="font-bold block text-[9px] uppercase tracking-wider text-indigo-300 mb-0.5">Original message</span>
                                                                    {renderHighlightedText(msg.originalText, searchKeyword)}
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
                                                                <span className={`text-[9px] font-bold block ${isSelf ? 'text-indigo-200' : 'text-slate-400'
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
                                                <h4 className="font-bold text-slate-700 text-sm">
                                                    {(searchKeyword || searchDate) ? "No messages found" : "Start conversation!"}
                                                </h4>
                                                <p className="text-slate-400 text-xs mt-1">
                                                    {(searchKeyword || searchDate)
                                                        ? "Try clearing your search filters to see all messages."
                                                        : `Send a message to start conversation with ${selectedContact.name}.`
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {/* Typing indicator panel */}
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-white border border-slate-100 rounded-3xl rounded-tl-none px-4 py-3 flex items-center shadow-sm">
                                                    <div className="flex gap-1 items-center select-none py-0.5">
                                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
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

                                    {/* Attachment Preview Box */}
                                    {(isUploadingFile || attachedFile) && (
                                        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 animate-fade-in flex-shrink-0">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {isUploadingFile ? (
                                                    <Loader2 size={16} className="animate-spin text-indigo-600 flex-shrink-0" />
                                                ) : (
                                                    <File size={16} className="text-indigo-600 flex-shrink-0" />
                                                )}
                                                <span className="text-xs font-semibold text-slate-650 truncate text-left">
                                                    {isUploadingFile ? `Uploading ${uploadingFileName}...` : attachedFile.fileName}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearAttachment}
                                                className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                                                title="Remove attachment"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Message composer box */}
                                    <form
                                        onSubmit={handleSendMessage}
                                        className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center flex-shrink-0"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingFile}
                                            className="p-3 text-slate-550 hover:bg-slate-50 hover:text-indigo-600 border border-slate-100 rounded-2xl transition-all active:scale-95 shadow-sm bg-white flex-shrink-0 disabled:opacity-50"
                                            title="Attach File"
                                        >
                                            <Paperclip size={16} />
                                        </button>
                                        <input
                                            type="text"
                                            placeholder="Type message here..."
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={(!newMessage.trim() && !attachedFile) || isUploadingFile}
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
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* 1. Lists Intro Modal */}
            {showListsIntro && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[32px] border border-slate-200 shadow-2xl p-6 flex flex-col relative">
                        {/* Close button */}
                        <button
                            onClick={() => setShowListsIntro(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer"
                        >
                            ✕
                        </button>

                        {/* Logo / Cards Art */}
                        <div className="flex justify-center gap-4 py-8 bg-indigo-50/20 rounded-3xl mb-6 mt-4">
                            {/* Heart Card */}
                            <div className="w-14 h-14 bg-white border border-slate-200/80 shadow-md rounded-2xl flex items-center justify-center -rotate-12 translate-x-2">
                                <span className="text-2xl text-emerald-500">❤️</span>
                            </div>
                            {/* Suitcase Card */}
                            <div className="w-14 h-14 bg-white border border-slate-200/85 shadow-md rounded-2xl flex items-center justify-center z-10 scale-110">
                                <span className="text-2xl text-indigo-500">💼</span>
                            </div>
                            {/* Plus Card */}
                            <div className="w-14 h-14 bg-white border border-slate-200/80 shadow-md rounded-2xl flex items-center justify-center rotate-12 -translate-x-2">
                                <span className="text-2xl text-emerald-400">➕</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="text-center space-y-2 mb-6">
                            <h3 className="font-extrabold text-slate-800 text-lg">Organise your chats with Lists</h3>
                        </div>

                        {/* Bullet points info */}
                        <div className="space-y-4 text-xs font-semibold text-slate-650 px-2 mb-6">
                            <div className="flex gap-3 items-start">
                                <span className="text-slate-400 mt-0.5">📁</span>
                                <p>Any list you create becomes a filter at the top of your Chats tab.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="text-slate-400 mt-0.5">🔒</span>
                                <p>Only you can see your lists.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="text-slate-400 mt-0.5">⚙️</span>
                                <p>Edit or delete your lists anytime to stay organised.</p>
                            </div>
                        </div>

                        {/* Action button */}
                        <button
                            onClick={() => {
                                setShowListsIntro(false);
                                setShowCreateList(true);
                            }}
                            className="w-full py-3 bg-emerald-550 hover:bg-emerald-650 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer text-center"
                        >
                            Continue
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* 2. Create New List Modal */}
            {showCreateList && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 shrink-0">
                            <button
                                onClick={() => {
                                    setShowCreateList(false);
                                    setShowListsIntro(true);
                                }}
                                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer"
                            >
                                ←
                            </button>
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-base">Create new list</h3>
                                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Set name and select members</p>
                            </div>
                        </div>

                        {/* List Name Input */}
                        <div className="p-6 border-b border-slate-100 bg-white shrink-0 space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">List Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter list name..."
                                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all"
                                    value={draftListName}
                                    onChange={e => setDraftListName(e.target.value)}
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm select-none">😊</span>
                            </div>
                        </div>

                        {/* Included Users */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 space-y-4">
                            <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Included Members</h4>

                            {/* Add Button */}
                            <button
                                type="button"
                                onClick={() => setShowAddUsers(true)}
                                className="w-full py-4 px-5 bg-white hover:bg-indigo-50/20 border border-dashed border-slate-250 rounded-2xl flex items-center gap-3.5 transition-all text-left text-slate-700 cursor-pointer shadow-sm animate-fade-in"
                            >
                                <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm">+</span>
                                <span className="text-xs font-black uppercase tracking-wider text-slate-700">Add people or groups</span>
                            </button>

                            {/* List of draft users */}
                            {draftSelectedUsers.length > 0 ? (
                                <div className="divide-y divide-slate-100 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                                    {draftSelectedUsers.map(u => (
                                        <div key={u._id} className="p-3.5 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                                                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]?.toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-xs truncate">{u.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{u.role}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setDraftSelectedUsers(prev => prev.filter(x => x._id !== u._id))}
                                                className="w-6 h-6 rounded-lg text-slate-450 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
                                                title="Remove"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-center text-slate-400 font-bold italic py-4">No members added yet.</p>
                            )}
                        </div>

                        {/* Footer / Create Button */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
                            <button
                                type="button"
                                onClick={handleSaveCustomList}
                                disabled={!draftListName.trim() || draftSelectedUsers.length === 0}
                                className="w-full py-3 bg-emerald-550 hover:bg-emerald-650 disabled:bg-slate-200 disabled:text-slate-400 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-75 cursor-pointer shadow-md text-center"
                            >
                                Create List
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 3. Add to List Users Select Modal */}
            {showAddUsers && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[75vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-base">Add to list</h3>
                                <p className="text-slate-450 text-[10px] font-bold uppercase tracking-wider mt-0.5">Select members to include</p>
                            </div>
                            <button
                                onClick={() => setShowAddUsers(false)}
                                className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-slate-100 bg-white shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search name or role..."
                                    className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all"
                                    value={directorySearch}
                                    onChange={e => setDirectorySearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Directory list */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 bg-slate-50/20">
                            {loadingDirectory ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-650 mx-auto mb-2"></div>
                                    Loading directory...
                                </div>
                            ) : directoryUsers.length > 0 ? (
                                directoryUsers
                                    .filter(u =>
                                        u.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
                                        u.role.toLowerCase().includes(directorySearch.toLowerCase())
                                    )
                                    .map(u => {
                                        const isSelected = draftSelectedUsers.some(x => String(x._id) === String(u._id));
                                        return (
                                            <button
                                                key={u._id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setDraftSelectedUsers(prev => prev.filter(x => String(x._id) !== String(u._id)));
                                                    } else {
                                                        setDraftSelectedUsers(prev => [...prev, u]);
                                                    }
                                                }}
                                                className="w-full p-4 flex items-center justify-between hover:bg-white transition-all cursor-pointer border-b border-slate-100/50"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-sm">
                                                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 text-left">
                                                        <p className="font-bold text-slate-800 text-xs truncate">{u.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{u.role}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isSelected
                                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                                    : 'bg-white border-slate-350'
                                                    }`}>
                                                    {isSelected && <span className="text-[10px] font-black">✓</span>}
                                                </div>
                                            </button>
                                        );
                                    })
                            ) : (
                                <div className="p-8 text-center text-slate-400 font-bold text-xs select-none">
                                    No users found in your institute.
                                </div>
                            )}
                        </div>

                        {/* Floating Checkmark Confirm Button */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowAddUsers(false)}
                                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer font-bold text-lg"
                                title="Confirm Selection"
                            >
                                ✓
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default ChatPage;
