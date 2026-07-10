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
    Paperclip, File, Download, X, Loader2, Bell,
    PenSquare, UserX, Lock, Trash, Mic, ChevronDown,
    Info, RefreshCw, Plus
} from 'lucide-react';

const ChatPage = () => {
    const { user } = useAuth();
    const { socket, onlineUsers, callUser, setChatNotifications } = useSocket();
    const location = useLocation();

    const canPerform = (feature, subAction) => {
        if (user?.role !== 'Accountant') return true;
        const ctrl = user.accountantProfile?.controls?.[feature];
        if (!ctrl) return true;
        if (ctrl.enabled === false) return false;
        return ctrl[subAction] !== false;
    };

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

    // Research Contact Feature states
    const [contactType, setContactType] = useState('lms'); // 'lms' | 'research'
    const [researchContacts, setResearchContacts] = useState([]);
    const [selectedResearchContact, setSelectedResearchContact] = useState(null);
    const [loadingResearchContacts, setLoadingResearchContacts] = useState(false);
    const [showCreateResearchContactModal, setShowCreateResearchContactModal] = useState(false);
    const [newResearchContactName, setNewResearchContactName] = useState('');
    const [savingResearchContact, setSavingResearchContact] = useState(false);
    const [showWriteNoteModal, setShowWriteNoteModal] = useState(false);
    const [noteModalTitle, setNoteModalTitle] = useState('');
    const [noteModalText, setNoteModalText] = useState('');
    const [viewSelectedNote, setViewSelectedNote] = useState(null);
    const [showViewNoteModal, setShowViewNoteModal] = useState(false);
    const [researchMessages, setResearchMessages] = useState([]);
    const [loadingResearchMessages, setLoadingResearchMessages] = useState(false);
    const [showRecentDelete, setShowRecentDelete] = useState(false);
    const [deletedResearchMessages, setDeletedResearchMessages] = useState([]);
    const [loadingDeletedResearchMessages, setLoadingDeletedResearchMessages] = useState(false);

    // Audio recording state
    const [isAudioRecording, setIsAudioRecording] = useState(false);
    const [audioTimer, setAudioTimer] = useState(0);
    const audioRecorderRef = useRef(null);
    const audioStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioIntervalRef = useRef(null);

    // Video recording state
    const [showVideoRecordModal, setShowVideoRecordModal] = useState(false);
    const [isVideoRecording, setIsVideoRecording] = useState(false);
    const [videoTimer, setVideoTimer] = useState(0);
    const videoRecorderRef = useRef(null);
    const videoStreamRef = useRef(null);
    const videoChunksRef = useRef([]);
    const videoIntervalRef = useRef(null);
    const videoPreviewRef = useRef(null);

    const [editingResearchMessageId, setEditingResearchMessageId] = useState(null);

    // Video options modal states & refs
    const [showVideoOptionsModal, setShowVideoOptionsModal] = useState(false);
    const videoFileInputRef = useRef(null);

    // Dropdown options state
    const [activeDropdownMessageId, setActiveDropdownMessageId] = useState(null);

    useEffect(() => {
        const handleOutsideClick = () => {
            setActiveDropdownMessageId(null);
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const showMessageInfo = (msg) => {
        const infoText = `Message Info:
• Sent: ${new Date(msg.createdAt).toLocaleString()}
• Edited: ${msg.isEdited ? 'Yes (Once)' : 'No'}
• Type: ${msg.fileUrl ? (msg.fileType || 'File') : 'Text Note'}${msg.fileName ? `\n• Name: ${msg.fileName}` : ''}`;
        alert(infoText);
    };

    // Chat Request system states
    const [chatRequest, setChatRequest] = useState(null);
    const [loadingRequestStatus, setLoadingRequestStatus] = useState(false);
    const [requestPermissions, setRequestPermissions] = useState({ audioCall: false, videoCall: false });
    const [sendingRequest, setSendingRequest] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);

    // Incoming chat requests notification
    const [pendingRequests, setPendingRequests] = useState([]);
    const [showRequestsDropdown, setShowRequestsDropdown] = useState(false);
    const [loadingPendingRequests, setLoadingPendingRequests] = useState(false);

    // New chat search mode (search directory to find user to chat with)
    const [searchMode, setSearchMode] = useState(false); // when true show directory search instead of contacts
    const [directorySearchQuery, setDirectorySearchQuery] = useState('');
    const [directorySearchResults, setDirectorySearchResults] = useState([]);
    const [searchingDirectory, setSearchingDirectory] = useState(false);

    const [customLists, setCustomLists] = useState([]);
    const [activeFilterTab, setActiveFilterTab] = useState('All'); // 'All' | 'Teacher' | 'Editor' | 'Student' | 'list_xxx'

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

    // Live debounced search across institute directory (for new-chat search mode)
    useEffect(() => {
        if (!directorySearchQuery.trim()) {
            setDirectorySearchResults([]);
            setSearchingDirectory(false);
            return;
        }
        // Show spinner immediately as user types
        setSearchingDirectory(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.get(`/api/chat/directory?search=${encodeURIComponent(directorySearchQuery.trim())}`);
                setDirectorySearchResults(data);
            } catch (err) {
                console.error('Directory search error:', err);
            } finally {
                setSearchingDirectory(false);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [directorySearchQuery]);


    // Fetch directory for lists flow (still triggered by showListsIntro / showAddUsers) using directorySearch
    useEffect(() => {
        if (showListsIntro || showAddUsers) {
            const fetchDirectory = async () => {
                try {
                    setLoadingDirectory(true);
                    const q = directorySearch.trim();
                    const { data } = await axios.get(`/api/chat/directory${q ? `?search=${encodeURIComponent(q)}` : ''}`);
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
    }, [showListsIntro, showAddUsers, directorySearch]);


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
    const [attachedFileNote, setAttachedFileNote] = useState('');
    const [showAttachmentNoteInput, setShowAttachmentNoteInput] = useState(false);
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

    const fetchResearchContacts = async () => {
        try {
            setLoadingResearchContacts(true);
            const { data } = await axios.get('/api/research/contacts');
            setResearchContacts(data);
            setLoadingResearchContacts(false);
        } catch (error) {
            console.error("Error loading research contacts:", error);
            toast.error("Failed to load research contacts");
            setLoadingResearchContacts(false);
        }
    };

    const fetchResearchMessages = async () => {
        if (!selectedResearchContact) return;
        try {
            setLoadingResearchMessages(true);
            const { data } = await axios.get(`/api/research/messages/${selectedResearchContact._id}`);
            setResearchMessages(data);
        } catch (error) {
            console.error("Error fetching research messages:", error);
            toast.error("Failed to load messages");
        } finally {
            setLoadingResearchMessages(false);
        }
    };

    const fetchDeletedResearchMessages = async () => {
        if (!selectedResearchContact) return;
        try {
            setLoadingDeletedResearchMessages(true);
            const { data } = await axios.get(`/api/research/messages/${selectedResearchContact._id}/deleted`);
            setDeletedResearchMessages(data);
        } catch (error) {
            console.error("Error fetching deleted research messages:", error);
            toast.error("Failed to load deleted messages");
        } finally {
            setLoadingDeletedResearchMessages(false);
        }
    };

    // Fetch research contacts when contactType is toggled to research
    useEffect(() => {
        if (contactType === 'research') {
            fetchResearchContacts();
            setSelectedContact(null);
            setSelectedResearchContact(null);
            setShowRecentDelete(false);
        } else {
            fetchContacts();
            setSelectedContact(null);
            setSelectedResearchContact(null);
        }
    }, [contactType]);

    // Fetch messages when a research contact or showRecentDelete changes
    useEffect(() => {
        if (selectedResearchContact) {
            if (showRecentDelete) {
                fetchDeletedResearchMessages();
            } else {
                fetchResearchMessages();
            }
            setSearchKeyword('');
            setSearchDate('');
            setShowSearch(false);
            setAttachedFile(null);
            setIsUploadingFile(false);
            setNewMessage('');
            setTimeout(scrollToBottom, 100);
        }
    }, [selectedResearchContact, showRecentDelete]);

    const handleCreateResearchContact = async (e) => {
        e.preventDefault();
        if (!newResearchContactName.trim()) return;
        try {
            setSavingResearchContact(true);
            const { data } = await axios.post('/api/research/contacts', { name: newResearchContactName.trim() });
            toast.success("Research contact created!");
            setNewResearchContactName('');
            setShowCreateResearchContactModal(false);
            fetchResearchContacts();
            setSelectedResearchContact(data);
        } catch (error) {
            console.error("Failed to create contact:", error);
            toast.error(error.response?.data?.message || "Failed to create contact");
        } finally {
            setSavingResearchContact(false);
        }
    };

    const handleSendResearchMessage = async (attachment = null) => {
        if (!selectedResearchContact) return;
        if (!newMessage.trim() && !attachment && !attachedFile && !attachedFileNote.trim()) return;

        const msgText = [newMessage.trim(), attachedFileNote.trim()].filter(Boolean).join('\n');
        setNewMessage('');
        setAttachedFileNote('');
        setShowAttachmentNoteInput(false);

        const currentAttachment = attachment || attachedFile;
        setAttachedFile(null);

        const payload = {
            researchContact: selectedResearchContact._id,
            text: msgText
        };

        if (currentAttachment) {
            payload.fileUrl = currentAttachment.fileUrl;
            payload.fileName = currentAttachment.fileName;
            payload.fileType = currentAttachment.fileType;
        }

        try {
            const { data } = await axios.post('/api/research/messages', payload);
            setResearchMessages(prev => [...prev, data]);
            scrollToBottom();

            // Refresh contact list metadata
            setResearchContacts(prev => prev.map(c => {
                if (c._id === selectedResearchContact._id) {
                    return {
                        ...c,
                        lastMessage: {
                            text: msgText || (data.fileType?.startsWith('image/') ? '📷 Photo' : '📁 Document'),
                            sender: user._id,
                            createdAt: data.createdAt
                        }
                    };
                }
                return c;
            }));
        } catch (error) {
            console.error("Failed to send research message:", error);
            toast.error("Failed to send message");
            if (currentAttachment && !attachment) {
                setAttachedFile(currentAttachment);
            }
        }
    };

    const handleSendNoteFromModal = async () => {
        if (!selectedResearchContact) return;
        if (!noteModalText.trim()) return;

        const msgText = noteModalText.trim();
        const msgTitle = noteModalTitle.trim() || 'Untitled Note';
        
        setNoteModalText('');
        setNoteModalTitle('');
        setShowWriteNoteModal(false);

        const payload = {
            researchContact: selectedResearchContact._id,
            text: msgText,
            fileName: msgTitle,
            fileType: 'note'
        };

        try {
            const { data } = await axios.post('/api/research/messages', payload);
            setResearchMessages(prev => [...prev, data]);
            scrollToBottom();

            // Refresh contact list metadata
            setResearchContacts(prev => prev.map(c => {
                if (c._id === selectedResearchContact._id) {
                    return {
                        ...c,
                        lastMessage: {
                            text: `📝 ${msgTitle}`,
                            sender: user._id,
                            createdAt: data.createdAt
                        }
                    };
                }
                return c;
            }));
            toast.success("Note saved successfully!");
        } catch (error) {
            console.error("Failed to send note from modal:", error);
            toast.error("Failed to send note");
            setNoteModalText(msgText);
            setNoteModalTitle(msgTitle);
            setShowWriteNoteModal(true);
        }
    };

    const handleEditResearchMessage = async (e) => {
        if (e) e.preventDefault();
        if (!editingResearchMessageId) return;

        const targetMsg = researchMessages.find(m => m._id === editingResearchMessageId);
        const isNote = targetMsg?.fileType === 'note';

        let payload = {};
        let textVal = '';
        if (isNote) {
            textVal = noteModalText.trim();
            payload = {
                text: textVal,
                fileName: noteModalTitle.trim() || 'Untitled Note'
            };
        } else {
            textVal = newMessage.trim();
            payload = {
                text: textVal
            };
        }

        if (!textVal) return;

        if (isNote) {
            setNoteModalText('');
            setNoteModalTitle('');
            setShowWriteNoteModal(false);
        } else {
            setNewMessage('');
        }

        try {
            const { data } = await axios.put(`/api/research/messages/${editingResearchMessageId}`, payload);

            setResearchMessages(prev => prev.map(m => m._id === editingResearchMessageId ? data : m));
            setEditingResearchMessageId(null);
            toast.success("Note edited successfully");

            setResearchContacts(prev => prev.map(c => {
                if (c._id === selectedResearchContact._id && c.lastMessage) {
                    return {
                        ...c,
                        lastMessage: {
                            ...c.lastMessage,
                            text: isNote ? `📝 ${payload.fileName}` : textVal
                        }
                    };
                }
                return c;
            }));
        } catch (error) {
            console.error("Failed to edit research message:", error);
            toast.error(error.response?.data?.message || "Failed to edit message");
            if (isNote) {
                setNoteModalText(payload.text);
                setNoteModalTitle(payload.fileName);
                setShowWriteNoteModal(true);
            }
        }
    };

    const handleDeleteResearchMessage = async (messageId) => {
        try {
            await axios.delete(`/api/research/messages/${messageId}`);
            setResearchMessages(prev => prev.filter(m => m._id !== messageId));
            toast.success("Message moved to Recent Deletes");
            fetchResearchContacts(); // refresh metadata for lastMessage
        } catch (error) {
            console.error("Failed to delete research message:", error);
            toast.error("Failed to delete message");
        }
    };

    const handleRestoreResearchMessage = async (messageId) => {
        try {
            await axios.post(`/api/research/messages/${messageId}/restore`);
            setDeletedResearchMessages(prev => prev.filter(m => m._id !== messageId));
            toast.success("Message restored!");
            fetchResearchContacts(); // refresh metadata
        } catch (error) {
            console.error("Failed to restore message:", error);
            toast.error("Failed to restore message");
        }
    };

    const handlePermanentDeleteResearchMessage = async (messageId) => {
        const confirmDelete = window.confirm("Are you sure you want to permanently delete this message? This cannot be undone.");
        if (!confirmDelete) return;

        try {
            await axios.delete(`/api/research/messages/${messageId}/permanent`);
            setDeletedResearchMessages(prev => prev.filter(m => m._id !== messageId));
            toast.success("Message permanently deleted!");
            fetchResearchContacts(); // refresh metadata
        } catch (error) {
            console.error("Failed to permanently delete message:", error);
            toast.error("Failed to delete message permanently");
        }
    };

    // Voice recording helpers
    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream);
            audioRecorderRef.current = mediaRecorder;

            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('file', blob, 'voice-recording.webm');

                try {
                    setIsUploadingFile(true);
                    setUploadingFileName('voice-recording.webm');
                    const { data } = await axios.post('/api/chat/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    setAttachedFile({
                        fileUrl: data.fileUrl,
                        fileName: data.fileName,
                        fileType: data.fileType
                    });
                    toast.success("Voice recording completed! Click Send to submit.");
                } catch (err) {
                    console.error("Audio upload error:", err);
                    toast.error("Failed to upload audio recording");
                } finally {
                    setIsUploadingFile(false);
                }
            };

            mediaRecorder.start();
            setIsAudioRecording(true);
            setAudioTimer(0);
            audioIntervalRef.current = setInterval(() => {
                setAudioTimer(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Failed to start audio recording:", err);
            toast.error("Could not access microphone");
        }
    };

    const stopAudioRecording = () => {
        if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
            audioRecorderRef.current.stop();
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
        }
        clearInterval(audioIntervalRef.current);
        setIsAudioRecording(false);
    };

    const cancelAudioRecording = () => {
        if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
            audioRecorderRef.current.onstop = null; // discard recording
            audioRecorderRef.current.stop();
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
        }
        clearInterval(audioIntervalRef.current);
        setIsAudioRecording(false);
    };

    // Video Recording helpers
    const startCameraPreview = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoStreamRef.current = stream;
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            toast.error("Could not access camera/microphone");
            setShowVideoRecordModal(false);
        }
    };

    const stopCameraPreview = () => {
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
            videoStreamRef.current = null;
        }
        if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        if (showVideoRecordModal) {
            startCameraPreview();
        } else {
            stopCameraPreview();
        }
        return () => stopCameraPreview();
    }, [showVideoRecordModal]);

    const startVideoRecording = () => {
        if (!videoStreamRef.current) return;
        const mediaRecorder = new MediaRecorder(videoStreamRef.current);
        videoRecorderRef.current = mediaRecorder;
        videoChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                videoChunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
            const formData = new FormData();
            formData.append('file', blob, 'video-recording.webm');

            try {
                setIsUploadingFile(true);
                setUploadingFileName('video-recording.webm');
                const { data } = await axios.post('/api/chat/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                setAttachedFile({
                    fileUrl: data.fileUrl,
                    fileName: data.fileName,
                    fileType: data.fileType
                });
                toast.success("Video recording completed! Click Send to submit.");
                setShowVideoRecordModal(false);
            } catch (err) {
                console.error("Video upload error:", err);
                toast.error("Failed to upload video recording");
            } finally {
                setIsUploadingFile(false);
            }
        };

        mediaRecorder.start();
        setIsVideoRecording(true);
        setVideoTimer(0);
        videoIntervalRef.current = setInterval(() => {
            setVideoTimer(prev => prev + 1);
        }, 1000);
    };

    const stopVideoRecording = () => {
        if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
            videoRecorderRef.current.stop();
        }
        stopCameraPreview();
        clearInterval(videoIntervalRef.current);
        setIsVideoRecording(false);
    };

    const closeVideoRecording = () => {
        if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
            videoRecorderRef.current.onstop = null; // discard
            videoRecorderRef.current.stop();
        }
        stopCameraPreview();
        clearInterval(videoIntervalRef.current);
        setIsVideoRecording(false);
        setShowVideoRecordModal(false);
    };

    // Helper to render URL text with links
    const renderMessageTextWithLinks = (text, keyword, isSelf) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`underline font-bold break-all ${isSelf ? 'text-cyan-200 hover:text-cyan-100' : 'text-indigo-650 hover:text-indigo-800'}`}
                    >
                        {part}
                    </a>
                );
            }
            return renderHighlightedText(part, keyword);
        });
    };

    // Filter research contacts based on search keyword
    const filteredResearchContacts = useMemo(() => {
        return researchContacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [researchContacts, searchTerm]);

    const handleComposerSubmit = (e) => {
        e.preventDefault();
        if (contactType === 'research') {
            if (editingResearchMessageId) {
                handleEditResearchMessage(e);
            } else {
                handleSendResearchMessage();
            }
        } else {
            handleSendMessage(e);
        }
    };

    // Fetch pending chat requests addressed to me
    const fetchPendingRequests = async () => {
        try {
            setLoadingPendingRequests(true);
            const { data } = await axios.get('/api/chat/request/pending');
            setPendingRequests(data);
        } catch (err) {
            console.error('Error loading pending requests:', err);
        } finally {
            setLoadingPendingRequests(false);
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
        fetchPendingRequests();
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


    const fetchRequestStatus = async (contactId) => {
        try {
            setLoadingRequestStatus(true);
            const { data } = await axios.get(`/api/chat/request/status/${contactId}`);
            setChatRequest(data);
        } catch (error) {
            console.error("Error fetching chat request status:", error);
        } finally {
            setLoadingRequestStatus(false);
        }
    };

    // Reset states when contact is selected
    useEffect(() => {
        if (!selectedContact) return;
        setChatRequest(null);
        fetchRequestStatus(selectedContact._id);
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

    useEffect(() => {
        if (!selectedContact) return;
        if (chatRequest?.status !== 'accepted' && !chatRequest?.isBypassed) return;

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
    }, [selectedContact, limitDays, searchKeyword, searchDate, chatRequest]);

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
        setAttachedFileNote('');
        setShowAttachmentNoteInput(false);
    };

    // Send or edit chat message
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (editingMessageId) {
            const targetMsg = messages.find(m => m._id === editingMessageId);
            const isNote = targetMsg?.fileType === 'note';

            let payload = {};
            let textVal = '';
            if (isNote) {
                textVal = noteModalText.trim();
                payload = {
                    text: textVal,
                    fileName: noteModalTitle.trim() || 'Untitled Note'
                };
            } else {
                textVal = newMessage.trim();
                payload = {
                    text: textVal
                };
            }

            if (!textVal) return;

            if (isNote) {
                setNoteModalText('');
                setNoteModalTitle('');
                setShowWriteNoteModal(false);
            } else {
                setNewMessage('');
            }

            try {
                const originalMsg = messages.find(m => m._id === editingMessageId);
                const originalTextVal = originalMsg ? (originalMsg.originalText || originalMsg.text) : '';

                const { data } = await axios.put(`/api/chat/messages/${editingMessageId}`, payload);

                setMessages(prev => prev.map(m => m._id === editingMessageId ? data : m));
                setEditingMessageId(null);

                if (socket) {
                    socket.emit('edit-message', {
                        messageId: editingMessageId,
                        receiverId: selectedContact._id,
                        text: textVal,
                        fileName: isNote ? payload.fileName : undefined,
                        isEdited: true,
                        originalText: originalTextVal
                    });
                }

                setContacts(prev => prev.map(c => {
                    if (c._id === selectedContact._id) {
                        return {
                            ...c,
                            lastMessage: {
                                text: isNote ? `📝 ${payload.fileName}` : textVal,
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
                if (isNote) {
                    setNoteModalText(payload.text);
                    setNoteModalTitle(payload.fileName);
                    setShowWriteNoteModal(true);
                }
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

    const handleSendRequest = async () => {
        if (!selectedContact) return;
        try {
            setSendingRequest(true);
            const { data } = await axios.post('/api/chat/request', {
                receiverId: selectedContact._id,
                permissions: requestPermissions
            });
            setChatRequest({ status: 'pending', request: data, canRequest: false });
            toast.success("Chat request sent successfully!");
        } catch (error) {
            console.error("Failed to send chat request:", error);
            toast.error(error.response?.data?.message || "Failed to send chat request");
        } finally {
            setSendingRequest(false);
        }
    };

    const handleAcceptRequest = async (reqId) => {
        try {
            const { data } = await axios.put(`/api/chat/request/${reqId}/accept`);
            setChatRequest({ status: 'accepted', request: data });
            toast.success("Chat request accepted!");
        } catch (error) {
            console.error("Failed to accept chat request:", error);
            toast.error("Failed to accept chat request");
        }
    };

    const handleRejectRequest = async (reqId) => {
        try {
            const { data } = await axios.put(`/api/chat/request/${reqId}/reject`);
            setChatRequest({ status: 'rejected', request: data, canRequest: false, blockTimeLeft: 24 * 60 * 60 * 1000 });
            toast.success("Chat request rejected");
        } catch (error) {
            console.error("Failed to reject chat request:", error);
            toast.error("Failed to reject chat request");
        }
    };

    const handleCancelRequest = async (reqId) => {
        try {
            await axios.delete(`/api/chat/request/${reqId}/cancel`);
            setChatRequest({ status: 'none', canRequest: true });
            toast.success("Chat request cancelled");
        } catch (error) {
            console.error("Failed to cancel chat request:", error);
            toast.error("Failed to cancel chat request");
        }
    };

    const handleUpdatePermissions = async (reqId, newPerms) => {
        try {
            const { data } = await axios.put(`/api/chat/request/${reqId}/permissions`, newPerms);
            setChatRequest(prev => ({ ...prev, request: data }));
            toast.success("Permissions updated successfully!");
            setShowPermissionsModal(false);
        } catch (error) {
            console.error("Failed to update permissions:", error);
            toast.error("Failed to update permissions");
        }
    };

    const renderChatRequestPanel = () => {
        if (!chatRequest) return null;

        const isOutgoing = chatRequest.request?.sender === user._id;
        const reqId = chatRequest.request?._id;

        // 1. If Rejection lock is active
        if (chatRequest.status === 'rejected') {
            const hoursLeft = chatRequest.blockTimeLeft
                ? Math.ceil(chatRequest.blockTimeLeft / (1000 * 60 * 60))
                : 24;

            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 select-none">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4 border border-rose-100 shadow-sm animate-bounce">
                        <X size={28} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Request Rejected</h2>
                    <p className="text-xs font-semibold text-slate-505 max-w-sm mt-2 leading-relaxed">
                        Your previous chat request was declined by {selectedContact.name}. To prevent spam, you can send another request after {hoursLeft} hours.
                    </p>
                </div>
            );
        }

        // 2. If Pending (Outgoing)
        if (chatRequest.status === 'pending' && isOutgoing) {
            const perms = chatRequest.request.permissions || {};
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 select-none">
                    <div className="w-16 h-16 bg-amber-50 text-amber-550 rounded-2xl flex items-center justify-center mb-4 border border-amber-100 shadow-sm animate-pulse">
                        <Loader2 size={28} className="animate-spin" />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Request Pending</h2>
                    <p className="text-xs font-semibold text-slate-500 max-w-xs mt-2 leading-relaxed">
                        Your request to start a chat with {selectedContact.name} is waiting for approval.
                    </p>
                    <div className="my-5 p-4 bg-white border border-slate-100 rounded-2xl text-left w-full max-w-xs space-y-2">
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Requested Permissions:</span>
                        <div className="text-xs font-bold text-slate-700 flex flex-col gap-1.5">
                            <span className="flex items-center gap-2">🟢 Chatting Allowed</span>
                            <span className={`flex items-center gap-2 ${perms.audioCall ? 'text-slate-700' : 'text-slate-350 line-through'}`}>
                                {perms.audioCall ? '🟢' : '⚪'} Audio Calling
                            </span>
                            <span className={`flex items-center gap-2 ${perms.videoCall ? 'text-slate-700' : 'text-slate-350 line-through'}`}>
                                {perms.videoCall ? '🟢' : '⚪'} Video Calling
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => handleCancelRequest(reqId)}
                        className="px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-rose-150"
                    >
                        Cancel Request
                    </button>
                </div>
            );
        }

        // 3. If Pending (Incoming)
        if (chatRequest.status === 'pending' && !isOutgoing) {
            const perms = chatRequest.request.permissions || {};
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 select-none">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-650 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 shadow-sm">
                        <MessageSquare size={28} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Chat Invitation</h2>
                    <p className="text-xs font-semibold text-slate-505 max-w-xs mt-2 leading-relaxed">
                        {selectedContact.name} wants to start a conversation with you.
                    </p>
                    <div className="my-5 p-4 bg-white border border-slate-100 rounded-2xl text-left w-full max-w-xs space-y-2">
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Requested Permissions:</span>
                        <div className="text-xs font-bold text-slate-700 flex flex-col gap-1.5">
                            <span className="flex items-center gap-2">🟢 Chatting Allowed</span>
                            <span className={`flex items-center gap-2 ${perms.audioCall ? 'text-slate-700' : 'text-slate-350 line-through'}`}>
                                {perms.audioCall ? '🟢' : '⚪'} Audio Calling
                            </span>
                            <span className={`flex items-center gap-2 ${perms.videoCall ? 'text-slate-700' : 'text-slate-350 line-through'}`}>
                                {perms.videoCall ? '🟢' : '⚪'} Video Calling
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleAcceptRequest(reqId)}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                        >
                            Accept Request
                        </button>
                        <button
                            onClick={() => handleRejectRequest(reqId)}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-200"
                        >
                            Reject Request
                        </button>
                    </div>
                </div>
            );
        }

        // 4. If No request exists (none)
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 select-none">
                <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 shadow-inner">
                    <MessageSquare size={28} />
                </div>
                <h2 className="text-lg font-black text-slate-800">Start Conversation</h2>
                <p className="text-xs font-semibold text-slate-500 max-w-sm mt-2 leading-relaxed">
                    You need to send a chat request to {selectedContact.name} before you can start messaging or calling.
                </p>
                <div className="my-5 p-5 bg-white border border-slate-100 rounded-3xl text-left w-full max-w-xs space-y-4 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">Configure Permissions:</span>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 text-xs text-slate-750 font-bold cursor-not-allowed opacity-75">
                            <input type="checkbox" checked={true} disabled={true} className="w-4.5 h-4.5 rounded text-indigo-650 cursor-not-allowed" />
                            <span>Allow Chatting</span>
                        </label>
                        <label className="flex items-center gap-3 text-xs text-slate-750 font-bold cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={requestPermissions.audioCall}
                                onChange={e => setRequestPermissions(prev => ({ ...prev, audioCall: e.target.checked }))}
                                className="w-4.5 h-4.5 rounded text-indigo-650 cursor-pointer"
                            />
                            <span>Allow Audio Call</span>
                        </label>
                        <label className="flex items-center gap-3 text-xs text-slate-750 font-bold cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={requestPermissions.videoCall}
                                onChange={e => setRequestPermissions(prev => ({ ...prev, videoCall: e.target.checked }))}
                                className="w-4.5 h-4.5 rounded text-indigo-650 cursor-pointer"
                            />
                            <span>Allow Video Call</span>
                        </label>
                    </div>
                </div>
                <button
                    onClick={handleSendRequest}
                    disabled={sendingRequest}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-750 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                    {sendingRequest && <Loader2 size={14} className="animate-spin" />}
                    Send Chat Request
                </button>
            </div>
        );
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

        // Editor controls
        if (user.role === 'Editor') {
            const chatCtrl = user.editorProfile?.controls?.chat;
            if (!chatCtrl) return true;
            if (chatCtrl.enabled === false) return false;

            const role = contact.role;
            if (role === 'Teacher') {
                return chatCtrl.teacher !== false;
            }
            if (role === 'Editor') {
                return chatCtrl.editor !== false;
            }
            if (role === 'Student') {
                return chatCtrl.students !== false;
            }
            return true;
        }

        // Accountant controls
        if (user.role === 'Accountant') {
            const chatCtrl = user.accountantProfile?.controls?.chat;
            if (!chatCtrl) return true;
            if (chatCtrl.enabled === false) return false;

            const role = contact.role;
            if (role === 'Admin' || role === 'Institute') {
                return chatCtrl.chatWithAdmin !== false;
            }
            if (role === 'Teacher') {
                return chatCtrl.chatWithTeacher !== false;
            }
            if (role === 'Editor') {
                return chatCtrl.chatWithEditor !== false;
            }
            if (role === 'Student') {
                return chatCtrl.chatWithStudent !== false;
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
        if (user?.role === 'Student' || user?.role === 'Teacher' || user?.role === 'Editor' || user?.role === 'Accountant') {
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

    const activeDisplayMessages = contactType === 'research'
        ? (showRecentDelete ? deletedResearchMessages : researchMessages)
        : generalMessages;

    const messagesLoading = contactType === 'research'
        ? (showRecentDelete ? loadingDeletedResearchMessages : loadingResearchMessages)
        : loadingMessages;

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
        : (user?.role === 'Teacher'
            ? user?.teacherProfile?.controls?.chat
            : (user?.role === 'Editor'
                ? user?.editorProfile?.controls?.chat
                : null));
    const isChatDisabled = (user?.role === 'Student' || user?.role === 'Teacher' || user?.role === 'Editor') && chatCtrl?.enabled === false;
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
                            {searchMode ? (
                                /* ── Search Mode: find new user to chat ── */
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <button
                                            onClick={() => {
                                                setSearchMode(false);
                                                setDirectorySearchQuery('');
                                                setDirectorySearchResults([]);
                                            }}
                                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all cursor-pointer"
                                            title="Back to conversations"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <span className="text-sm font-black text-slate-800 flex-1">Send Chat Request</span>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search by name, email or role..."
                                            value={directorySearchQuery}
                                            onChange={(e) => setDirectorySearchQuery(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        />
                                        {searchingDirectory && (
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600" />
                                            </div>
                                        )}
                                    </div>
                                    {!directorySearchQuery && (
                                        <p className="text-[10px] text-slate-400 mt-2 text-center">Type a name or email to search</p>
                                    )}
                                </div>
                            ) : (
                                /* ── Normal Mode: conversations list ── */
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 pr-2">
                                            <MessageSquare className="text-indigo-600" size={22} />
                                            <span className="hidden sm:inline">Messages</span>
                                        </h1>

                                        {/* Contact Type Dropdown */}
                                        <div className="flex-1 min-w-[110px]">
                                            <select
                                                value={contactType}
                                                onChange={(e) => setContactType(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 cursor-pointer hover:bg-slate-100 transition-all"
                                            >
                                                <option value="lms">LMS Contact</option>
                                                <option value="research">Personal Contact</option>
                                            </select>
                                        </div>
                                        {/* Pending Requests Bell */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowRequestsDropdown(p => !p)}
                                                className={`relative p-2 rounded-xl transition-all cursor-pointer ${pendingRequests.length > 0
                                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                                                    : 'hover:bg-slate-100 text-slate-500'
                                                    }`}
                                                title="Chat Requests"
                                            >
                                                <Bell size={18} />
                                                {pendingRequests.length > 0 && (
                                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse shadow-sm">
                                                        {pendingRequests.length}
                                                    </span>
                                                )}
                                            </button>
                                            {/* Requests Dropdown */}
                                            {showRequestsDropdown && (
                                                <div className="absolute right-0 top-10 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                                                        <span className="text-xs font-black text-slate-700">Incoming Requests</span>
                                                        <button onClick={() => setShowRequestsDropdown(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"><X size={14} /></button>
                                                    </div>
                                                    {loadingPendingRequests ? (
                                                        <div className="p-4 text-center text-xs text-slate-400">
                                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto mb-1"></div>
                                                            Loading...
                                                        </div>
                                                    ) : pendingRequests.length === 0 ? (
                                                        <div className="p-5 text-center text-xs text-slate-400">
                                                            <Bell size={24} className="mx-auto opacity-20 mb-1" />
                                                            No pending requests
                                                        </div>
                                                    ) : (
                                                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                                                            {pendingRequests.map(req => (
                                                                <div key={req._id} className="p-3 flex items-start gap-2.5">
                                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                        {req.sender?.avatar ? (
                                                                            <img src={req.sender.avatar} alt={req.sender.name} className="w-full h-full object-cover" />
                                                                        ) : req.sender?.name?.[0]?.toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-black text-slate-800 truncate">{req.sender?.name}</p>
                                                                        <p className="text-[10px] text-slate-400 uppercase">{req.sender?.role}</p>
                                                                        <div className="flex gap-1 mt-1.5 flex-wrap">
                                                                            {req.permissions?.audioCall && <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">🎙 Audio</span>}
                                                                            {req.permissions?.videoCall && <span className="text-[9px] bg-purple-50 border border-purple-200 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">📹 Video</span>}
                                                                        </div>
                                                                        <div className="flex gap-1.5 mt-2">
                                                                            <button
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        await axios.put(`/api/chat/request/${req._id}/accept`);
                                                                                        toast.success(`Accepted ${req.sender?.name}'s request`);
                                                                                        fetchPendingRequests();
                                                                                        fetchContacts();
                                                                                        setShowRequestsDropdown(false);
                                                                                    } catch (e) { toast.error('Failed to accept'); }
                                                                                }}
                                                                                className="flex-1 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl transition-all cursor-pointer"
                                                                            >Accept</button>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        await axios.put(`/api/chat/request/${req._id}/reject`);
                                                                                        toast(`Rejected ${req.sender?.name}'s request`);
                                                                                        fetchPendingRequests();
                                                                                    } catch (e) { toast.error('Failed to reject'); }
                                                                                }}
                                                                                className="flex-1 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-[10px] font-black rounded-xl border border-slate-200 transition-all cursor-pointer"
                                                                            >Reject</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {/* New Chat icon */}
                                        <button
                                            onClick={() => { setSearchMode(true); setDirectorySearchQuery(''); setDirectorySearchResults([]); }}
                                            className="p-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-all cursor-pointer"
                                            title="Start a new conversation"
                                        >
                                            <PenSquare size={18} />
                                        </button>
                                    </div>

                                    {/* Search within existing contacts */}
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

                                    {contactType === 'research' && (
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateResearchContactModal(true)}
                                            className="w-full mt-3 py-2 px-4 bg-indigo-650 hover:bg-indigo-750 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                                        >
                                            + Create Contact
                                        </button>
                                    )}

                                    {/* Contact Filter Tabs & Custom Lists & Create Button */}
                                    {contactType === 'lms' && (
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
                                    )}
                                </>
                            )}
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
                        ) : searchMode ? (
                            /* ── Directory Search Results ── */
                            directorySearchQuery.trim() === '' ? (
                                <div className="p-8 text-center text-slate-400 text-xs select-none">
                                    <Search size={32} className="mx-auto opacity-20 mb-2" />
                                    <p>Type above to search people</p>
                                </div>
                            ) : searchingDirectory ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                    Searching...
                                </div>
                            ) : directorySearchResults.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <UserX size={32} className="mx-auto opacity-20 mb-2" />
                                    No users found
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {directorySearchResults.map(u => (
                                        <div
                                            key={u._id}
                                            onClick={() => { setSearchMode(false); setDirectorySearchQuery(''); setDirectorySearchResults([]); selectContactHandler(u); }}
                                            className="flex items-center gap-3 p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm flex-shrink-0 overflow-hidden shadow-sm">
                                                {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{u.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                            </div>
                                            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0">
                                                {u.role}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : contactType === 'research' ? (
                            loadingResearchContacts ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                    Loading personal contacts...
                                </div>
                            ) : filteredResearchContacts.length > 0 ? (
                                filteredResearchContacts.map((c) => {
                                    const isSelected = selectedResearchContact?._id === c._id;
                                    return (
                                        <div
                                            key={c._id}
                                            className={`flex flex-col transition-colors border-b border-slate-100/50 relative ${isSelected ? 'bg-indigo-50/20' : 'hover:bg-slate-50/30'}`}
                                        >
                                            <div
                                                onClick={() => {
                                                    setSelectedResearchContact(c);
                                                    setMobileActiveTab('chat');
                                                    setShowRecentDelete(false);
                                                }}
                                                className="p-4 flex items-center gap-3 cursor-pointer"
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-11 h-11 rounded-full bg-indigo-150 text-indigo-700 flex items-center justify-center font-black overflow-hidden shadow-sm">
                                                        {c.name[0]?.toUpperCase()}
                                                    </div>
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
                                                            c.lastMessage.text || (c.lastMessage.fileType?.startsWith('audio/') ? '🎙 Voice message' : c.lastMessage.fileType?.startsWith('video/') ? '📹 Video message' : c.lastMessage.fileType?.startsWith('image/') ? '📷 Photo' : '📁 Document')
                                                        ) : (
                                                            <span className="italic opacity-60">No messages yet</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs select-none">
                                    <MessageSquare size={36} className="mx-auto opacity-20 mb-2" />
                                    No research contacts found. Create one above to start.
                                </div>
                            )
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
                    {(contactType === 'research' ? selectedResearchContact : selectedContact) ? (
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
                                            {contactType === 'research' ? (
                                                selectedResearchContact.name[0]?.toUpperCase()
                                            ) : selectedContact.avatar ? (
                                                <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                                            ) : (
                                                selectedContact.name[0]?.toUpperCase()
                                            )}
                                        </div>
                                        {contactType !== 'research' && (
                                            isContactOnline(selectedContact._id) ? (
                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-500/20"></span>
                                            ) : (
                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-350 rounded-full border-2 border-white"></span>
                                            )
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-bold text-slate-800 text-sm truncate">
                                            {contactType === 'research' ? selectedResearchContact.name : selectedContact.name}
                                        </h2>
                                        <p className="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1">
                                            {contactType === 'research' ? (
                                                <span>Personal Research Space {showRecentDelete && '• Trash'}</span>
                                            ) : (
                                                <>
                                                    <span className="uppercase">{selectedContact.role}</span>
                                                    <Circle size={4} className="fill-slate-400 text-slate-400" />
                                                    <span>{isContactOnline(selectedContact._id) ? 'Online Now' : 'Offline'}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Call Quick Action System */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {contactType === 'research' ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowRecentDelete(p => !p)}
                                            className={`p-2.5 rounded-xl transition-all active:scale-95 shadow-sm border ${showRecentDelete
                                                ? 'bg-rose-50 border-rose-200 text-rose-600'
                                                : 'bg-white border-slate-100 text-slate-550 hover:bg-slate-50'
                                                }`}
                                            title={showRecentDelete ? "Back to Chat" : "Recent Deletes / Trash"}
                                        >
                                            {showRecentDelete ? <X size={16} /> : <Trash size={16} />}
                                        </button>
                                    ) : (
                                        ((user.role === 'Teacher' && selectedContact.role === 'Student') ||
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
                                                className="px-3 py-1.5 text-[10px] font-black rounded-lg border bg-white hover:bg-slate-50 text-indigo-650 border-indigo-100 transition-all active:scale-95 shadow-sm mr-1.5"
                                            >
                                                {(selectedTestId !== null || selectedInboxId !== null)
                                                    ? 'Show General Chat'
                                                    : (showSidebarTests
                                                        ? (user.role === 'Student' ? 'Hide My Doubts' : 'Hide Test Chat')
                                                        : (user.role === 'Student' ? 'My Test Doubts' : 'Test Relevant Chat')
                                                    )
                                                }
                                            </button>
                                        )
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

                                    {contactType !== 'research' && chatRequest?.status === 'accepted' && chatRequest?.request?.sender === String(user?._id) && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPermissionsModal(true)}
                                            className="p-2.5 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm text-slate-555 flex items-center justify-center"
                                            title="Update Chat Permissions"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    )}

                                    {/* Audio Call Button */}
                                    {contactType !== 'research' && (!user || (user.role !== 'Student' && user.role !== 'Teacher') || chatCtrl?.audioCall !== false || chatCtrl?.mode === 'disable') && (
                                        <button
                                            onClick={() => {
                                                if (chatCtrl && chatCtrl.audioCall === false) {
                                                    toast.error(chatCtrl.subNotes?.audioCall || chatCtrl.note || "Audio calling is disabled by your administrator.");
                                                    return;
                                                }
                                                const hasCallPerm = chatRequest?.isBypassed || chatRequest?.request?.permissions?.audioCall;
                                                if (!hasCallPerm) {
                                                    toast.error("Audio call permissions not granted by user");
                                                    return;
                                                }
                                                callUser(selectedContact._id, selectedContact.name, selectedContact.role, 'audio');
                                            }}
                                            className={`p-2.5 border border-slate-100 rounded-xl transition-all active:scale-95 shadow-sm bg-white 
                                                ${(chatCtrl && chatCtrl.audioCall === false) || !(chatRequest?.isBypassed || chatRequest?.request?.permissions?.audioCall)
                                                    ? 'opacity-40 cursor-not-allowed text-slate-300'
                                                    : 'text-slate-555 hover:bg-slate-50'}`}
                                            title={chatCtrl && chatCtrl.audioCall === false
                                                ? (chatCtrl.subNotes?.audioCall || chatCtrl.note || "Voice call is disabled")
                                                : (!(chatRequest?.isBypassed || chatRequest?.request?.permissions?.audioCall)
                                                    ? "Audio call permissions not granted"
                                                    : "Voice Call")
                                            }
                                        >
                                            <Phone size={16} />
                                        </button>
                                    )}

                                    {/* Video Call Button */}
                                    {contactType !== 'research' && (!user || (user.role !== 'Student' && user.role !== 'Teacher') || chatCtrl?.videoCall !== false || chatCtrl?.mode === 'disable') && (
                                        <button
                                            onClick={() => {
                                                if (chatCtrl && chatCtrl.videoCall === false) {
                                                    toast.error(chatCtrl.subNotes?.videoCall || chatCtrl.note || "Video calling is disabled by your administrator.");
                                                    return;
                                                }
                                                const hasCallPerm = chatRequest?.isBypassed || chatRequest?.request?.permissions?.videoCall;
                                                if (!hasCallPerm) {
                                                    toast.error("Video call permissions not granted by user");
                                                    return;
                                                }
                                                callUser(selectedContact._id, selectedContact.name, selectedContact.role, 'video');
                                            }}
                                            className={`p-2.5 border border-slate-100 rounded-xl transition-all active:scale-95 shadow-sm bg-white 
                                                ${(chatCtrl && chatCtrl.videoCall === false) || !(chatRequest?.isBypassed || chatRequest?.request?.permissions?.videoCall)
                                                    ? 'opacity-40 cursor-not-allowed text-slate-300'
                                                    : 'text-slate-555 hover:bg-slate-50'}`}
                                            title={chatCtrl && chatCtrl.videoCall === false
                                                ? (chatCtrl.subNotes?.videoCall || chatCtrl.note || "Video call is disabled")
                                                : (!(chatRequest?.isBypassed || chatRequest?.request?.permissions?.videoCall)
                                                    ? "Video call permissions not granted"
                                                    : "Video Call")
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

                            {loadingRequestStatus ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                                    <Loader2 size={36} className="animate-spin text-indigo-650 mb-3" />
                                    <p className="text-xs font-bold text-slate-500">Checking chat permissions...</p>
                                </div>
                            ) : (contactType !== 'research' && chatRequest?.status !== 'accepted' && !chatRequest?.isBypassed) ? (
                                renderChatRequestPanel()
                            ) : (selectedTestId !== null && selectedQuestionIndex !== null ? (
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
                                                        <div className={`max-w-[75%] rounded-3xl px-4 py-2.5 shadow-sm ${msg.fileUrl && (msg.fileType?.startsWith('audio/') || msg.fileType?.startsWith('video/') || /\.(webm|mp3|wav|ogg|m4a|mp4|mov|avi)$/i.test(msg.fileName))
                                                            ? 'min-w-[280px]'
                                                            : ''
                                                            } ${isSelf
                                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                                            }`}>
                                                            {msg.fileUrl && (
                                                                <div className="mb-2 max-w-xs overflow-hidden rounded-2xl border border-slate-100/10">
                                                                    {msg.fileType?.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(msg.fileName) || (msg.fileName && msg.fileName.includes('video-recording')) ? (
                                                                        <video controls src={msg.fileUrl} className="w-full max-h-48 rounded-xl bg-black" />
                                                                    ) : msg.fileType?.startsWith('audio/') || /\.(webm|mp3|wav|ogg|m4a)$/i.test(msg.fileName) ? (
                                                                        <audio controls src={msg.fileUrl} className="w-full max-w-[240px] focus:outline-none" />
                                                                    ) : msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
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
                                                <span className="text-xs font-semibold text-slate-900 truncate text-left">
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
                                        {messagesLoading ? (
                                            <div className="py-20 text-center text-slate-450 text-xs">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                                Fetching chat history...
                                            </div>
                                        ) : activeDisplayMessages.length > 0 ? (
                                            activeDisplayMessages.map((msg) => {
                                                const isSelf = msg.sender === user._id || msg.owner === user._id;
                                                return (
                                                    <div
                                                        key={msg._id}
                                                        className={`flex items-end gap-2 group ${isSelf ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[70%] rounded-3xl ${contactType === 'research' ? 'pl-4 pr-8' : 'px-4'} py-2.5 shadow-sm relative group/bubble ${msg.fileUrl && (msg.fileType?.startsWith('audio/') || msg.fileType?.startsWith('video/') || /\.(webm|mp3|wav|ogg|m4a|mp4|mov|avi)$/i.test(msg.fileName))
                                                            ? 'min-w-[280px]'
                                                            : ''
                                                            } ${isSelf
                                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                                            }`}>
                                                            {/* Message options dropdown */}
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdownMessageId(prev => prev === msg._id ? null : msg._id);
                                                                    }}
                                                                    className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-opacity z-10 cursor-pointer border-none bg-transparent ${isSelf ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-105'
                                                                        }`}
                                                                    title="Message Options"
                                                                >
                                                                    <ChevronDown size={14} />
                                                                </button>

                                                                {activeDropdownMessageId === msg._id && (
                                                                    <div
                                                                        className="absolute top-8 right-2.5 w-36 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-[999] animate-fade-in text-slate-700 text-left font-bold"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {contactType === 'research' ? (
                                                                            !showRecentDelete ? (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveDropdownMessageId(null);
                                                                                            showMessageInfo(msg);
                                                                                        }}
                                                                                        className="w-full px-3.5 py-2 text-[11px] hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700 font-bold border-none bg-transparent"
                                                                                    >
                                                                                        <Info size={12} className="text-slate-400" />
                                                                                        Message Info
                                                                                    </button>
                                                                                    {(!msg.isEdited || msg.editCount < 1) && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setActiveDropdownMessageId(null);
                                                                                                setEditingResearchMessageId(msg._id);
                                                                                                if (msg.fileType === 'note') {
                                                                                                    setNoteModalTitle(msg.fileName || '');
                                                                                                    setNoteModalText(msg.text || '');
                                                                                                    setShowWriteNoteModal(true);
                                                                                                } else {
                                                                                                    setNewMessage(msg.text || '');
                                                                                                }
                                                                                            }}
                                                                                            className="w-full px-3.5 py-2 text-[11px] hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700 font-bold border-none bg-transparent"
                                                                                        >
                                                                                            <Pencil size={12} className="text-slate-400" />
                                                                                            Edit Note
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveDropdownMessageId(null);
                                                                                            handleDeleteResearchMessage(msg._id);
                                                                                        }}
                                                                                        className="w-full px-3.5 py-2 text-[11px] hover:bg-rose-50 text-red-650 flex items-center gap-2 cursor-pointer font-bold border-none bg-transparent"
                                                                                    >
                                                                                        <Trash size={12} className="text-red-400" />
                                                                                        Move to Trash
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveDropdownMessageId(null);
                                                                                            showMessageInfo(msg);
                                                                                        }}
                                                                                        className="w-full px-3.5 py-2 text-[11px] hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700 font-bold border-none bg-transparent"
                                                                                    >
                                                                                        <Info size={12} className="text-slate-400" />
                                                                                        Message Info
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveDropdownMessageId(null);
                                                                                            handleRestoreResearchMessage(msg._id);
                                                                                        }}
                                                                                        className="w-full px-3.5 py-2 text-[11px] hover:bg-emerald-50 text-emerald-650 flex items-center gap-2 cursor-pointer font-bold border-none bg-transparent"
                                                                                    >
                                                                                        <RefreshCw size={12} className="text-emerald-400" />
                                                                                        Restore Message
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveDropdownMessageId(null);
                                                                                            handlePermanentDeleteResearchMessage(msg._id);
                                                                                        }}
                                                                                        className="w-full px-3.5 py-2 text-[11px] hover:bg-rose-50 text-red-650 flex items-center gap-2 cursor-pointer font-bold border-none bg-transparent"
                                                                                    >
                                                                                        <Trash size={12} className="text-red-400" />
                                                                                        Delete Forever
                                                                                    </button>
                                                                                </>
                                                                            )
                                                                        ) : (
                                                                            // Standard LMS Chat Message options (Only Info, and Edit if self. NO delete option)
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setActiveDropdownMessageId(null);
                                                                                        showMessageInfo(msg);
                                                                                    }}
                                                                                    className="w-full px-3.5 py-2 text-[11px] hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700 font-bold border-none bg-transparent"
                                                                                >
                                                                                    <Info size={12} className="text-slate-400" />
                                                                                    Message Info
                                                                                </button>
                                                                                {isSelf && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveDropdownMessageId(null);
                                                                                            if (msg.fileType === 'note') {
                                                                                                setEditingMessageId(msg._id);
                                                                                                setNoteModalTitle(msg.fileName || '');
                                                                                                setNoteModalText(msg.text || '');
                                                                                                setShowWriteNoteModal(true);
                                                                                            } else {
                                                                                                startEditing(msg);
                                                                                            }
                                                                                        }}
                                                                                        className="w-full px-3.5 py-2 text-[11px] hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700 font-bold border-none bg-transparent"
                                                                                    >
                                                                                        <Pencil size={12} className="text-slate-400" />
                                                                                        Edit Message
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </>
                                                            {msg.fileType === 'note' ? (
                                                                <div className="flex flex-col gap-1 min-w-[220px] text-left">
                                                                    <div className="flex items-center gap-2 select-none">
                                                                        <span className="text-base flex-shrink-0">📝</span>
                                                                        <h4 className="font-extrabold text-xs tracking-tight truncate flex-1 uppercase">
                                                                            {msg.fileName || 'Untitled Note'}
                                                                        </h4>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setViewSelectedNote(msg);
                                                                                setShowViewNoteModal(true);
                                                                            }}
                                                                            className={`flex-shrink-0 py-0.5 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border active:scale-95 ${
                                                                                isSelf
                                                                                    ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                                                                                    : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                                                                            }`}
                                                                        >
                                                                            View
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {msg.fileUrl && (
                                                                        <div className="mb-2 max-w-xs overflow-hidden rounded-2xl border border-slate-100/10">
                                                                            {msg.fileType?.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(msg.fileName) || (msg.fileName && msg.fileName.includes('video-recording')) ? (
                                                                                <video controls src={msg.fileUrl} className="w-full max-h-48 rounded-xl bg-black" />
                                                                            ) : msg.fileType?.startsWith('audio/') || /\.(webm|mp3|wav|ogg|m4a)$/i.test(msg.fileName) ? (
                                                                                <audio controls src={msg.fileUrl} className="w-full max-w-[240px] focus:outline-none" />
                                                                            ) : msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                                                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                                    <img src={msg.fileUrl} alt={msg.fileName || 'Attached Image'} onLoad={() => scrollToBottom('smooth')} className="max-w-full h-auto max-h-60 object-cover hover:opacity-90 transition-opacity" />
                                                                                </a>
                                                                            ) : (
                                                                                <div className={`flex items-center gap-3 p-3 rounded-2xl ${isSelf ? 'bg-indigo-700/50 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                                                                    <File size={24} className={isSelf ? 'text-indigo-250' : 'text-indigo-650'} />
                                                                                    <div className="flex-1 min-w-0 text-left">
                                                                                        <p className="text-xs font-bold truncate">{msg.fileName || 'Attachment'}</p>
                                                                                        <span className="text-[10px] opacity-75 uppercase">{msg.fileType ? msg.fileType.split('/')[1] : 'FILE'}</span>
                                                                                    </div>
                                                                                    <a
                                                                                        href={msg.fileUrl}
                                                                                        download={msg.fileName}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className={`p-1.5 rounded-xl hover:bg-black/10 transition-colors ${isSelf ? 'text-white' : 'text-slate-650'}`}
                                                                                        title="Download file"
                                                                                    >
                                                                                        <Download size={16} />
                                                                                    </a>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {msg.text && <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">{renderMessageTextWithLinks(msg.text, searchKeyword, isSelf)}</p>}
                                                                </>
                                                            )}

                                                            {isSelf && msg.isEdited && showOriginalMap[msg._id] && (
                                                                <div className="text-[11px] text-indigo-105 bg-indigo-750/30 border border-indigo-500/10 rounded-2xl p-2 mt-1.5 break-words text-left whitespace-pre-wrap">
                                                                    <span className="font-bold block text-[9px] uppercase tracking-wider text-indigo-300 mb-0.5">Original message</span>
                                                                    {renderMessageTextWithLinks(msg.originalText, searchKeyword, isSelf)}
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
                                                    {showRecentDelete ? "Trash is empty" : ((searchKeyword || searchDate) ? "No messages found" : "Start conversation!")}
                                                </h4>
                                                <p className="text-slate-400 text-xs mt-1">
                                                    {showRecentDelete ? "Deleted messages will automatically be permanently deleted after 10 days." : ((searchKeyword || searchDate)
                                                        ? "Try clearing your search filters to see all messages."
                                                        : `Send a message to start conversation in ${contactType === 'research' ? selectedResearchContact.name : selectedContact.name}.`
                                                    )}
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
                                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5 animate-fade-in flex-shrink-0">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {isUploadingFile ? (
                                                        <Loader2 size={16} className="animate-spin text-indigo-600 flex-shrink-0" />
                                                    ) : (
                                                        <File size={16} className="text-indigo-600 flex-shrink-0" />
                                                    )}
                                                    <span className="text-xs font-bold text-slate-800 truncate text-left">
                                                        {isUploadingFile ? `Uploading ${uploadingFileName}...` : attachedFile.fileName}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!isUploadingFile && !showAttachmentNoteInput && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAttachmentNoteInput(true)}
                                                            className="flex items-center gap-1 py-1.5 px-3 bg-indigo-55/60 hover:bg-indigo-100 text-indigo-650 rounded-xl text-[10px] font-extrabold transition-all border border-indigo-100 shadow-sm cursor-pointer"
                                                            title="Add note to this attachment"
                                                        >
                                                            <Plus size={12} />
                                                            <span>Add Note</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={clearAttachment}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-150 transition-colors cursor-pointer"
                                                        title="Remove attachment"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {showAttachmentNoteInput && (
                                                <div className="flex gap-2 animate-fade-in">
                                                    <input
                                                        type="text"
                                                        placeholder="Write notes or description for this attachment..."
                                                        value={attachedFileNote}
                                                        onChange={(e) => setAttachedFileNote(e.target.value)}
                                                        className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-400 placeholder:font-semibold"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAttachmentNoteInput(false);
                                                            setAttachedFileNote('');
                                                        }}
                                                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Message composer box */}
                                    {showRecentDelete ? (
                                        <div className="p-4 bg-rose-50 border-t border-rose-100 text-center text-xs font-bold text-rose-600 flex-shrink-0">
                                            ⚠️ You are viewing trash. Please exit trash to send messages.
                                        </div>
                                    ) : (
                                        <form
                                            onSubmit={handleComposerSubmit}
                                            className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center flex-shrink-0"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNoteModalText('');
                                                    setNoteModalTitle('');
                                                    setShowWriteNoteModal(true);
                                                }}
                                                className="p-3 text-slate-550 hover:bg-slate-50 hover:text-indigo-650 border border-slate-100 rounded-2xl transition-all active:scale-95 shadow-sm bg-white flex-shrink-0 cursor-pointer"
                                                title="Write Note"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploadingFile}
                                                className="p-3 text-slate-550 hover:bg-slate-50 hover:text-indigo-650 border border-slate-100 rounded-2xl transition-all active:scale-95 shadow-sm bg-white flex-shrink-0 disabled:opacity-50 cursor-pointer"
                                                title="Attach File"
                                            >
                                                <Paperclip size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={isAudioRecording ? stopAudioRecording : startAudioRecording}
                                                className={`p-3 border rounded-2xl transition-all active:scale-95 shadow-sm flex-shrink-0 ${isAudioRecording
                                                    ? 'border-red-550 text-slate-800 animate-pulse bg-white'
                                                    : 'text-slate-550 border-slate-100 bg-white hover:bg-slate-50 hover:text-indigo-650'
                                                    }`}
                                                title={isAudioRecording ? "Stop & Send Audio" : "Record Voice Message"}
                                            >
                                                <Mic size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowVideoOptionsModal(true)}
                                                className="p-3 text-slate-550 hover:bg-slate-50 hover:text-indigo-600 border border-slate-100 rounded-2xl transition-all active:scale-95 shadow-sm bg-white flex-shrink-0 cursor-pointer"
                                                title="Record Video Message"
                                            >
                                                <Video size={16} />
                                            </button>
                                            {isAudioRecording ? (
                                                <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl py-3 px-4 flex items-center justify-between gap-3 text-xs font-bold text-red-600">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-red-650 rounded-full animate-ping"></span>
                                                        Recording: {audioTimer}s
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={cancelAudioRecording}
                                                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Type note, message or paste link here..."
                                                    value={newMessage}
                                                    onChange={handleInputChange}
                                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-455"
                                                />
                                            )}
                                            <button
                                                type="submit"
                                                disabled={(!newMessage.trim() && !attachedFile) || isUploadingFile || isAudioRecording}
                                                className="p-3.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                                            >
                                                <Send size={16} className="fill-current" />
                                            </button>
                                        </form>
                                    )}
                                </>
                            ))}
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
            <input
                type="file"
                ref={videoFileInputRef}
                onChange={handleFileChange}
                accept="video/*"
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

            {/* 4. Edit Chat Permissions Modal */}
            {showPermissionsModal && chatRequest?.request && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[32px] border border-slate-200 shadow-2xl p-6 flex flex-col relative">
                        {/* Close button */}
                        <button
                            onClick={() => setShowPermissionsModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer"
                        >
                            ✕
                        </button>

                        <h3 className="font-extrabold text-slate-800 text-lg mb-2">Update Chat Permissions</h3>
                        <p className="text-xs text-slate-400 mb-6">Manage allowed interactions for this conversation.</p>

                        <div className="space-y-4 mb-6">
                            <label className="flex items-center gap-3 text-xs text-slate-700 font-bold cursor-not-allowed opacity-75">
                                <input type="checkbox" checked={true} disabled={true} className="w-4.5 h-4.5 rounded text-indigo-650 cursor-not-allowed" />
                                <span>Allow Chatting</span>
                            </label>
                            <label className="flex items-center gap-3 text-xs text-slate-700 font-bold cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={chatRequest.request.permissions?.audioCall}
                                    onChange={e => setChatRequest(prev => ({
                                        ...prev,
                                        request: {
                                            ...prev.request,
                                            permissions: {
                                                ...prev.request.permissions,
                                                audioCall: e.target.checked
                                            }
                                        }
                                    }))}
                                    className="w-4.5 h-4.5 rounded text-indigo-650 cursor-pointer"
                                />
                                <span>Allow Audio Call</span>
                            </label>
                            <label className="flex items-center gap-3 text-xs text-slate-700 font-bold cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={chatRequest.request.permissions?.videoCall}
                                    onChange={e => setChatRequest(prev => ({
                                        ...prev,
                                        request: {
                                            ...prev.request,
                                            permissions: {
                                                ...prev.request.permissions,
                                                videoCall: e.target.checked
                                            }
                                        }
                                    }))}
                                    className="w-4.5 h-4.5 rounded text-indigo-650 cursor-pointer"
                                />
                                <span>Allow Video Call</span>
                            </label>
                        </div>

                        <button
                            onClick={() => handleUpdatePermissions(chatRequest.request._id, chatRequest.request.permissions)}
                            className="w-full py-3 bg-emerald-550 hover:bg-emerald-650 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer text-center font-bold"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* 5. Create Research Contact Modal */}
            {showCreateResearchContactModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[32px] border border-slate-200 shadow-2xl p-6 flex flex-col relative">
                        <button
                            onClick={() => setShowCreateResearchContactModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer"
                        >
                            ✕
                        </button>

                        <h3 className="font-extrabold text-slate-800 text-lg mb-2 text-left">Create personal Contact</h3>
                        <p className="text-xs text-slate-400 mb-6 text-left">Create a personal space for your research notes and records.</p>

                        <form onSubmit={handleCreateResearchContact} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-left">Contact Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="e.g. My Math Notes, Voice Diary..."
                                    value={newResearchContactName}
                                    onChange={(e) => setNewResearchContactName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={savingResearchContact || !newResearchContactName.trim()}
                                className="w-full py-3 bg-indigo-650 hover:bg-indigo-750 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer text-center disabled:opacity-50"
                            >
                                {savingResearchContact ? 'Saving...' : 'Save Contact'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Video Option Selection Modal */}
            {showVideoOptionsModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[32px] border border-slate-200 shadow-2xl p-6 flex flex-col relative">
                        <button
                            onClick={() => setShowVideoOptionsModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer"
                        >
                            ✕
                        </button>

                        <h3 className="font-extrabold text-slate-800 text-lg mb-2 text-left">Video Message Options</h3>
                        <p className="text-xs text-slate-400 mb-6 text-left">Choose whether to upload an existing video or record from camera.</p>

                        <div className="space-y-3.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowVideoOptionsModal(false);
                                    videoFileInputRef.current?.click();
                                }}
                                className="w-full py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                📁 Upload Video File
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowVideoOptionsModal(false);
                                    setShowVideoRecordModal(true);
                                }}
                                className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-750 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                                📹 Record from Camera
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 6. Video Recording Modal */}
            {showVideoRecordModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-200 shadow-2xl p-6 flex flex-col relative overflow-hidden">
                        <button
                            onClick={closeVideoRecording}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer z-10"
                        >
                            ✕
                        </button>
                        <h3 className="font-extrabold text-slate-800 text-base mb-4 text-left">Record Video Message</h3>

                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-5 border border-slate-250 shadow-inner flex items-center justify-center">
                            <video
                                ref={videoPreviewRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            {isVideoRecording && (
                                <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                    REC {videoTimer}s
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {!isVideoRecording ? (
                                <button
                                    onClick={startVideoRecording}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer text-center"
                                >
                                    Start Recording
                                </button>
                            ) : (
                                <button
                                    onClick={stopVideoRecording}
                                    className="flex-1 py-3 bg-red-650 hover:bg-red-750 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer text-center animate-pulse"
                                >
                                    Stop & Send
                                </button>
                            )}
                            <button
                                onClick={closeVideoRecording}
                                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* 7. Write Note Modal (Multiline Text Note) */}
            {showWriteNoteModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[32px] border border-slate-200 shadow-2xl p-6 flex flex-col relative">
                        <button
                            onClick={() => {
                                setShowWriteNoteModal(false);
                                setEditingResearchMessageId(null);
                            }}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer z-10"
                        >
                            ✕
                        </button>
                        
                        <h3 className="font-extrabold text-slate-800 text-lg mb-1.5 text-left flex items-center gap-2">
                            <span>📝</span>
                            <span>{editingResearchMessageId ? 'Edit Personal Note' : 'Write Personal Note'}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mb-5 text-left font-semibold">
                            Compose a detailed note. You can press Enter to add new paragraphs.
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-1.5 text-left">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Note Title / Heading</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Science Project notes, URL list..."
                                    value={noteModalTitle}
                                    onChange={(e) => setNoteModalTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all placeholder:text-slate-400 placeholder:font-semibold"
                                />
                            </div>

                            <div className="space-y-1.5 text-left">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Note Content</label>
                                <textarea
                                    autoFocus
                                    required
                                    placeholder="Type your personal research note, copy-paste long texts, code, or links here..."
                                    value={noteModalText}
                                    onChange={(e) => setNoteModalText(e.target.value)}
                                    className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all resize-none placeholder:text-slate-400 placeholder:font-semibold"
                                />
                            </div>
                            
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowWriteNoteModal(false);
                                        setEditingResearchMessageId(null);
                                    }}
                                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={editingResearchMessageId ? () => handleEditResearchMessage() : handleSendNoteFromModal}
                                    disabled={!noteModalText.trim()}
                                    className="py-3 px-6 bg-indigo-650 hover:bg-indigo-750 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer text-center font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <span>{editingResearchMessageId ? 'Save Note' : 'Send Note'}</span>
                                    {editingResearchMessageId ? <Pencil size={14} /> : <Send size={14} className="fill-current" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 8. View Note Modal (Read-only Note Display) */}
            {showViewNoteModal && viewSelectedNote && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-xl rounded-[32px] border border-slate-200 shadow-2xl p-6 flex flex-col relative max-h-[85vh]">
                        <button
                            onClick={() => {
                                setShowViewNoteModal(false);
                                setViewSelectedNote(null);
                            }}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer z-10"
                        >
                            ✕
                        </button>
                        
                        <h3 className="font-extrabold text-slate-800 text-lg mb-1 flex items-center gap-2 border-b border-slate-100 pb-3 pr-8 text-left uppercase tracking-tight">
                            <span>📝</span>
                            <span className="truncate flex-1">{viewSelectedNote.fileName || 'Untitled Note'}</span>
                        </h3>

                        <div className="flex-1 overflow-y-auto my-4 pr-1 text-left whitespace-pre-wrap text-sm font-semibold text-slate-700 leading-relaxed max-h-[50vh] break-words">
                            {renderMessageTextWithLinks(viewSelectedNote.text, searchKeyword, viewSelectedNote.sender === user._id || viewSelectedNote.owner === user._id)}
                        </div>

                        <div className="flex justify-end border-t border-slate-100 pt-4 mt-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowViewNoteModal(false);
                                    setViewSelectedNote(null);
                                }}
                                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer text-center font-bold"
                            >
                                Close Note
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
