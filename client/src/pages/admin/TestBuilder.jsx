import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Home, Settings, Eye, Send, BarChart2, Clock, Users,
    Search, Type, AlignLeft, CheckSquare, List,
    ChevronDown, Upload, Download, Star, Calendar, Image as ImageIcon,
    MoreVertical, Plus, Wand2, ArrowLeft,
    FileText, Zap, Layout, Share2, History, MessageSquare,
    Play, PanelLeft, Bot, Palette, Link, Save, Hash, Check,
    FolderUp, CircleDot, File, Mic, Video, Monitor, Camera, Phone,
    PlaySquare, Box, Globe, Headphones, Brain, Trash2, X, Sparkles, CheckCircle2, AlertCircle, Copy, Info,
    Bold, Italic, Underline, Strikethrough, ArrowRightLeft, Activity, Code, Quote, Table, HelpCircle, Sliders, GitBranch, Smile, Heading, ListOrdered, GripVertical, AlertTriangle,
    Move, ZoomIn, ZoomOut, Feather, Cog, AlignCenter, AlignRight, AlignJustify, Edit, PieChart, Languages, Paperclip,
    Files, Volume2, PhoneCall, Film
} from 'lucide-react';
import { uploadVideo } from "../../api/videoApi";
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ShortAnswerWidget from '../../components/builder/ShortAnswerWidget';
import VoiceWidget from '../../components/builder/VoiceWidget';
import VideoWidget from '../../components/builder/VideoWidget';
import ParagraphWidget from '../../components/builder/ParagraphWidget';
import ConnectItModal from '../../components/builder/ConnectItModal';
import PublishOptionsModal from '../../components/builder/PublishOptionsModal';
import PublishSuccessModal from '../../components/builder/PublishSuccessModal';

// Extracted Modals
import AdvanceSettingsModal from '../../components/builder/modals/AdvanceSettingsModal';
import LogicalSettingsModal from '../../components/builder/modals/LogicalSettingsModal';
import ValidationSettingsModal from '../../components/builder/modals/ValidationSettingsModal';
import ImageInsertModal from '../../components/builder/modals/ImageInsertModal';
import FilePreviewModal from '../../components/builder/modals/FilePreviewModal';

// Extracted Settings Drawers
import AssistiveDrawer from '../../components/builder/drawers/AssistiveDrawer';
import ControlsDrawer from '../../components/builder/drawers/ControlsDrawer';
import VideoSettingsDrawer from '../../components/builder/drawers/VideoSettingsDrawer';
import ParticularsDrawer from '../../components/builder/drawers/ParticularsDrawer';
import LogicDrawer from '../../components/builder/drawers/LogicDrawer';
import TextLogicDrawer from '../../components/builder/drawers/TextLogicDrawer';
import ValidationDrawer from '../../components/builder/drawers/ValidationDrawer';
import ScoringDrawer from '../../components/builder/drawers/ScoringDrawer';
import AdvancedDrawer from '../../components/builder/drawers/AdvancedDrawer';

// Extracted Element Builders
import ShortAnswerBuilder from '../../components/builder/elements/ShortAnswerBuilder';
import ParagraphBuilder from '../../components/builder/elements/ParagraphBuilder';
import MCQBuilder from '../../components/builder/elements/MCQBuilder';
import CheckboxesBuilder from '../../components/builder/elements/CheckboxesBuilder';
import DropdownBuilder from '../../components/builder/elements/DropdownBuilder';
import TrueFalseBuilder from '../../components/builder/elements/TrueFalseBuilder';
import MatchingBuilder from '../../components/builder/elements/MatchingBuilder';
import FillBlanksBuilder from '../../components/builder/elements/FillBlanksBuilder';
import AssignmentBuilder from '../../components/builder/elements/AssignmentBuilder';
import ActivityBuilder from '../../components/builder/elements/ActivityBuilder';
import DateTimeBuilder from '../../components/builder/elements/DateTimeBuilder';
import AudioListeningBuilder from '../../components/builder/elements/AudioListeningBuilder';
import ImageBuilder from '../../components/builder/elements/ImageBuilder';
import FileUploadBuilder from '../../components/builder/elements/FileUploadBuilder';
import RatingBuilder from '../../components/builder/elements/RatingBuilder';
import YouTubeBuilder from '../../components/builder/elements/YouTubeBuilder';
import VideoBuilder from '../../components/builder/elements/VideoBuilder';
import PDFBuilder from '../../components/builder/elements/PDFBuilder';
import VoiceRecBuilder from '../../components/builder/elements/VoiceRecBuilder';
import VideoRecBuilder from '../../components/builder/elements/VideoRecBuilder';
import CallRecBuilder from '../../components/builder/elements/CallRecBuilder';
import ScreenRecBuilder from '../../components/builder/elements/ScreenRecBuilder';
import ScreenShotBuilder from '../../components/builder/elements/ScreenShotBuilder';
import TextChatAIBuilder from '../../components/builder/elements/TextChatAIBuilder';
import VoiceChatAIBuilder from '../../components/builder/elements/VoiceChatAIBuilder';
import WebpageBuilder from '../../components/builder/elements/WebpageBuilder';
import EmbeddedVideoBuilder from '../../components/builder/elements/EmbeddedVideoBuilder';
import EmbeddedSMBuilder from '../../components/builder/elements/EmbeddedSMBuilder';
import MultiFileBuilder from '../../components/builder/elements/MultiFileBuilder';
import VideoCallBuilder from '../../components/builder/elements/VideoCallBuilder';

// Helper to strip HTML tags from rich text content
const stripHtml = (html) => {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, ' ');
    text = text.replace(/<[^>]*>/g, '');
    return text.replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');
};

const getYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = String(url).match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
};

const getEmbedUrl = (url) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&#?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    if (url.includes('embed') || url.includes('player')) return url;
    return url;
};

const addonsList = [
    { label: 'Translator it', icon: Languages },
    { label: 'Help with AI', icon: Bot },
    { label: 'Voice typing', icon: Mic },
    { label: 'Timer', icon: Clock },
    { label: 'Rich Text', icon: Type }
];

// Custom Widget for Multiple Choice, Checkboxes, Dropdown, File Upload, Rating, Date/Time
const QuestionBuilderCard = ({
    element,
    index,
    onDelete,
    onDuplicate,
    onUpdateText,
    onUpdateOptions,
    onUpdateField,
    onApplyAddonToAll,
    onApplyMoreSettingToAll,
    onRemoveAddon,
    onDragStartCustom,
    isDragged,
    isDragging,
    onAddonClick
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isFooterExpanded, setIsFooterExpanded] = useState(false);
    const [activeFooterTab, setActiveFooterTab] = useState(null); // null | 'assistive' | 'particulars' | 'logic' | 'textLogic' | 'validation' | 'scoring' | 'advanced'
    const [isRecording, setIsRecording] = useState(false);
    const [isCardDraggable, setIsCardDraggable] = useState(false);
    const [zoomScale, setZoomScale] = useState(100);
    const [showSettings, setShowSettings] = useState(false);
    const [openMenu, setOpenMenu] = useState(null); // null | 'align' | 'insert'

    // New overlay and sub-feature states for Short Answer element
    const [showImageModal, setShowImageModal] = useState(false);
    const [activeImageTab, setActiveImageTab] = useState('Upload');
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [imageByUrl, setImageByUrl] = useState('');
    const [lightboxImage, setLightboxImage] = useState(null);
    const [lightboxScale, setLightboxScale] = useState(100);
    const handleAddInsertedImage = (imageUrl) => {
        const currentImages = element.insertedImages || [];
        if (currentImages.length >= 5) {
            toast.error("Maximum of 5 images allowed!");
            return;
        }
        onUpdateField('insertedImages', [...currentImages, imageUrl]);
        setShowImageModal(false);
        toast.success("Image added successfully!");
    };
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteNameInput, setNoteNameInput] = useState('');
    const [noteContentInput, setNoteContentInput] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [showSwitcherMenu, setShowSwitcherMenu] = useState(false);
    const [showUploadMenu, setShowUploadMenu] = useState(false);
    const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
    const [showAdvanceSettingsModal, setShowAdvanceSettingsModal] = useState(false);
    const [draftParticulars, setDraftParticulars] = useState({});
    const [showLogicalSettingsModal, setShowLogicalSettingsModal] = useState(false);
    const [draftLogicalSettings, setDraftLogicalSettings] = useState({});
    const [showValidationSettingsModal, setShowValidationSettingsModal] = useState(false);
    const [draftValidationSettings, setDraftValidationSettings] = useState({});
    const [showNoteDropdown, setShowNoteDropdown] = useState(false);
    const [noteActiveFormat, setNoteActiveFormat] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false,
        subscript: false,
        superscript: false,
        justifyLeft: false,
        justifyCenter: false,
        justifyRight: false,
        insertUnorderedList: false,
        insertOrderedList: false
    });

    const updateNoteActiveFormat = () => {
        setNoteActiveFormat({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikeThrough: document.queryCommandState('strikeThrough'),
            subscript: document.queryCommandState('subscript'),
            superscript: document.queryCommandState('superscript'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight'),
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
            insertOrderedList: document.queryCommandState('insertOrderedList')
        });
    };

    const handleNoteFormat = (command, value = null) => {
        document.execCommand(command, false, value);
        if (noteEditorRef.current) {
            setNoteContentInput(noteEditorRef.current.innerHTML);
        }
        updateNoteActiveFormat();
    };

    const resourceFileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const noteEditorRef = useRef(null);

    useEffect(() => {
        if (showNoteModal && noteEditorRef.current) {
            noteEditorRef.current.innerHTML = noteContentInput || '';
        }
    }, [showNoteModal]);

    const renderAddonsWindow = () => {
        const currentAddons = element.addons || [];
        return (
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const addonData = e.dataTransfer.getData('addonType');
                    if (addonData) {
                        const addon = JSON.parse(addonData);
                        const nextAddons = element.addons || [];
                        if (nextAddons.includes(addon.label)) {
                            toast.error(`${addon.label} is already added!`);
                        } else if (nextAddons.length >= 5) {
                            toast.error("Maximum of 5 addons allowed!");
                        } else {
                            onUpdateField('addons', [...nextAddons, addon.label]);
                            toast.success(`${addon.label} added!`);
                        }
                    }
                }}
                className="bg-white rounded-2xl border border-slate-150 p-4 space-y-4 animate-fade-in shadow-inner w-full relative"
            >
                {/* Header Row */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 select-none">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                        <PieChart size={14} className="text-purple-600 animate-pulse" /> Addons Window
                    </span>
                    <button
                        type="button"
                        onClick={() => setActiveFooterTab(null)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Dropped Addons list (inline badges in a single row with Apply to all button under each card) */}
                <div className="flex flex-wrap items-center gap-4 py-3 min-h-[85px] border border-dashed border-slate-200 rounded-xl bg-slate-50/50 px-3.5 relative">
                    {currentAddons.length > 0 ? (
                        currentAddons.map((addonLabel) => {
                            const addonObj = addonsList.find(a => a.label === addonLabel) || { icon: HelpCircle };
                            const IconComponent = addonObj.icon;
                            const isSyncing = (element.appliedToAllAddons || []).includes(addonLabel);
                            return (
                                <div key={addonLabel} className="flex flex-col items-center gap-1.5 shrink-0 animate-fade-in">
                                    {/* Addon Card/Badge */}
                                    <div className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 shadow-sm hover:border-purple-400 transition-all text-xs font-bold text-slate-700 min-w-[140px]">
                                        <div className="p-1 bg-purple-50 text-purple-600 rounded">
                                            <IconComponent size={14} />
                                        </div>
                                        <span className="truncate max-w-[80px]">{addonLabel}</span>

                                        {/* Cancel Cross inside the card */}
                                        <button
                                            type="button"
                                            onClick={() => onRemoveAddon(addonLabel)}
                                            className="absolute right-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-all"
                                            title="Remove Addon"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>

                                    {/* Apply to all button under each card */}
                                    <button
                                        type="button"
                                        onClick={() => onApplyAddonToAll(addonLabel, !isSyncing)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border w-full text-center ${isSyncing
                                            ? 'bg-purple-100 border-purple-200 text-purple-700 font-extrabold shadow-sm'
                                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                            }`}
                                    >
                                        {isSyncing ? 'Applied to all' : 'Apply to all'}
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <span className="text-xs text-slate-400 font-semibold italic mx-auto select-none py-4">
                            Drag and drop Addons here to activate them
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const label = element.label || 'Short Answer';

    const getElementIcon = (lbl) => {
        switch (lbl) {
            case 'Short Answer': return Type;
            case 'Paragraph Answer':
            case 'Paragraph': return AlignLeft;
            case 'Multiple choices':
            case 'Multiple Choice': return CircleDot;
            case 'Checkbox':
            case 'Checkboxes': return CheckSquare;
            case 'Dropdown': return List;
            case 'Date & Time':
            case 'Date/Time': return Calendar;
            case 'Rating': return Star;
            case 'File upload':
            case 'File Upload': return Upload;
            case 'Image Displaying':
            case 'Image': return ImageIcon;
            case 'Video Displaying':
            case 'Video': return Film;
            case 'PDF Displaying':
            case 'PDF': return FileText;
            case 'Webpage Displaying': return Globe;
            case 'Embedded Video Displaying':
            case 'YouTube': return Play;
            case 'Embedded SM Content Displaying': return Share2;
            case 'Audio listening Displaying':
            case 'Audio Listening': return Headphones;
            case 'Multi file Displaying': return Files;
            case 'Screenshot taking':
            case 'Screen Shot': return Camera;
            case 'Screen recording':
            case 'Screen Rec': return Monitor;
            case 'Voice recording':
            case 'Voice Rec': return Mic;
            case 'Video recording':
            case 'Video Rec': return Video;
            case 'Web based Audio calling':
            case 'Call Rec': return PhoneCall;
            case 'Web based video calling': return Video;
            case 'Text based AI agent':
            case 'Text Chat AI': return MessageSquare;
            case 'Voice based AI Agent':
            case 'Voice Chat AI': return Volume2;
            case 'Matching': return ArrowRightLeft;
            case 'True/False': return CheckCircle2;
            case 'Fill in the Blanks': return Type;
            case 'Assignment': return FileText;
            case 'Activity': return Activity;
            default: return FileText;
        }
    };

    const WidgetIcon = getElementIcon(label);

    const options = element.options || [
        { text: 'Option 1', isCorrect: false },
        { text: 'Option 2', isCorrect: false }
    ];

    const validation = element.validation || {
        minLength: '',
        maxLength: '',
        regex: '',
        numericOnly: false,
        emailOnly: false,
        urlOnly: false
    };

    const assistive = element.assistive || {
        aiReader: false,
        textToSpeech: false,
        speechToText: false,
        translation: false,
        dyslexiaMode: false,
        accessibility: false,
        relevantInformation: true,
        myDrafts: true,
        temporaryFill: true,
        audioAnswer: true,
        chatWithTeacher: true,
        uploadAttachment: true,
        exampleSection: true,
        offlineWriting: true,
        calculator: true,
        accessibilityMode: true
    };

    const particulars = element.particulars || {
        shuffleOptions: false,
        multipleAttempts: false,
        charLimit: '',
        wordLimit: '',
        fileSizeLimit: 10,
        fileTypes: 'All',
        required: false,
        singleLineMode: false,
        minChars: '',
        maxChars: '',
        minWords: '',
        maxWords: '',
        placeholderText: 'Your answer',
        defaultValue: '',
        inputWidth: '100%',
        validationRules: '',
        answerMode: 'Text + Upload + Audio',
        enableTextStyle: false,
        style: {
            fontSize: '14px',
            fontWeight: 'normal',
            textColor: '#334155',
            bgColor: '#F8FAFC',
            borderRadius: '16px',
            borderStyle: 'solid',
            borderColor: '#E2E8F0'
        },
        supportingResources: []
    };

    const textLogic = element.textLogic || {
        keywordValidation: '',
        regexValidation: '',
        contains: '',
        doesNotContain: '',
        startsWith: '',
        endsWith: '',
        charLimits: ''
    };

    const videoSettings = element.videoSettings || {
        allowRecording: true,
        allowWebcam: true,
        allowScreen: true,
        allowScreenWebcam: true,
        allowAudioOnly: true,
        allowUpload: true,
        minDuration: 30,
        maxDuration: 600,
        maxFileSize: 100,
        allowedFileTypes: 'mp4,webm,mov',
        recordingAttemptsLimit: 3,
        webcamRequired: false,
        microphoneRequired: false,
        audioRequired: false,
        screenSharingRequired: false,
        fullScreenRequired: false,
        tabSwitchingDetection: false,
        multipleFaceDetection: false,
        faceMissingDetection: false,
        backgroundNoiseDetection: false,
        aiTranscriptEnabled: false,
        timestampFeedbackEnabled: false
    };

    const logic = element.logic || {
        dependsOnQuestion: '',
        dependsOnAnswer: '',
        scoreTrigger: ''
    };

    const advanced = element.advanced || {
        tags: '',
        difficulty: 'Medium',
        bloomTaxonomy: 'Understanding',
        learningOutcome: '',
        subjectMapping: '',
        topicMapping: ''
    };

    const required = !!element.required;
    const enabled = element.enabled !== false;
    const writeMode = !!element.writeMode;
    const marks = element.marks !== undefined ? element.marks : 1;
    const negativeMarks = element.negativeMarks || 0;
    const partialMarks = !!element.partialMarks;
    const evaluationMode = element.evaluationMode || 'auto';

    const handleUpdateNestedField = (subField, key, val) => {
        onUpdateField(subField, {
            ...(element[subField] || {}),
            [key]: val
        });
    };

    const handleAddOption = () => {
        const newOptions = [...options, { text: `Option ${options.length + 1}`, isCorrect: false }];
        onUpdateOptions(newOptions);
    };

    const handleUpdateOptionText = (optIdx, val) => {
        const newOptions = options.map((opt, i) => i === optIdx ? { ...opt, text: val } : opt);
        onUpdateOptions(newOptions);
    };

    const handleToggleCorrect = (optIdx) => {
        const newOptions = options.map((opt, i) => i === optIdx ? { ...opt, isCorrect: !opt.isCorrect } : opt);
        onUpdateOptions(newOptions);
    };

    const handleRemoveOption = (optIdx) => {
        if (options.length <= 1) {
            toast.error("At least one option is required");
            return;
        }
        const newOptions = options.filter((_, i) => i !== optIdx);
        onUpdateOptions(newOptions);
    };

    const handleMicClick = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Your browser does not support speech recognition.");
            return;
        }
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onstart = () => setIsRecording(true);
        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            const currentText = element.text || '';
            onUpdateText(currentText + (currentText ? ' ' : '') + transcript);
        };
        rec.onerror = (err) => {
            console.error("Speech error", err);
            setIsRecording(false);
        };
        rec.onend = () => setIsRecording(false);
        recognitionRef.current = rec;
        rec.start();
    };

    const handleAiGenerate = () => {
        toast.loading("AI is thinking...", { id: 'ai-gen' });
        setTimeout(() => {
            let mockQ = "Explain your understanding of the given topic.";
            let mockOpts = [];
            if (label === 'Multiple Choice' || label === 'Dropdown' || label === 'Audio Listening') {
                mockQ = "Which of the following is a key feature of React?";
                mockOpts = [
                    { text: "Virtual DOM", isCorrect: true },
                    { text: "Direct DOM manipulation", isCorrect: false },
                    { text: "Two-way data binding by default", isCorrect: false },
                    { text: "Static templates", isCorrect: false }
                ];
            } else if (label === 'Checkboxes') {
                mockQ = "Select all frontend frameworks/libraries from the list:";
                mockOpts = [
                    { text: "React", isCorrect: true },
                    { text: "Angular", isCorrect: true },
                    { text: "Django", isCorrect: false },
                    { text: "Vue", isCorrect: true }
                ];
            } else if (label === 'True/False') {
                mockQ = "Vite uses ES modules internally for hot module replacement during development.";
                mockOpts = [
                    { text: "True", isCorrect: true },
                    { text: "False", isCorrect: false }
                ];
            } else if (label === 'Matching') {
                mockQ = "Match the following databases with their primary types:";
                onUpdateField('matchingPairs', [
                    { key: "MongoDB", value: "NoSQL Document Store" },
                    { key: "PostgreSQL", value: "Relational RDBMS" },
                    { key: "Neo4j", value: "Graph Database" }
                ]);
            } else if (label === 'Fill in the Blanks') {
                mockQ = "A [blank] is a function passed as an argument to another function, to be executed after some event.";
                onUpdateField('blankAnswers', ["callback", "callback function"]);
            } else if (label === 'Paragraph') {
                mockQ = "Compare and contrast SQL and NoSQL databases. Mention consistency, horizontal scaling, and transaction support.";
            } else if (label === 'Voice Rec') {
                mockQ = "Please pronounce the word: 'Antigravity' and describe its meaning in physics.";
            }

            onUpdateText(mockQ);
            if (mockOpts.length > 0) onUpdateOptions(mockOpts);
            toast.success("AI generated question completed!", { id: 'ai-gen' });
        }, 1200);
    };

    const handleFormat = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onUpdateText(editorRef.current.innerHTML);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const list = element.uploadedFiles || [];
            onUpdateField('uploadedFiles', [...list, { name: file.name, size: file.size }]);
            toast.success(`Attached file: ${file.name}`);
        }
    };

    const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 10, 50));
    const toggleMenu = (menu) => setOpenMenu(prev => prev === menu ? null : menu);

    return (
        <div
            className={`bg-white rounded-xl border transition-all duration-300 font-sans shadow-sm hover:shadow-md ${enabled ? 'border-slate-200 hover:border-purple-300' : 'border-slate-200 bg-slate-50/50 opacity-70'
                } ${writeMode ? 'ring-2 ring-purple-100 border-purple-400' : ''} ${isDragged ? 'opacity-40 border-purple-500 border-dashed scale-[0.99] bg-purple-50/30 shadow-inner' : ''
                } ${(showSwitcherMenu || showUploadMenu) ? 'overflow-visible' : 'overflow-hidden'} mb-2 ${isDragging ? 'pointer-events-none select-none' : ''}`}
        >

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            <input
                type="file"
                ref={resourceFileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = () => {
                            onUpdateField('uploadedResource', {
                                name: file.name,
                                size: file.size,
                                type: file.name.split('.').pop().toUpperCase(),
                                url: reader.result
                            });
                        };
                        reader.readAsDataURL(file);
                        toast.success(`Attached resource: ${file.name}`);
                    }
                }}
            />

            {/* HEADER SECTION */}
            <div className="flex flex-wrap items-center justify-between py-1.5 px-3 border-b border-slate-100 bg-white gap-2 select-none">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#6366F1] text-white rounded-lg flex items-center justify-center shadow-sm w-7.5 h-7.5">
                        <WidgetIcon size={14} />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{label}</span>
                    {!isExpanded && (
                        <span className="text-xs text-slate-500 font-extrabold truncate max-w-[150px] sm:max-w-[250px] border-l border-slate-200 pl-2">
                            {element.text ? element.text.replace(/<[^>]*>/g, '') : "Type your Text here"}
                        </span>
                    )}
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onDragStartCustom(e, index);
                        }}
                        onTouchStart={(e) => {
                            onDragStartCustom(e, index);
                        }}
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-655 transition-colors w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg shrink-0 pointer-events-auto"
                        title="Drag to reorder"
                    >
                        <Move size={16} />
                    </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 relative">
                    {isExpanded && (
                        <>
                            {/* Make it using AI */}
                            <button
                                type="button"
                                onClick={label === 'Short Answer' ? () => toast("Coming Soon", { icon: 'ℹ️' }) : handleAiGenerate}
                                className="px-3 py-1.5 bg-[#0086F0] text-white hover:bg-blue-600 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                title="Generate Question content automatically using AI"
                            >
                                <Wand2 size={13} />
                                <span>Make it using AI</span>
                            </button>

                            {/* Upload */}
                            {label === 'Short Answer' ? (
                                element.uploadedResource ? (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowUploadMenu(!showUploadMenu)}
                                            className="px-3 py-1.5 bg-[#5A5CD6] hover:bg-[#4a4cb2] text-white rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                            title="Manage uploaded resource"
                                        >
                                            <Upload size={13} />
                                            <span>File 1 ▼</span>
                                        </button>
                                        {showUploadMenu && (
                                            <div className="absolute right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-[100] flex flex-col min-w-[150px] text-xs font-semibold text-slate-700 animate-slide-up">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowUploadMenu(false);
                                                        if (element.uploadedResource?.url) {
                                                            const dataUrl = element.uploadedResource.url;
                                                            if (dataUrl.startsWith('data:')) {
                                                                try {
                                                                    const parts = dataUrl.split(',');
                                                                    const mime = parts[0].match(/:(.*?);/)[1];
                                                                    const bstr = atob(parts[1]);
                                                                    let n = bstr.length;
                                                                    const u8arr = new Uint8Array(n);
                                                                    while (n--) {
                                                                        u8arr[n] = bstr.charCodeAt(n);
                                                                    }
                                                                    const blob = new Blob([u8arr], { type: mime });
                                                                    const blobUrl = URL.createObjectURL(blob);
                                                                    window.open(blobUrl, '_blank');
                                                                } catch (e) {
                                                                    const newWindow = window.open();
                                                                    if (newWindow) {
                                                                        newWindow.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                                    }
                                                                }
                                                            } else {
                                                                window.open(dataUrl, '_blank');
                                                            }
                                                        } else {
                                                            toast.error("No file to preview");
                                                        }
                                                    }}
                                                    className="px-4 py-2 hover:bg-slate-50 text-left transition-colors flex items-center gap-2"
                                                >
                                                    <span>Preview File</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowUploadMenu(false);
                                                        resourceFileInputRef.current?.click();
                                                    }}
                                                    className="px-4 py-2 hover:bg-slate-50 text-left transition-colors flex items-center gap-2"
                                                >
                                                    <span>Replace File</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowUploadMenu(false);
                                                        onUpdateField('uploadedResource', null);
                                                        toast.success("Attached resource removed");
                                                    }}
                                                    className="px-4 py-2 hover:bg-slate-50 text-left text-red-600 transition-colors flex items-center gap-2"
                                                >
                                                    <span>Remove File</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => resourceFileInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-[#5A5CD6] hover:bg-[#4a4cb2] text-white rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                        title="Upload supporting resources (PDF, DOC, etc.)"
                                    >
                                        <Upload size={13} />
                                        <span>Upload</span>
                                    </button>
                                )
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    className="px-3 py-1.5 bg-[#5A5CD6] hover:bg-[#4a4cb2] text-white rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                    title="Upload supporting resources (PDF, DOC, etc.)"
                                >
                                    <Upload size={13} />
                                    <span>Upload</span>
                                </button>
                            )}

                            {/* Write / Note 1 */}
                            {label === 'Short Answer' ? (
                                <div className="relative">
                                    {element.noteContent ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setShowNoteDropdown(!showNoteDropdown)}
                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm animate-fade-in"
                                                title="Note Options"
                                            >
                                                <FileText size={13} />
                                                <span>Note 1</span>
                                                <ChevronDown size={12} className={`transition-transform ${showNoteDropdown ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showNoteDropdown && (
                                                <div className="absolute right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-[100] flex flex-col gap-0.5 min-w-[130px] animate-fade-in">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNoteContentInput(element.noteContent || '');
                                                            setShowNoteModal(true);
                                                            setShowNoteDropdown(false);
                                                            setTimeout(updateNoteActiveFormat, 100);
                                                        }}
                                                        className="w-full px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700 transition-colors"
                                                    >
                                                        <Edit size={12} className="text-purple-650 shrink-0" />
                                                        <span>Edit </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const win = window.open('', '_blank');
                                                            win.document.write(`
                                                                <!DOCTYPE html>
                                                                <html>
                                                                <head>
                                                                    <title>Note Preview - ${element.noteContent.replace(/<[^>]*>/g, '').slice(0, 30) || 'Untitled'}</title>
                                                                    <style>
                                                                        body {
                                                                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                                                            background-color: #f0f2f5;
                                                                            margin: 0;
                                                                            padding: 40px 20px;
                                                                            display: flex;
                                                                            justify-content: center;
                                                                        }
                                                                        .document-container {
                                                                            background-color: #ffffff;
                                                                            box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05);
                                                                            border: 1px solid #e2e8f0;
                                                                            border-radius: 8px;
                                                                            width: 100%;
                                                                            max-width: 800px;
                                                                            min-height: 29.7cm;
                                                                            padding: 60px 80px;
                                                                            box-sizing: border-box;
                                                                        }
                                                                        .content {
                                                                            font-size: 15px;
                                                                            line-height: 1.6;
                                                                            color: #1a202c;
                                                                        }
                                                                        p { margin-top: 0; margin-bottom: 1em; }
                                                                    </style>
                                                                </head>
                                                                <body>
                                                                    <div class="document-container">
                                                                        <div class="content">
                                                                            ${element.noteContent}
                                                                        </div>
                                                                    </div>
                                                                </body>
                                                                </html>
                                                            `);
                                                            win.document.close();
                                                            setShowNoteDropdown(false);
                                                        }}
                                                        className="w-full px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700 transition-colors"
                                                    >
                                                        <Eye size={12} className="text-blue-500 shrink-0" />
                                                        <span>Preview</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onUpdateField('noteContent', '');
                                                            setShowNoteDropdown(false);
                                                            toast.success("Note removed successfully!");
                                                        }}
                                                        className="w-full px-2.5 py-1.5 hover:bg-red-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-red-650 transition-colors"
                                                    >
                                                        <Trash2 size={12} className="text-red-500 shrink-0" />
                                                        <span>Remove</span>
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNoteContentInput(element.noteContent || '');
                                                setShowNoteModal(true);
                                                setTimeout(updateNoteActiveFormat, 100);
                                            }}
                                            className="px-3 py-1.5 bg-black hover:bg-slate-900 text-white rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                            title="Open Note Editor"
                                        >
                                            <Type size={13} />
                                            <span>Write</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextWriteMode = !writeMode;
                                        onUpdateField('writeMode', nextWriteMode);
                                        if (!nextWriteMode) {
                                            onUpdateText(stripHtml(element.text || ''));
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm ${writeMode ? 'bg-[#5A5CD6] text-white' : 'bg-black hover:bg-slate-900 text-white'}`}
                                    title="Toggle Advanced Rich Text Toolbar"
                                >
                                    <Type size={13} />
                                    <span>Write</span>
                                </button>
                            )}

                            {/* Image / Media URL */}
                            {label === 'Short Answer' ? (
                                <button
                                    type="button"
                                    onClick={() => setShowImageModal(true)}
                                    className={`p-1.5 rounded-lg transition-all ${element.insertedImage ? 'bg-purple-100 text-purple-750' : 'bg-slate-100 text-slate-655 hover:bg-slate-200'}`}
                                    title="Insert Image"
                                >
                                    <ImageIcon size={14} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const url = prompt("Enter media URL (image, video, or audio file):");
                                        if (url) onUpdateField('mediaUrl', url);
                                    }}
                                    className={`p-1.5 rounded-lg transition-all ${element.mediaUrl ? 'bg-purple-100 text-purple-750' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    title="Attach media Link URL"
                                >
                                    <ImageIcon size={14} />
                                </button>
                            )}

                            {/* Duplicate */}
                            {label !== 'Short Answer' && (
                                <button
                                    type="button"
                                    onClick={onDuplicate}
                                    className="p-1.5 bg-slate-100 text-slate-605 hover:bg-slate-200 rounded-lg transition-all"
                                    title="Duplicate Question"
                                >
                                    <Copy size={13} />
                                </button>
                            )}
                            {/* Switcher - visible only when expanded */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowSwitcherMenu(!showSwitcherMenu)}
                                    className={`p-1.5 rounded-lg transition-all ${showSwitcherMenu ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-655 hover:bg-slate-200'}`}
                                    title="Quick Element Switcher"
                                >
                                    <ArrowRightLeft size={14} />
                                </button>
                                {showSwitcherMenu && (
                                    <div className="absolute right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-[100] flex flex-col min-w-[170px] text-xs font-semibold text-slate-700 animate-slide-up">
                                        {[
                                            { label: 'Short Answer' },
                                            { label: 'Paragraph' },
                                            { label: 'Multiple Choice' },
                                            { label: 'Checkboxes' },
                                            { label: 'Dropdown' },
                                            { label: 'File Upload' },
                                            { label: 'Linear Scale' },
                                            { label: 'Rating' },
                                            { label: 'Multiple Choice Grid' },
                                            { label: 'Checkbox Grid' }
                                        ].map((item) => (
                                            <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => {
                                                    onUpdateField('label', item.label);
                                                    onUpdateField('type', item.label);
                                                    setShowSwitcherMenu(false);
                                                    toast.success(`Converted to ${item.label}`);
                                                }}
                                                className="px-4 py-2 hover:bg-slate-55 text-left transition-colors flex items-center justify-between"
                                            >
                                                <span>{item.label}</span>
                                                {label === item.label && <span className="w-1.5 h-1.5 rounded-full bg-indigo-650" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Delete Question - always visible in header */}
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1.5 bg-red-50 text-[#EC3F3F] hover:bg-red-100 rounded-lg transition-all"
                        title="Delete Question"
                    >
                        <Trash2 size={13} />
                    </button>

                    {/* Collapse */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1.5 text-slate-450 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all ${isExpanded ? '' : 'rotate-180'}`}
                        title={isExpanded ? "Collapse Question" : "Expand Question"}
                    >
                        <ChevronDown size={16} />
                    </button>
                </div>
            </div>

            {/* EXPANDED CONTENT PANEL */}
            {isExpanded && (
                <div className="p-2.5 bg-slate-50/15 space-y-2">

                    {/* Question Title & Description Area */}
                    <div className="space-y-1 relative">
                        <div className="flex items-center justify-between gap-3 relative">
                            {(label === 'Short Answer' ? particulars.enableTextStyle : writeMode) ? (
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    dangerouslySetInnerHTML={{ __html: element.text || '' }}
                                    onBlur={(e) => onUpdateText(e.target.innerHTML)}
                                    className="w-full font-bold text-slate-800 bg-transparent outline-none min-h-[32px] pr-12 placeholder:text-slate-400 rich-text-editor font-sans"
                                    placeholder="Type your Text here"
                                    style={{ fontSize: `${18 * (zoomScale / 100)}px` }}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={stripHtml(element.text || '')}
                                    onChange={(e) => onUpdateText(e.target.value)}
                                    placeholder="Type your Text here"
                                    className="w-full font-bold text-slate-800 bg-transparent outline-none pr-12 placeholder:text-slate-400 border-none font-sans"
                                    style={{ fontSize: `${18 * (zoomScale / 100)}px` }}
                                />
                            )}
                            <button
                                type="button"
                                onClick={handleMicClick}
                                className={`absolute right-1 top-0.5 p-1.5 rounded-full transition-all ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-700 hover:text-slate-900'
                                    }`}
                                title="Speech to Text"
                            >
                                <Mic size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="flex justify-end text-[9px] text-slate-400 font-extrabold tracking-wide -mt-1 select-none pr-1">
                            Title or Description bar
                        </div>
                        <hr className="border-t border-slate-150 mt-0.5 mb-1.5" />
                    </div>

                    {/* Rich text editor toolbar (Write mode / Enable Text Style) */}
                    {((label === 'Short Answer' && particulars.enableTextStyle) || (label !== 'Short Answer' && writeMode)) && (
                        label === 'Short Answer' ? (
                            <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-xl shadow-sm text-slate-550 select-none overflow-x-auto whitespace-nowrap scrollbar-none mb-2 text-xs w-full">
                                {/* Text Style Group */}
                                <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 font-bold" title="Bold"><Bold size={13} /></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 italic" title="Italic"><Italic size={13} /></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 underline" title="Underline"><Underline size={13} /></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('strikeThrough'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 line-through" title="Strikethrough"><Strikethrough size={13} /></button>
                                </div>

                                {/* Subscript / Superscript */}
                                <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('subscript'); }} className="px-1 py-0.5 hover:bg-slate-100 rounded text-slate-850 font-bold text-[10px]" title="Subscript">X<sub>1</sub></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('superscript'); }} className="px-1 py-0.5 hover:bg-slate-100 rounded text-slate-850 font-bold text-[10px]" title="Superscript">X<sup>1</sup></button>
                                </div>

                                {/* Link */}
                                <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('createLink', prompt('Link URL:')); }} className="p-1 hover:bg-slate-100 rounded text-slate-850" title="Hyperlink"><Link size={13} /></button>
                                </div>

                                {/* Zoom Group */}
                                <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                    <button type="button" onClick={handleZoomIn} className="p-1 hover:bg-slate-150 rounded" title="Zoom In"><ZoomIn size={13} /></button>
                                    <button type="button" onClick={handleZoomOut} className="p-1 hover:bg-slate-150 rounded" title="Zoom Out"><ZoomOut size={13} /></button>
                                </div>

                                {/* Unordered / Ordered Lists */}
                                <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850" title="Bulleted List"><List size={13} /></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertOrderedList'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850" title="Numbered List"><ListOrdered size={13} /></button>
                                </div>

                                {/* Alignment Dropdown */}
                                <div className="relative border-r border-slate-100 pr-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleMenu('align')}
                                        className={`p-1 hover:bg-slate-100 rounded flex items-center gap-0.5 text-slate-700 ${openMenu === 'align' ? 'bg-slate-100' : ''}`}
                                        title="Alignment"
                                    >
                                        <AlignLeft size={13} />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>
                                    {openMenu === 'align' && (
                                        <div className="absolute left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5 min-w-[130px]">
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyLeft'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-55 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignLeft size={12} /> Align Left</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyCenter'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-55 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignCenter size={12} /> Align Center</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyRight'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-55 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignRight size={12} /> Align Right</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyFull'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-55 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignJustify size={12} /> Align Justify</button>
                                        </div>
                                    )}
                                </div>

                                {/* Text Color */}
                                <div className="flex items-center gap-1.5 border-r border-slate-100 pr-1.5 ml-0.5 text-[9px] font-bold text-slate-500" title="Text Color">
                                    <span>A</span>
                                    <input
                                        type="color"
                                        onChange={(e) => handleFormat('foreColor', e.target.value)}
                                        className="w-4.5 h-4.5 p-0 border-0 cursor-pointer rounded bg-transparent shrink-0"
                                    />
                                </div>

                                {/* Background Color - PURPLE BUTTON BLOCK */}
                                <div className="flex items-center gap-1.5 border-r border-slate-100 pr-1.5" title="Background Color">
                                    <label className="cursor-pointer bg-[#800080] text-white px-2 py-1 rounded font-bold text-[10px] hover:bg-purple-800 transition-colors shadow-sm flex items-center gap-1">
                                        <span>Background Color</span>
                                        <input
                                            type="color"
                                            onChange={(e) => handleFormat('backColor', e.target.value)}
                                            className="w-0 h-0 p-0 border-0 opacity-0 absolute pointer-events-none"
                                        />
                                    </label>
                                </div>

                                {/* Special Notes placeholder */}
                                <button type="button" onClick={() => toast.success("Special Notes annotation added")} className="p-1 hover:bg-slate-100 rounded text-slate-850" title="Special Notes"><Sparkles size={13} /></button>

                                {/* Remove Formatting */}
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('removeFormat'); }} className="p-1 hover:bg-slate-100 rounded text-red-500 ml-auto" title="Clear Formatting"><X size={13} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-xl shadow-sm text-slate-550 select-none overflow-x-auto whitespace-nowrap scrollbar-none mb-2 text-xs w-full">
                                {/* Text Style Group */}
                                <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 font-bold" title="Bold"><Bold size={13} /></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 italic" title="Italic"><Italic size={13} /></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 underline" title="Underline"><Underline size={13} /></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('strikeThrough'); }} className="p-1 hover:bg-slate-100 rounded text-slate-850 line-through" title="Strikethrough"><Strikethrough size={13} /></button>
                                </div>

                                {/* Subscript / Superscript / Clear Group */}
                                <div className="flex items-center gap-0.5 border-r border-slate-100 pr-1">
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('subscript'); }} className="px-1 py-0.5 hover:bg-slate-100 rounded text-slate-850 font-bold text-[10px]" title="Subscript">X<sub>1</sub></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('superscript'); }} className="px-1 py-0.5 hover:bg-slate-100 rounded text-slate-850 font-bold text-[10px]" title="Superscript">X<sup>1</sup></button>
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('removeFormat'); }} className="p-1 hover:bg-slate-100 rounded text-red-500" title="Clear Formatting"><X size={13} /></button>
                                </div>

                                {/* Preset color pickers */}
                                <div className="flex items-center gap-2 border-r border-slate-100 pr-1.5 ml-0.5 text-[9px] font-bold text-slate-500">
                                    <div className="flex items-center gap-0.5" title="Text Color">
                                        <span>A</span>
                                        <input
                                            type="color"
                                            onChange={(e) => handleFormat('foreColor', e.target.value)}
                                            className="w-4.5 h-4.5 p-0 border-0 cursor-pointer rounded bg-transparent shrink-0"
                                        />
                                    </div>
                                    <div className="flex items-center gap-0.5" title="Highlight Color">
                                        <span>BG</span>
                                        <input
                                            type="color"
                                            onChange={(e) => handleFormat('backColor', e.target.value)}
                                            className="w-4.5 h-4.5 p-0 border-0 cursor-pointer rounded bg-transparent shrink-0"
                                            defaultValue="#fef08a"
                                        />
                                    </div>
                                </div>

                                {/* Alignment & Lists Dropdown */}
                                <div className="relative border-r border-slate-100 pr-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleMenu('align')}
                                        className={`p-1 hover:bg-slate-100 rounded flex items-center gap-0.5 text-slate-705 ${openMenu === 'align' ? 'bg-slate-100' : ''}`}
                                        title="Alignment & Lists"
                                    >
                                        <AlignLeft size={13} />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>
                                    {openMenu === 'align' && (
                                        <div className="absolute left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5 min-w-[130px]">
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyLeft'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><AlignLeft size={12} /> Align Left</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyCenter'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><AlignCenter size={12} /> Align Center</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyRight'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><AlignRight size={12} /> Align Right</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyFull'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><AlignJustify size={12} /> Align Justify</button>
                                            <hr className="border-slate-100 my-0.5" />
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><List size={12} /> Bulleted List</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertOrderedList'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><ListOrdered size={12} /> Numbered List</button>
                                        </div>
                                    )}
                                </div>

                                {/* Insert Dropdown */}
                                <div className="relative border-r border-slate-100 pr-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleMenu('insert')}
                                        className={`px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all ${openMenu === 'insert' ? 'bg-purple-100' : ''}`}
                                        title="Insert media, tables or formulas"
                                    >
                                        <span>Insert</span>
                                        <ChevronDown size={10} className="text-purple-400" />
                                    </button>
                                    {openMenu === 'insert' && (
                                        <div className="absolute left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5 min-w-[150px]">
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('createLink', prompt('Link URL:')); setOpenMenu(null); }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><Link size={12} /> Hyperlink</button>
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertImage', prompt('Enter Image URL:')); setOpenMenu(null); }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><ImageIcon size={12} /> Image URL</button>
                                            <button type="button" onMouseDown={(e) => {
                                                e.preventDefault();
                                                const audio = prompt('Enter Audio URL:');
                                                if (audio) handleFormat('insertHTML', `<audio controls src="${audio}"></audio>`);
                                                setOpenMenu(null);
                                            }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><Headphones size={12} /> Audio URL</button>
                                            <button type="button" onMouseDown={(e) => {
                                                e.preventDefault();
                                                const video = prompt('Enter Video URL:');
                                                if (video) handleFormat('insertHTML', `<video controls width="320" src="${video}"></video>`);
                                                setOpenMenu(null);
                                            }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><Video size={12} /> Video URL</button>
                                            <hr className="border-slate-100 my-0.5" />
                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertHTML', '😊'); setOpenMenu(null); }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><Smile size={12} /> Emoji 😊</button>
                                            <button type="button" onMouseDown={(e) => {
                                                e.preventDefault();
                                                const eq = prompt("Enter LaTeX/Math Formula:");
                                                if (eq) handleFormat('insertHTML', `<span class="italic font-serif bg-amber-50 px-1 border border-amber-200 rounded">${eq}</span>`);
                                                setOpenMenu(null);
                                            }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><Code size={12} /> Formula Editor</button>
                                            <button type="button" onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleFormat('insertHTML', `<table class="border border-slate-205 w-full text-xs text-left my-1"><tr class="bg-slate-50"><th class="p-1 border-b">H1</th><th class="p-1 border-b">H2</th></tr><tr><td class="p-1">C1</td><td class="p-1">C2</td></tr></table>`);
                                                setOpenMenu(null);
                                            }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><Table size={12} /> Table Insert</button>
                                            <button type="button" onMouseDown={(e) => {
                                                e.preventDefault();
                                                const code = prompt("Enter Code Block:");
                                                if (code) handleFormat('insertHTML', `<pre class="bg-slate-800 text-slate-100 p-2 rounded font-mono text-[10px] my-1">${code}</pre>`);
                                                setOpenMenu(null);
                                            }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-707"><Code size={12} /> Code Block</button>
                                        </div>
                                    )}
                                </div>

                                {/* Zoom level group */}
                                <div className="flex items-center gap-1.5 ml-auto text-slate-655">
                                    <button type="button" onClick={handleZoomOut} className="p-1 hover:bg-slate-150 rounded" title="Zoom Out"><ZoomOut size={13} /></button>
                                    <span className="text-[10px] font-extrabold w-8 text-center">{zoomScale}%</span>
                                    <button type="button" onClick={handleZoomIn} className="p-1 hover:bg-slate-150 rounded" title="Zoom In"><ZoomIn size={13} /></button>
                                </div>
                            </div>
                        )
                    )}

                    {/* Secondary Description */}
                    {element.showDescription && (
                        <div className="space-y-0.5 pb-0.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Question Description</label>
                            <input
                                type="text"
                                value={element.description || ''}
                                onChange={(e) => onUpdateField('description', e.target.value)}
                                placeholder="E.g., Answer in 100 words..."
                                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-purple-500 transition-all shadow-sm"
                            />
                        </div>
                    )}

                    {/* Attached media url preview if any */}
                    {element.mediaUrl && (
                        <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-500">
                            <span className="truncate max-w-[400px] font-mono">Media URL: {element.mediaUrl}</span>
                            <button
                                type="button"
                                onClick={() => onUpdateField('mediaUrl', '')}
                                className="text-red-500 hover:text-red-700 hover:underline font-bold"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    {/* Attached uploaded files indicator */}
                    {element.uploadedFiles && element.uploadedFiles.length > 0 && (
                        <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-2">
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Attachments ({element.uploadedFiles.length})</span>
                            <div className="flex flex-col gap-2">
                                {element.uploadedFiles.map((file, fIdx) => (
                                    <div key={fIdx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-150 text-xs font-semibold">
                                        <span className="text-slate-700">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateField('uploadedFiles', element.uploadedFiles.filter((_, i) => i !== fIdx))}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border-t border-slate-100">
                        {(() => {
                            const commonProps = {
                                element,
                                onUpdateField,
                                handleUpdateNestedField,
                                options,
                                onUpdateOptions,
                                handleUpdateOptionText,
                                handleToggleCorrect,
                                handleRemoveOption,
                                handleAddOption
                            };
                            switch (label) {
                                case 'Short Answer':
                                    return (
                                        <ShortAnswerBuilder
                                            {...commonProps}
                                            index={index}
                                            setLightboxImage={setLightboxImage}
                                            setLightboxScale={setLightboxScale}
                                        />
                                    );
                                case 'Paragraph Answer':
                                case 'Paragraph':
                                    return (
                                        <ParagraphBuilder
                                            {...commonProps}
                                            isExpanded={isExpanded}
                                            setIsExpanded={setIsExpanded}
                                        />
                                    );
                                case 'Multiple choices':
                                case 'Multiple Choice':
                                    return <MCQBuilder {...commonProps} />;
                                case 'Checkbox':
                                case 'Checkboxes':
                                    return <CheckboxesBuilder {...commonProps} />;
                                case 'Dropdown':
                                    return <DropdownBuilder {...commonProps} />;
                                case 'True/False':
                                    return <TrueFalseBuilder {...commonProps} />;
                                case 'Matching':
                                    return <MatchingBuilder {...commonProps} />;
                                case 'Fill in the Blanks':
                                    return <FillBlanksBuilder {...commonProps} />;
                                case 'Assignment':
                                    return <AssignmentBuilder {...commonProps} />;
                                case 'Activity':
                                    return <ActivityBuilder {...commonProps} />;
                                case 'Date & Time':
                                case 'Date/Time':
                                    return <DateTimeBuilder {...commonProps} />;
                                case 'Audio listening Displaying':
                                case 'Audio Listening':
                                    return <AudioListeningBuilder {...commonProps} />;
                                case 'Image Displaying':
                                case 'Image':
                                    return <ImageBuilder {...commonProps} />;
                                case 'File upload':
                                case 'File Upload':
                                    return <FileUploadBuilder {...commonProps} />;
                                case 'Rating':
                                    return <RatingBuilder {...commonProps} />;
                                case 'Webpage Displaying':
                                    return <WebpageBuilder {...commonProps} />;
                                case 'Embedded Video Displaying':
                                case 'YouTube':
                                    return <EmbeddedVideoBuilder {...commonProps} />;
                                case 'Embedded SM Content Displaying':
                                    return <EmbeddedSMBuilder {...commonProps} />;
                                case 'Multi file Displaying':
                                    return <MultiFileBuilder {...commonProps} />;
                                case 'Video Displaying':
                                case 'Video':
                                    return <VideoBuilder {...commonProps} />;
                                case 'PDF Displaying':
                                case 'PDF':
                                    return <PDFBuilder {...commonProps} />;
                                case 'Voice recording':
                                case 'Voice Rec':
                                    return <VoiceRecBuilder {...commonProps} />;
                                case 'Video recording':
                                case 'Video Rec':
                                    return <VideoRecBuilder {...commonProps} />;
                                case 'Web based Audio calling':
                                case 'Call Rec':
                                    return <CallRecBuilder {...commonProps} />;
                                case 'Screen recording':
                                case 'Screen Rec':
                                    return <ScreenRecBuilder {...commonProps} />;
                                case 'Screenshot taking':
                                case 'Screen Shot':
                                    return <ScreenShotBuilder {...commonProps} />;
                                case 'Text based AI agent':
                                case 'Text Chat AI':
                                    return <TextChatAIBuilder {...commonProps} />;
                                case 'Voice based AI Agent':
                                case 'Voice Chat AI':
                                    return <VoiceChatAIBuilder {...commonProps} />;
                                case 'Web based video calling':
                                    return <VideoCallBuilder {...commonProps} />;
                                default:
                                    return null;
                            }
                        })()}
                    </div>

                    {/* UNIFIED QUESTION FOOTER SECTIONS */}
                    <div className="border-t border-slate-100 mt-2 bg-white/40 -mx-2.5 -mb-2.5 p-2.5">
                        <div className="space-y-2">
                            {/* Collapsible header row — entire row is clickable */}
                            <button
                                type="button"
                                onClick={() => setIsFooterExpanded(!isFooterExpanded)}
                                title={isFooterExpanded ? "Collapse Footer" : "Expand Footer"}
                                className="flex items-center justify-between w-full px-1.5 py-0.5 text-slate-400 select-none hover:bg-slate-100/60 rounded-lg transition-all cursor-pointer group"
                            >
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">{label} Settings</span>
                                <span className="p-1 text-slate-400 group-hover:text-slate-600 transition-colors ml-auto flex items-center justify-center">
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isFooterExpanded ? 'rotate-180' : ''}`} />
                                </span>
                            </button>

                            {/* Smooth collapsible container */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFooterExpanded ? 'max-h-[2500px] opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full shadow-sm">
                                        {/* Toggles row */}
                                        <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-600 select-none">
                                            {/* Enable Text Style / Enable Response */}
                                            <div className="flex items-center gap-2 select-none">
                                                <span>Enable Text Style</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={label === 'Short Answer' ? !!particulars.enableTextStyle : writeMode}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            if (label === 'Short Answer') {
                                                                handleUpdateNestedField('particulars', 'enableTextStyle', checked);
                                                            } else {
                                                                onUpdateField('writeMode', checked);
                                                            }
                                                            if (!checked) {
                                                                onUpdateText(stripHtml(element.text || ''));
                                                            }
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650"></div>
                                                </label>
                                            </div>

                                        </div>

                                        {/* Action Buttons row */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {/* Addons Button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveFooterTab(activeFooterTab === 'assistive' ? null : 'assistive');
                                                    if (onAddonClick) onAddonClick();
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const addonData = e.dataTransfer.getData('addonType');
                                                    if (addonData) {
                                                        const addon = JSON.parse(addonData);
                                                        const currentAddons = element.addons || [];
                                                        if (currentAddons.includes(addon.label)) {
                                                            toast.error(`${addon.label} is already added!`);
                                                        } else if (currentAddons.length >= 5) {
                                                            toast.error("Maximum of 5 addons allowed!");
                                                        } else {
                                                            onUpdateField('addons', [...currentAddons, addon.label]);
                                                            setActiveFooterTab('assistive');
                                                            toast.success(`${addon.label} added to Addons Container!`);
                                                        }
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1.5 ${activeFooterTab === 'assistive'
                                                    ? 'bg-[#5A5CD6] text-white border-[#5A5CD6] shadow-sm'
                                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 shadow-sm'
                                                    }`}
                                            >
                                                <Feather size={12} />
                                                <span>Addons</span>
                                            </button>

                                            {/* Controls Button */}
                                            <button
                                                type="button"
                                                onClick={() => setActiveFooterTab(activeFooterTab === 'moreSettings' ? null : 'moreSettings')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1.5 ${activeFooterTab === 'moreSettings'
                                                    ? 'bg-[#5A5CD6] text-white border-[#5A5CD6] shadow-sm'
                                                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 shadow-sm'
                                                    }`}
                                            >
                                                <Settings size={12} />
                                                <span>Controls</span>
                                            </button>

                                            {/* Video Settings (only for Video Rec) */}
                                            {label === 'Video Rec' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveFooterTab(activeFooterTab === 'videoSettings' ? null : 'videoSettings')}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1.5 ${activeFooterTab === 'videoSettings'
                                                        ? 'bg-[#5A5CD6] text-white border-[#5A5CD6] shadow-sm'
                                                        : 'bg-violet-50 text-violet-750 hover:bg-violet-100 border border-violet-200 shadow-sm'
                                                        }`}
                                                >
                                                    <Video size={12} />
                                                    <span>Video Settings</span>
                                                </button>
                                            )}


                                            {/* Small style drawer icon (Tt) */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onUpdateField('showDescription', !element.showDescription);
                                                }}
                                                className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all ${element.showDescription
                                                    ? 'bg-slate-200 border-slate-300 text-slate-800'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55'
                                                    }`}
                                                title="Toggle Description Inputs"
                                            >
                                                <span className="font-semibold text-[11px] leading-none">Tt</span>
                                            </button>

                                            {/* Copy icon */}
                                            <button
                                                type="button"
                                                onClick={onDuplicate}
                                                className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 transition-all w-7 h-7 flex items-center justify-center"
                                                title="Duplicate question"
                                            >
                                                <Copy size={12} />
                                            </button>

                                            {/* Delete icon */}
                                            <button
                                                type="button"
                                                onClick={onDelete}
                                                className="p-1.5 rounded-lg border bg-white border-slate-200 text-red-500 hover:bg-red-50 transition-all w-7 h-7 flex items-center justify-center"
                                                title="Delete question"
                                            >
                                                <Trash2 size={12} />
                                            </button>

                                            {/* Advance Settings button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDraftParticulars(element.particulars || {});
                                                    setShowAdvanceSettingsModal(true);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1.5 bg-amber-50 text-amber-850 hover:bg-amber-100 border border-amber-200 shadow-sm`}
                                            >
                                                <Cog size={12} />
                                                <span>Advance</span>
                                            </button>

                                            {/* Logical Settings button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDraftLogicalSettings(element.logicalSettings || {});
                                                    setShowLogicalSettingsModal(true);
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm"
                                            >
                                                <GitBranch size={12} />
                                                <span>Logical</span>
                                            </button>

                                            {/* Validation Settings button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDraftValidationSettings(element.validationSettings || {});
                                                    setShowValidationSettingsModal(true);
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm"
                                            >
                                                <AlertCircle size={12} />
                                                <span>Validation</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Active Drawer Render inside the collapsible footer */}
                                    {activeFooterTab && (
                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-[12px] animate-fade-in text-xs mt-1.5">
                                            {(() => {
                                                const commonProps = {
                                                    element,
                                                    index,
                                                    onUpdateField,
                                                    handleUpdateNestedField,
                                                    setActiveFooterTab,
                                                    onApplyMoreSettingToAll
                                                };
                                                switch (activeFooterTab) {
                                                    case 'videoSettings':
                                                        return label === 'Video Rec' ? (
                                                            <VideoSettingsDrawer
                                                                {...commonProps}
                                                            />
                                                        ) : null;
                                                    case 'assistive':
                                                        return (
                                                            <AssistiveDrawer
                                                                {...commonProps}
                                                                onApplyAddonToAll={onApplyAddonToAll}
                                                                onRemoveAddon={onRemoveAddon}
                                                            />
                                                        );
                                                    case 'moreSettings':
                                                        return (
                                                            <ControlsDrawer
                                                                {...commonProps}
                                                            />
                                                        );
                                                    case 'particulars':
                                                        return (
                                                            <ParticularsDrawer
                                                                {...commonProps}
                                                            />
                                                        );
                                                    case 'logic':
                                                        return (
                                                            <LogicDrawer
                                                                {...commonProps}
                                                            />
                                                        );
                                                    case 'textLogic':
                                                        return (
                                                            <TextLogicDrawer
                                                                {...commonProps}
                                                                onUpdateText={onUpdateText}
                                                            />
                                                        );
                                                    case 'validation':
                                                        return (
                                                            <ValidationDrawer
                                                                {...commonProps}
                                                            />
                                                        );
                                                    case 'scoring':
                                                        return (
                                                            <ScoringDrawer
                                                                {...commonProps}
                                                            />
                                                        );
                                                    case 'advanced':
                                                        return (
                                                            <AdvancedDrawer
                                                                {...commonProps}
                                                            />
                                                        );
                                                    default:
                                                        return null;
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Short Answer Modal Overlays */}
            <AdvanceSettingsModal
                isOpen={showAdvanceSettingsModal}
                onClose={() => setShowAdvanceSettingsModal(false)}
                draftParticulars={draftParticulars}
                setDraftParticulars={setDraftParticulars}
                onSave={(updated) => onUpdateField('particulars', updated)}
            />

            <LogicalSettingsModal
                isOpen={showLogicalSettingsModal}
                onClose={() => setShowLogicalSettingsModal(false)}
                draftLogicalSettings={draftLogicalSettings}
                setDraftLogicalSettings={setDraftLogicalSettings}
                onSave={(updated) => onUpdateField('logicalSettings', updated)}
            />

            <ValidationSettingsModal
                isOpen={showValidationSettingsModal}
                onClose={() => setShowValidationSettingsModal(false)}
                draftValidationSettings={draftValidationSettings}
                setDraftValidationSettings={setDraftValidationSettings}
                onSave={(updated) => onUpdateField('validationSettings', updated)}
            />

            <ImageInsertModal
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
                index={index}
                imageSearchQuery={imageSearchQuery}
                setImageSearchQuery={setImageSearchQuery}
                imageByUrl={imageByUrl}
                setImageByUrl={setImageByUrl}
                activeImageTab={activeImageTab}
                setActiveImageTab={setActiveImageTab}
                onAddImage={handleAddInsertedImage}
            />

            <FilePreviewModal
                isOpen={showFilePreviewModal}
                onClose={() => setShowFilePreviewModal(false)}
                uploadedResource={element.uploadedResource}
            />

            {lightboxImage && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 border border-white/20 animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <img src={lightboxImage} alt="Enlarged view" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                        <button
                            type="button"
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-950/80 text-white p-2 rounded-full transition-all shadow-md z-[110]"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {showNoteModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-5 border border-slate-100 flex flex-col gap-3">
                        {/* The Toolbar (containing formatting + actions) */}
                        <div className="flex items-center justify-between bg-slate-50 p-2 border border-slate-200 rounded-xl text-slate-550 select-none text-xs w-full">
                            {/* Formatting tools */}
                            <div className="flex items-center gap-1 flex-wrap">
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('bold');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.bold ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Bold"
                                >
                                    <Bold size={14} />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('italic');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.italic ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Italic"
                                >
                                    <Italic size={14} />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('underline');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.underline ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Underline"
                                >
                                    <Underline size={14} />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('strikeThrough');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.strikeThrough ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Strikethrough"
                                >
                                    <Strikethrough size={14} />
                                </button>

                                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                                {/* Subscript / Superscript */}
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('subscript');
                                    }}
                                    className={`px-1 py-0.5 rounded transition-all text-[10px] font-bold ${noteActiveFormat.subscript ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Subscript"
                                >
                                    X<sub>1</sub>
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('superscript');
                                    }}
                                    className={`px-1 py-0.5 rounded transition-all text-[10px] font-bold ${noteActiveFormat.superscript ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Superscript"
                                >
                                    X<sup>1</sup>
                                </button>

                                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                                {/* Link */}
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        const url = prompt('Link URL:');
                                        if (url) handleNoteFormat('createLink', url);
                                    }}
                                    className="p-1.5 hover:bg-slate-200 rounded text-slate-700"
                                    title="Hyperlink"
                                >
                                    <Link size={14} />
                                </button>

                                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                                {/* Alignments */}
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('justifyLeft');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.justifyLeft ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Align Left"
                                >
                                    <AlignLeft size={14} />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('justifyCenter');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.justifyCenter ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Align Center"
                                >
                                    <AlignCenter size={14} />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('justifyRight');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.justifyRight ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Align Right"
                                >
                                    <AlignRight size={14} />
                                </button>

                                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('insertUnorderedList');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.insertUnorderedList ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Bulleted List"
                                >
                                    <List size={14} />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('insertOrderedList');
                                    }}
                                    className={`p-1.5 rounded transition-all ${noteActiveFormat.insertOrderedList ? 'bg-slate-300 text-slate-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                                    title="Numbered List"
                                >
                                    <ListOrdered size={14} />
                                </button>

                                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 font-sans" title="Text Color">
                                    <span className="text-xs font-semibold">A</span>
                                    <input
                                        type="color"
                                        onChange={(e) => handleNoteFormat('foreColor', e.target.value)}
                                        className="w-4 h-4 rounded cursor-pointer border border-slate-300 p-0 bg-transparent"
                                    />
                                </div>

                                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleNoteFormat('removeFormat');
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"
                                    title="Clear Formatting"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Action buttons (integrated inside the toolbar) */}
                            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNoteModal(false);
                                        setNoteContentInput('');
                                    }}
                                    className="px-2.5 py-1 text-slate-500 hover:text-slate-850 hover:bg-slate-200 rounded-lg transition-colors font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const finalHtml = noteEditorRef.current ? noteEditorRef.current.innerHTML : noteContentInput;
                                        onUpdateField('noteContent', finalHtml);
                                        setShowNoteModal(false);
                                        setNoteContentInput('');
                                        toast.success("Note saved successfully!");
                                    }}
                                    className="px-2.5 py-1 text-slate-500 hover:text-slate-850 hover:bg-slate-200 rounded-lg transition-colors font-bold text-xs"
                                >
                                    Save Note
                                </button>
                            </div>
                        </div>

                        {/* Note input field (contentEditable) */}
                        <div
                            ref={noteEditorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setNoteContentInput(e.target.innerHTML)}
                            onKeyUp={updateNoteActiveFormat}
                            onMouseUp={updateNoteActiveFormat}
                            onInput={(e) => {
                                setNoteContentInput(e.target.innerHTML);
                                updateNoteActiveFormat();
                            }}
                            onFocus={updateNoteActiveFormat}
                            className="w-full text-xs font-medium bg-slate-55 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none min-h-[180px] focus:bg-white focus:border-purple-500 transition-all shadow-sm rich-text-editor font-sans"
                            placeholder="Write a note..."
                            style={{ outline: 'none' }}
                        />
                    </div>
                </div>

            )}
        </div>
    );
};

const TestBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Edit');
    const [sidebarTab, setSidebarTab] = useState('Elements & Addons');
    const [searchQuery, setSearchQuery] = useState('');
    const [formElements, setFormElements] = useState([]);
    const [isInputExpanded, setIsInputExpanded] = useState(true);
    const [isDisplayExpanded, setIsDisplayExpanded] = useState(true);
    const [isRecordingExpanded, setIsRecordingExpanded] = useState(true);
    const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
    const [isAnalyticalWidgetsExpanded, setIsAnalyticalWidgetsExpanded] = useState(true);
    const [draggedQuestionIndex, setDraggedQuestionIndex] = useState(null);
    const [placeholderIndex, setPlaceholderIndex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const dragPositionsRef = useRef([]);
    const draggedIndexRef = useRef(null);
    const placeholderIndexRef = useRef(null);
    const formElementsRef = useRef([]);

    useEffect(() => {
        formElementsRef.current = formElements;
    }, [formElements]);

    // Connect Metadata
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isDiscussionModalOpen, setIsDiscussionModalOpen] = useState(false);
    const [discussionActivity, setDiscussionActivity] = useState({ activityName: '', activityLink: '' });
    const [connectData, setConnectData] = useState({
        name: 'Untitled Form',
        institute: '',
        course: '',
        subject: '',
        date: new Date().toISOString().split('T')[0],
        index: 'Index 1',
        activity: 'Quiz'
    });

    const [publishing, setPublishing] = useState(false);
    const [loading, setLoading] = useState(!!id);

    // Publish Options Modal States
    const [isPublishOptionsModalOpen, setIsPublishOptionsModalOpen] = useState(false);
    const [publishSuccessInfo, setPublishSuccessInfo] = useState(null);
    const [publishModeSelected, setPublishModeSelected] = useState('connected');
    const [publicSettings, setPublicSettings] = useState({
        selectedFolder: null,
        allowMultiple: false,
        startDate: '',
        endDate: '',
        expiryDate: '',
        maxResponses: '',
        timeLimit: 60,
        randomizeQuestions: false,
        showScoreAfterSubmission: true,
        showCorrectAnswers: false,
        allowRetake: false,
        password: '',
        antiSpam: false,
        emailNotification: {
            sendSubmissionNotification: true,
            sendScoreEmail: true,
            sendConfirmationEmail: true
        }
    });

    // Sidebar Elements Configuration
    const sidebarElements = [
        // 1-8: Input Elements
        { icon: Type, label: 'Short Answer', category: 'Input Elements' },
        { icon: AlignLeft, label: 'Paragraph Answer', category: 'Input Elements' },
        { icon: CircleDot, label: 'Multiple choices', category: 'Input Elements' },
        { icon: CheckSquare, label: 'Checkbox', category: 'Input Elements' },
        { icon: List, label: 'Dropdown', category: 'Input Elements' },
        { icon: Calendar, label: 'Date & Time', category: 'Input Elements' },
        { icon: Star, label: 'Rating', category: 'Input Elements' },
        { icon: Upload, label: 'File upload', category: 'Input Elements' },

        // 9-16: Displaying Elements
        { icon: ImageIcon, label: 'Image Displaying', category: 'Displaying Elements' },
        { icon: Film, label: 'Video Displaying', category: 'Displaying Elements' },
        { icon: FileText, label: 'PDF Displaying', category: 'Displaying Elements' },
        { icon: Globe, label: 'Webpage Displaying', category: 'Displaying Elements' },
        { icon: Play, label: 'Embedded Video Displaying', category: 'Displaying Elements' },
        { icon: Share2, label: 'Embedded SM Content Displaying', category: 'Displaying Elements' },
        { icon: Headphones, label: 'Audio listening Displaying', category: 'Displaying Elements' },
        { icon: Files, label: 'Multi file Displaying', category: 'Displaying Elements' },

        // 17-24: Recording & AI Agents
        { icon: Camera, label: 'Screenshot taking', category: 'Recording & AI Agents' },
        { icon: Monitor, label: 'Screen recording', category: 'Recording & AI Agents' },
        { icon: Mic, label: 'Voice recording', category: 'Recording & AI Agents' },
        { icon: Video, label: 'Video recording', category: 'Recording & AI Agents' },
        { icon: PhoneCall, label: 'Web based Audio calling', category: 'Recording & AI Agents' },
        { icon: Video, label: 'Web based video calling', category: 'Recording & AI Agents' },
        { icon: MessageSquare, label: 'Text based AI agent', category: 'Recording & AI Agents' },
        { icon: Bot, label: 'Voice based AI Agent', category: 'Recording & AI Agents' },

        // Advanced/Extra Fields
        { icon: CheckCircle2, label: 'True/False', category: 'Advanced Fields' },
        { icon: Sliders, label: 'Matching', category: 'Advanced Fields' },
        { icon: Type, label: 'Fill in the Blanks', category: 'Advanced Fields' },
        { icon: FileText, label: 'Assignment', category: 'Advanced Fields' },
        { icon: Activity, label: 'Activity', category: 'Advanced Fields' }
    ];

    // Fetch existing test details if editing
    useEffect(() => {
        if (id) {
            const fetchTest = async () => {
                try {
                    const res = await axios.get(`/api/tests/${id}`);
                    const test = res.data;

                    setConnectData({
                        name: test.title || 'Untitled Form',
                        institute: test.institute || '',
                        course: test.course || '',
                        subject: test.subject || '',
                        date: test.date || new Date().toISOString().split('T')[0],
                        index: test.index || 'Index 1',
                        activity: test.activity || 'Quiz'
                    });
                    setIsConnected(true);
                    if (test.discussionActivity) {
                        setDiscussionActivity({
                            activityName: test.discussionActivity.activityName || '',
                            activityLink: test.discussionActivity.activityLink || ''
                        });
                    }

                    if (test.publishMode) {
                        setPublishModeSelected(test.publishMode);
                        if (test.publicSettings) {
                            setPublicSettings(prev => ({
                                ...prev,
                                ...test.publicSettings,
                                selectedFolder: test.publishMode === 'public' ? {
                                    institute: test.institute || 'Public Web',
                                    course: test.course || 'Public Access',
                                    subject: test.subject || 'General'
                                } : null,
                                startDate: test.publicSettings.startDate ? new Date(test.publicSettings.startDate).toISOString().split('T')[0] : '',
                                endDate: test.publicSettings.endDate ? new Date(test.publicSettings.endDate).toISOString().split('T')[0] : '',
                                expiryDate: test.publicSettings.expiryDate ? new Date(test.publicSettings.expiryDate).toISOString().split('T')[0] : '',
                                emailNotification: {
                                    ...prev.emailNotification,
                                    ...(test.publicSettings.emailNotification || {})
                                }
                            }));
                        }
                    }

                    // Map backend questions to front-end form elements
                    const loadedElements = (test.questions || []).map(q => {
                        const matched = sidebarElements.find(el => el.label === q.type) || { icon: FileText };
                        return {
                            id: q._id || q.id || Math.random().toString(36).substring(2, 9),
                            label: q.type || 'Short Answer',
                            icon: matched.icon || FileText,
                            text: q.text || '',
                            options: q.options || [],
                            description: q.description || '',
                            helperText: q.helperText || '',
                            noteContent: q.helperText || '',
                            uploadedResource: q.uploadedResource || null,
                            instructions: q.instructions || '',
                            required: !!q.required,
                            enabled: q.enabled !== false,
                            marks: q.marks !== undefined ? q.marks : 1,
                            negativeMarks: q.negativeMarks || 0,
                            partialMarks: !!q.partialMarks,
                            evaluationMode: q.evaluationMode || 'auto',
                            validation: q.validation || {
                                minLength: '',
                                maxLength: '',
                                regex: '',
                                numericOnly: false,
                                emailOnly: false,
                                urlOnly: false
                            },
                            assistive: q.assistive || {
                                aiReader: false,
                                textToSpeech: false,
                                speechToText: false,
                                translation: false,
                                dyslexiaMode: false,
                                accessibility: false
                            },
                            particulars: q.particulars || {
                                shuffleOptions: false,
                                multipleAttempts: false,
                                charLimit: '',
                                wordLimit: '',
                                fileSizeLimit: 10,
                                fileTypes: 'All'
                            },
                            logicalSettings: q.logicalSettings || {},
                            validationSettings: q.validationSettings || {},
                            insertedImages: q.insertedImages || [],
                            logic: q.logic || {
                                dependsOnQuestion: '',
                                dependsOnAnswer: '',
                                scoreTrigger: ''
                            },
                            textLogic: q.textLogic || {
                                studentNamePlaceholder: '{Student Name}',
                                instituteNamePlaceholder: '{Institute Name}'
                            },
                            advanced: q.advanced || {
                                tags: '',
                                difficulty: 'Medium',
                                bloomTaxonomy: 'Understanding',
                                learningOutcome: '',
                                subjectMapping: '',
                                topicMapping: ''
                            },
                            matchingPairs: q.matchingPairs || [],
                            blankAnswers: q.blankAnswers || [],
                            uploadedFiles: q.uploadedFiles || [],
                            addons: q.addons || [],
                            appliedToAllAddons: q.appliedToAllAddons || [],
                            appliedToAllMoreSettings: q.appliedToAllMoreSettings || [],
                            moreSettings: q.moreSettings || { allowUpload: false, allowChat: false, allowSubmitFinish: false },
                            mediaUrl: q.mediaUrl || '',
                            writeMode: !!q.writeMode,
                            audioUrl: q.audioUrl || '',
                            imageUrl: q.imageUrl || '',
                            altText: q.altText || '',
                            align: q.align || 'center',
                            pdfUrl: q.pdfUrl || '',
                            youtubeUrl: q.youtubeUrl || '',
                            embeddedVideoUrl: q.embeddedVideoUrl || '',
                            webpageUrl: q.webpageUrl || '',
                            webpageHeight: q.webpageHeight || 400,
                            webpageScroll: q.webpageScroll || 'yes',
                            smPlatform: q.smPlatform || '',
                            smPostUrl: q.smPostUrl || '',
                            multiMaxFiles: q.multiMaxFiles || 5,
                            multiMaxSizeMB: q.multiMaxSizeMB || 10,
                            multiFileType: q.multiFileType || 'all',
                            videoCallDuration: q.videoCallDuration || 5,
                            videoCallRole: q.videoCallRole || 'interviewer',
                            videoCallScenario: q.videoCallScenario || '',
                            videoUrl: q.videoUrl || '',
                            autoplay: !!q.autoplay,
                            loop: !!q.loop,
                            quality: q.quality || '1080p',
                            includeMic: !!q.includeMic,
                            screenshotScope: q.screenshotScope || 'Entire Screen',
                            agentName: q.agentName || '',
                            greetingMessage: q.greetingMessage || '',
                            systemPersona: q.systemPersona || '',
                            voicePersona: q.voicePersona || 'alloy',
                            scriptScenario: q.scriptScenario || '',
                            activityType: q.activityType || 'AI Lab',
                            activityRules: q.activityRules || ''
                        };
                    });
                    setFormElements(loadedElements);
                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching test for edit:", error);
                    toast.error("Error loading test data");
                    navigate('/admin/tools');
                }
            };
            fetchTest();
        }
    }, [id, navigate]);

    // Drag-and-Drop and addition logic
    const handleDragStart = (e, element) => {
        e.dataTransfer.setData('elementType', JSON.stringify(element));
    };

    const handleAddonDragStart = (e, addon) => {
        e.dataTransfer.setData('addonType', JSON.stringify(addon));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const addonData = e.dataTransfer.getData('addonType');
        if (addonData) {
            toast.error("Acceptable only on Addons Container button or window");
            return;
        }
        const elementData = e.dataTransfer.getData('elementType');
        if (elementData) {
            const element = JSON.parse(elementData);
            handleAddElement(element);
        }
        setDraggedQuestionIndex(null);
    };

    const handleCustomDragStart = (e, index) => {
        const isTouch = e.type.startsWith('touch');
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const scrollContainer = document.getElementById('edit-canvas-container');
        if (!scrollContainer) return;

        draggedIndexRef.current = index;
        placeholderIndexRef.current = index;
        setDraggedQuestionIndex(index);
        setPlaceholderIndex(index);
        setIsDragging(true);

        const cards = document.querySelectorAll('.question-card');
        const containerRect = scrollContainer.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;

        const positions = Array.from(cards).map((card, i) => {
            const cardRect = card.getBoundingClientRect();
            const top = cardRect.top - containerRect.top + scrollTop;
            return {
                index: i,
                top: top,
                bottom: top + cardRect.height,
                height: cardRect.height,
                midpoint: top + cardRect.height / 2
            };
        });
        dragPositionsRef.current = positions;

        if (isTouch) {
            window.addEventListener('touchmove', handleCustomTouchMove, { passive: false });
            window.addEventListener('touchend', handleCustomDragEnd);
        } else {
            window.addEventListener('mousemove', handleCustomMouseMove);
            window.addEventListener('mouseup', handleCustomDragEnd);
        }
    };

    const handleCustomMove = (clientY) => {
        if (draggedIndexRef.current === null) return;

        const scrollContainer = document.getElementById('edit-canvas-container');
        if (!scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const threshold = 100;
        if (clientY < containerRect.top + threshold) {
            scrollContainer.scrollTop -= 12;
        } else if (clientY > containerRect.bottom - threshold) {
            scrollContainer.scrollTop += 12;
        }

        const scrollTop = scrollContainer.scrollTop;
        const y = clientY - containerRect.top + scrollTop;

        let targetIndex = 0;
        const positions = dragPositionsRef.current || [];
        if (positions.length > 0) {
            let found = false;
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                if (y < pos.midpoint) {
                    targetIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                targetIndex = positions.length;
            }
        }

        placeholderIndexRef.current = targetIndex;
        setPlaceholderIndex(targetIndex);
    };

    const handleCustomMouseMove = (e) => {
        handleCustomMove(e.clientY);
    };

    const handleCustomTouchMove = (e) => {
        if (e.cancelable) e.preventDefault();
        handleCustomMove(e.touches[0].clientY);
    };

    const handleCustomDragEnd = () => {
        const dIdx = draggedIndexRef.current;
        const pIdx = placeholderIndexRef.current;

        if (dIdx !== null && pIdx !== null && dIdx !== pIdx) {
            const list = [...formElementsRef.current];
            const draggedItem = list[dIdx];
            list.splice(dIdx, 1);

            let insertIndex = pIdx;
            if (pIdx > dIdx) {
                insertIndex = pIdx - 1;
            }
            list.splice(insertIndex, 0, draggedItem);
            setFormElements(list);
        }

        draggedIndexRef.current = null;
        placeholderIndexRef.current = null;
        setDraggedQuestionIndex(null);
        setPlaceholderIndex(null);
        setIsDragging(false);

        window.removeEventListener('mousemove', handleCustomMouseMove);
        window.removeEventListener('mouseup', handleCustomDragEnd);
        window.removeEventListener('touchmove', handleCustomTouchMove);
        window.removeEventListener('touchend', handleCustomDragEnd);
    };

    const handleAddElement = (element) => {
        let defaultOptions = [];
        if (['Multiple Choice', 'Multiple choices', 'Checkboxes', 'Checkbox', 'Dropdown'].includes(element.label)) {
            defaultOptions = [{ text: 'Option 1', isCorrect: false }, { text: 'Option 2', isCorrect: false }];
        } else if (element.label === 'True/False') {
            defaultOptions = [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: false }];
        }

        const defaultMatchingPairs = element.label === 'Matching'
            ? [{ key: 'React', value: 'Frontend Library' }, { key: 'NodeJS', value: 'Backend Runtime' }]
            : [];

        const defaultBlankAnswers = element.label === 'Fill in the Blanks'
            ? ['frontend']
            : [];

        setFormElements(prev => [...prev, {
            id: Math.random().toString(36).substring(2, 9),
            label: element.label,
            text: '',
            options: defaultOptions,
            matchingPairs: defaultMatchingPairs,
            blankAnswers: defaultBlankAnswers,
            icon: sidebarElements.find(s => s.label === element.label)?.icon || FileText,
            description: '',
            helperText: '',
            instructions: '',
            required: false,
            enabled: true,
            marks: 1,
            negativeMarks: 0,
            partialMarks: false,
            evaluationMode: 'auto',
            validation: {
                minLength: '',
                maxLength: '',
                regex: '',
                numericOnly: false,
                emailOnly: false,
                urlOnly: false
            },
            assistive: {
                aiReader: false,
                textToSpeech: false,
                speechToText: false,
                translation: false,
                dyslexiaMode: false,
                accessibility: false
            },
            particulars: {
                shuffleOptions: false,
                multipleAttempts: false,
                charLimit: '',
                wordLimit: '',
                fileSizeLimit: 10,
                fileTypes: 'All'
            },
            logicalSettings: {},
            validationSettings: {},
            insertedImages: [],
            videoSettings: {
                allowWebcam: true,
                allowScreen: true,
                allowScreenWebcam: true,
                allowUpload: true,
                minDuration: 30,
                maxDuration: 600,
                maxFileSize: 100,
                allowedFileTypes: 'mp4,webm,mov',
                recordingAttemptsLimit: 3,
                webcamRequired: false,
                microphoneRequired: false,
                fullScreenRequired: false,
                tabSwitchingDetection: false,
                multipleFaceDetection: false,
                faceMissingDetection: false,
                backgroundNoiseDetection: false,
                aiTranscriptEnabled: false,
                timestampFeedbackEnabled: false
            },
            logic: {
                dependsOnQuestion: '',
                dependsOnAnswer: '',
                scoreTrigger: ''
            },
            textLogic: {
                studentNamePlaceholder: '{Student Name}',
                instituteNamePlaceholder: '{Institute Name}'
            },
            advanced: {
                tags: '',
                difficulty: 'Medium',
                bloomTaxonomy: 'Understanding',
                learningOutcome: '',
                subjectMapping: '',
                topicMapping: ''
            },
            uploadedFiles: [],
            uploadedResource: null,
            addons: [],
            appliedToAllAddons: [],
            appliedToAllMoreSettings: [],
            moreSettings: { allowUpload: false, allowChat: false, allowSubmitFinish: false },
            mediaUrl: '',
            writeMode: false,
            audioUrl: '',
            imageUrl: '',
            altText: '',
            align: 'center',
            pdfUrl: '',
            youtubeUrl: '',
            videoUrl: '',
            autoplay: false,
            loop: false,
            quality: '1080p',
            includeMic: false,
            screenshotScope: 'Entire Screen',
            agentName: (element.label === 'Text Chat AI' || element.label === 'Text based AI agent') ? 'AI Assistant' : (element.label === 'Voice Chat AI' || element.label === 'Voice based AI Agent') ? 'AI Voice Assistant' : '',
            greetingMessage: (element.label === 'Text Chat AI' || element.label === 'Text based AI agent') ? 'Hello! How can I help you today?' : '',
            systemPersona: '',
            voicePersona: 'alloy',
            scriptScenario: '',
            activityType: 'AI Lab',
            activityRules: ''
        }]);
    };

    const updateElementText = (index, text) => {
        setFormElements(prev => prev.map((el, i) => i === index ? { ...el, text } : el));
    };

    const updateElementOptions = (index, options) => {
        setFormElements(prev => prev.map((el, i) => i === index ? { ...el, options } : el));
    };

    const updateElementField = (index, field, value) => {
        setFormElements(prev => {
            if (field === 'moreSettings') {
                const prevSettings = prev[index]?.moreSettings || {};
                const nextSettings = value || {};
                const keys = ['allowUpload', 'allowChat', 'allowSubmitFinish'];
                let changedKey = null;
                for (const key of keys) {
                    if (prevSettings[key] !== nextSettings[key]) {
                        changedKey = key;
                        break;
                    }
                }
                if (changedKey) {
                    const isSynced = (prev[index]?.appliedToAllMoreSettings || []).includes(changedKey);
                    if (isSynced) {
                        const newValue = nextSettings[changedKey];
                        return prev.map((el) => {
                            const ms = el.moreSettings || {};
                            return {
                                ...el,
                                moreSettings: {
                                    ...ms,
                                    [changedKey]: newValue
                                }
                            };
                        });
                    }
                }
            }
            return prev.map((el, i) => i === index ? { ...el, [field]: value } : el);
        });
    };

    const handleApplyAddonToAll = (sourceIndex, addonLabel, isApplied) => {
        setFormElements(prev => {
            return prev.map((el) => {
                const currentAddons = el.addons || [];
                const currentApplied = el.appliedToAllAddons || [];

                let nextAddons = [...currentAddons];
                let nextApplied = [...currentApplied];

                if (isApplied) {
                    if (!nextAddons.includes(addonLabel)) {
                        nextAddons.push(addonLabel);
                    }
                    if (!nextApplied.includes(addonLabel)) {
                        nextApplied.push(addonLabel);
                    }
                } else {
                    nextApplied = nextApplied.filter(a => a !== addonLabel);
                }

                return {
                    ...el,
                    addons: nextAddons,
                    appliedToAllAddons: nextApplied
                };
            });
        });
        if (isApplied) {
            toast.success(`Applied ${addonLabel} to all questions!`);
        } else {
            toast.info(`Disabled Apply to all for ${addonLabel}`);
        }
    };

    const handleApplyMoreSettingToAll = (sourceIndex, settingKey, isApplied) => {
        setFormElements(prev => {
            const currentValue = prev[sourceIndex]?.moreSettings?.[settingKey] || false;
            return prev.map((el) => {
                const currentSettings = el.moreSettings || {};
                const currentApplied = el.appliedToAllMoreSettings || [];

                let nextApplied = [...currentApplied];
                if (isApplied) {
                    if (!nextApplied.includes(settingKey)) {
                        nextApplied.push(settingKey);
                    }
                } else {
                    nextApplied = nextApplied.filter(a => a !== settingKey);
                }

                const nextSettings = {
                    ...currentSettings,
                    [settingKey]: isApplied ? currentValue : (currentSettings[settingKey] || false)
                };

                return {
                    ...el,
                    moreSettings: nextSettings,
                    appliedToAllMoreSettings: nextApplied
                };
            });
        });
        if (isApplied) {
            toast.success(`Applied setting to all questions!`);
        } else {
            toast.info(`Disabled Apply to all for this setting`);
        }
    };

    const handleRemoveAddon = (sourceIndex, addonLabel) => {
        setFormElements(prev => {
            const isAppliedToAll = prev[sourceIndex].appliedToAllAddons?.includes(addonLabel);
            return prev.map((el, idx) => {
                let nextAddons = el.addons || [];
                let nextApplied = el.appliedToAllAddons || [];

                if (isAppliedToAll) {
                    nextAddons = nextAddons.filter(a => a !== addonLabel);
                    nextApplied = nextApplied.filter(a => a !== addonLabel);
                } else if (idx === sourceIndex) {
                    nextAddons = nextAddons.filter(a => a !== addonLabel);
                    nextApplied = nextApplied.filter(a => a !== addonLabel);
                }

                return {
                    ...el,
                    addons: nextAddons,
                    appliedToAllAddons: nextApplied
                };
            });
        });
    };

    const handleConnectSave = (data) => {
        setConnectData(data);
        setIsConnected(true);
        setIsConnectModalOpen(false);
        toast.success("Form details connected successfully! Make sure to Publish.");
    };

    // AI Form Generation Mock
    const handleAiGenerateForm = () => {
        const aiElements = [
            { label: 'Short Answer', text: 'Full Name', options: [] },
            { label: 'Short Answer', text: 'Email Address', options: [] },
            {
                label: 'Multiple Choice', text: 'How did you hear about us?', options: [
                    { text: 'Social Media', isCorrect: false },
                    { text: 'Search Engine', isCorrect: false },
                    { text: 'Friend/Colleague', isCorrect: false },
                    { text: 'Other', isCorrect: false }
                ]
            },
            { label: 'Rating', text: 'Rate your overall experience with our portal', options: [] },
            { label: 'Paragraph', text: 'Any additional comments or feedback?', options: [] }
        ];
        setFormElements(aiElements.map(el => ({
            ...el,
            icon: sidebarElements.find(s => s.label === el.label)?.icon || FileText
        })));
        toast.success("AI generated a premium Feedback Form layout!");
    };

    const handlePublish = async (mode = 'connected', settingsObj = null) => {
        if (mode === 'connected' && (!isConnected || !connectData)) {
            toast.error('Please configure the Form metadata first using the Relevant Information tab!');
            setIsConnectModalOpen(true);
            return;
        }

        if (formElements.length === 0) {
            toast.error('Please add at least one form widget to publish!');
            return;
        }

        try {
            setPublishing(true);
            const titleVal = connectData?.name?.trim() || 'Untitled Public Test';

            const testData = {
                testDetails: {
                    title: titleVal,
                    institute: mode === 'connected' 
                        ? (connectData?.institute || 'Default Institute') 
                        : (settingsObj?.selectedFolder ? (settingsObj.selectedFolder.institute || 'Public Web') : 'Public Web'),
                    course: mode === 'connected' 
                        ? (connectData?.course || 'Default Course') 
                        : (settingsObj?.selectedFolder ? (settingsObj.selectedFolder.course || '') : 'Public Access'),
                    subject: mode === 'connected' 
                        ? (connectData?.subject || 'Default Subject') 
                        : (settingsObj?.selectedFolder ? (settingsObj.selectedFolder.subject || '') : 'General'),
                    date: connectData?.date || new Date().toISOString().split('T')[0],
                    index: mode === 'connected' ? (connectData?.index || 'Index 1') : 'Public Index',
                    activity: mode === 'connected' ? (connectData?.activity || 'Quiz') : 'Quiz',
                    publishMode: mode,
                    publicSettings: mode === 'public' ? (settingsObj || publicSettings) : {},
                    discussionActivity: discussionActivity
                },
                questions: formElements.map((el, index) => ({
                    id: `q${index}`,
                    text: el.text?.trim() || `${el.label} Question ${index + 1}`,
                    type: el.label,
                    marks: el.marks !== undefined ? el.marks : 1,
                    description: el.description || '',
                    helperText: el.noteContent || el.helperText || '',
                    uploadedResource: el.uploadedResource || null,
                    instructions: el.instructions || '',
                    required: !!el.required,
                    enabled: el.enabled !== false,
                    negativeMarks: el.negativeMarks || 0,
                    partialMarks: !!el.partialMarks,
                    evaluationMode: el.evaluationMode || 'auto',
                    validation: el.validation || {},
                    assistive: el.assistive || {},
                    particulars: el.particulars || {},
                    logicalSettings: el.logicalSettings || {},
                    validationSettings: el.validationSettings || {},
                    insertedImages: el.insertedImages || [],
                    logic: el.logic || {},
                    textLogic: el.textLogic || {},
                    advanced: el.advanced || {},
                    options: el.options || [],
                    matchingPairs: el.matchingPairs || [],
                    blankAnswers: el.blankAnswers || [],
                    uploadedFiles: el.uploadedFiles || [],
                    addons: el.addons || [],
                    appliedToAllAddons: el.appliedToAllAddons || [],
                    appliedToAllMoreSettings: el.appliedToAllMoreSettings || [],
                    moreSettings: el.moreSettings || { allowUpload: false, allowChat: false, allowSubmitFinish: false },
                    mediaUrl: el.mediaUrl || '',
                    writeMode: !!el.writeMode,
                    audioUrl: el.audioUrl || '',
                    imageUrl: el.imageUrl || '',
                    altText: el.altText || '',
                    align: el.align || 'center',
                    pdfUrl: el.pdfUrl || '',
                    youtubeUrl: el.youtubeUrl || '',
                    embeddedVideoUrl: el.embeddedVideoUrl || '',
                    webpageUrl: el.webpageUrl || '',
                    webpageHeight: el.webpageHeight || 400,
                    webpageScroll: el.webpageScroll || 'yes',
                    smPlatform: el.smPlatform || '',
                    smPostUrl: el.smPostUrl || '',
                    multiMaxFiles: el.multiMaxFiles || 5,
                    multiMaxSizeMB: el.multiMaxSizeMB || 10,
                    multiFileType: el.multiFileType || 'all',
                    videoCallDuration: el.videoCallDuration || 5,
                    videoCallRole: el.videoCallRole || 'interviewer',
                    videoCallScenario: el.videoCallScenario || '',
                    videoUrl: el.videoUrl || '',
                    autoplay: !!el.autoplay,
                    loop: !!el.loop,
                    quality: el.quality || '1080p',
                    includeMic: !!el.includeMic,
                    screenshotScope: el.screenshotScope || 'Entire Screen',
                    agentName: el.agentName || '',
                    greetingMessage: el.greetingMessage || '',
                    systemPersona: el.systemPersona || '',
                    voicePersona: el.voicePersona || 'alloy',
                    scriptScenario: el.scriptScenario || '',
                    activityType: el.activityType || 'AI Lab',
                    activityRules: el.activityRules || ''
                })),
                settings: {
                    duration: mode === 'public' ? (Number((settingsObj || publicSettings).timeLimit) || 60) : 60,
                    passingMarks: 40
                }
            };

            let publishedTest;
            if (id) {
                const res = await axios.put(`/api/tests/${id}`, testData);
                publishedTest = res.data;
                toast.success('Form updated successfully!');
            } else {
                const res = await axios.post('/api/tests', testData);
                publishedTest = res.data;
                toast.success('Form published successfully!');
            }

            setPublishing(false);
            setIsPublishOptionsModalOpen(false);

            if (publishedTest && publishedTest._id) {
                setPublishSuccessInfo({
                    testId: publishedTest._id,
                    testTitle: titleVal,
                    publishMode: mode
                });
            } else {
                navigate('/admin/tests');
            }
        } catch (error) {
            console.error("Error publishing form:", error);
            toast.error(error.response?.data?.message || 'Error publishing form');
            setPublishing(false);
        }
    };

    // Filter sidebar elements based on Search box
    const filteredElements = sidebarElements.filter(el =>
        el.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.category.toLowerCase().includes(searchQuery.toLowerCase())
    );


    const filteredAddons = addonsList.filter(addon =>
        addon.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group elements by category
    const categories = ['Input Elements', 'Displaying Elements', 'Recording & AI Agents', 'Advanced Fields'];

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    <p className="text-slate-500 font-medium">Loading form builder details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-purple-100 selection:text-purple-900">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">

                {/* Left: Home & Form Title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/tools')}
                        className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all"
                    >
                        <Home size={16} className="text-purple-600" />
                        <span>Home</span>
                    </button>
                    <div className="h-5 w-px bg-slate-200"></div>

                    {/* Form Name Input */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={connectData?.name || ''}
                            onChange={(e) => setConnectData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Untitled Form"
                            className="bg-transparent font-bold text-slate-800 text-base border-b border-transparent hover:border-slate-300 focus:border-purple-600 focus:outline-none transition-colors px-1 py-0.5 min-w-[150px] max-w-[240px]"
                        />
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Draft</span>
                    </div>
                </div>

                {/* Center Tabs */}
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                    <button
                        onClick={() => {
                            setIsConnectModalOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isConnected
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        title="Configure form details"
                    >
                        <span>Connect it</span>
                        {isConnected ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        )}
                    </button>

                    {['Edit', 'Responses', 'History', 'Collaborate', 'Preview'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                if (['Responses', 'History', 'Collaborate'].includes(tab)) {
                                    setActiveTab(tab);
                                    toast(`Viewing mock ${tab} panel`, { icon: '📊' });
                                } else {
                                    setActiveTab(tab);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/10'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Right actions: Green Publish button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsPublishOptionsModalOpen(true)}
                        disabled={publishing}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Send size={16} />
                        <span>Publish</span>
                    </button>
                </div>
            </header>



            <div className="flex h-screen overflow-hidden">

                {/* Left Sidebar (Only visible when in Edit tab) */}
                {activeTab === 'Edit' && (
                    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-sm">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-slate-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="font-extrabold text-slate-800 text-base">Elements & Addons</h2>
                            </div>

                            {/* Sidebar Tab Selector */}
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setSidebarTab('Elements & Addons')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'Elements & Addons'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    Elements
                                </button>
                                <button
                                    onClick={() => setSidebarTab('Elements/Addons')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'Elements/Addons'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    Addons
                                </button>
                            </div>

                            {/* Search Box */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search elements..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Draggable Elements List */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                            {sidebarTab === 'Elements & Addons' ? (
                                <div className="space-y-4 animate-fade-in">
                                    {/* 1. Input Elements */}
                                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setIsInputExpanded(!isInputExpanded)}
                                            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 text-purple-750 hover:from-purple-50 hover:to-indigo-50 transition-all font-bold text-xs"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>📝</span>
                                                <span>Input Elements (1-8)</span>
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                    {filteredElements.filter(el => el.category === 'Input Elements').length}
                                                </span>
                                            </div>
                                            <ChevronDown size={14} className={`transition-transform duration-300 ${isInputExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isInputExpanded && (
                                            <div className="p-2.5 bg-white grid grid-cols-2 gap-2 animate-fade-in">
                                                {filteredElements.filter(el => el.category === 'Input Elements').map((el) => {
                                                    const absoluteIndex = sidebarElements.findIndex(s => s.label === el.label) + 1;
                                                    return (
                                                        <div
                                                            key={el.label}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, el)}
                                                            onClick={() => handleAddElement(el)}
                                                            className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                            title="Drag onto canvas or click to append"
                                                        >
                                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                                <el.icon size={16} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-605 group-hover:text-purple-600 transition-colors leading-tight">
                                                                {absoluteIndex}. {el.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {filteredElements.filter(el => el.category === 'Input Elements').length === 0 && (
                                                    <div className="col-span-2 text-center py-4 text-xs text-slate-400 font-medium">No matches</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Displaying Elements */}
                                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setIsDisplayExpanded(!isDisplayExpanded)}
                                            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 text-purple-750 hover:from-purple-50 hover:to-indigo-50 transition-all font-bold text-xs"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>📺</span>
                                                <span>Displaying Elements (9-16)</span>
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                    {filteredElements.filter(el => el.category === 'Displaying Elements').length}
                                                </span>
                                            </div>
                                            <ChevronDown size={14} className={`transition-transform duration-300 ${isDisplayExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isDisplayExpanded && (
                                            <div className="p-2.5 bg-white grid grid-cols-2 gap-2 animate-fade-in">
                                                {filteredElements.filter(el => el.category === 'Displaying Elements').map((el) => {
                                                    const absoluteIndex = sidebarElements.findIndex(s => s.label === el.label) + 1;
                                                    return (
                                                        <div
                                                            key={el.label}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, el)}
                                                            onClick={() => handleAddElement(el)}
                                                            className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                            title="Drag onto canvas or click to append"
                                                        >
                                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                                <el.icon size={16} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-655 group-hover:text-purple-600 transition-colors leading-tight">
                                                                {absoluteIndex}. {el.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {filteredElements.filter(el => el.category === 'Displaying Elements').length === 0 && (
                                                    <div className="col-span-2 text-center py-4 text-xs text-slate-400 font-medium">No matches</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Recording & AI Agents */}
                                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setIsRecordingExpanded(!isRecordingExpanded)}
                                            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 text-purple-750 hover:from-purple-50 hover:to-indigo-50 transition-all font-bold text-xs"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>🎙️</span>
                                                <span>Recording & AI (17-24)</span>
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                    {filteredElements.filter(el => el.category === 'Recording & AI Agents').length}
                                                </span>
                                            </div>
                                            <ChevronDown size={14} className={`transition-transform duration-300 ${isRecordingExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isRecordingExpanded && (
                                            <div className="p-2.5 bg-white grid grid-cols-2 gap-2 animate-fade-in">
                                                {filteredElements.filter(el => el.category === 'Recording & AI Agents').map((el) => {
                                                    const absoluteIndex = sidebarElements.findIndex(s => s.label === el.label) + 1;
                                                    return (
                                                        <div
                                                            key={el.label}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, el)}
                                                            onClick={() => handleAddElement(el)}
                                                            className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                            title="Drag onto canvas or click to append"
                                                        >
                                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                                <el.icon size={16} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-655 group-hover:text-purple-600 transition-colors leading-tight">
                                                                {absoluteIndex}. {el.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {filteredElements.filter(el => el.category === 'Recording & AI Agents').length === 0 && (
                                                    <div className="col-span-2 text-center py-4 text-xs text-slate-400 font-medium">No matches</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Advanced Fields */}
                                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                                            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 text-purple-750 hover:from-purple-50 hover:to-indigo-50 transition-all font-bold text-xs"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>⚡</span>
                                                <span>Advanced Fields</span>
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                    {filteredElements.filter(el => el.category === 'Advanced Fields').length}
                                                </span>
                                            </div>
                                            <ChevronDown size={14} className={`transition-transform duration-300 ${isAdvancedExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isAdvancedExpanded && (
                                            <div className="p-2.5 bg-white grid grid-cols-2 gap-2 animate-fade-in">
                                                {filteredElements.filter(el => el.category === 'Advanced Fields').map((el) => (
                                                    <div
                                                        key={el.label}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, el)}
                                                        onClick={() => handleAddElement(el)}
                                                        className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                        title="Drag onto canvas or click to append"
                                                    >
                                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                            <el.icon size={16} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-655 group-hover:text-purple-600 transition-colors leading-tight">
                                                            {el.label}
                                                        </span>
                                                    </div>
                                                ))}
                                                {filteredElements.filter(el => el.category === 'Advanced Fields').length === 0 && (
                                                    <div className="col-span-2 text-center py-4 text-xs text-slate-400 font-medium">No matches</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Addons Tab Render
                                <div className="space-y-4">
                                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setIsAnalyticalWidgetsExpanded(!isAnalyticalWidgetsExpanded)}
                                            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 text-purple-700 hover:from-purple-50 hover:to-indigo-50 transition-all font-bold text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <PieChart size={16} className="text-purple-600" />
                                                <span>Analytical Widgets</span>
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold ml-1 animate-pulse">
                                                    {filteredAddons.length}
                                                </span>
                                            </div>
                                            <ChevronDown size={16} className={`transition-transform duration-300 ${isAnalyticalWidgetsExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isAnalyticalWidgetsExpanded && (
                                            <div className="p-3 bg-white grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto custom-scrollbar animate-fade-in">
                                                {filteredAddons.map((addon, idx) => (
                                                    <div
                                                        key={idx}
                                                        draggable
                                                        onDragStart={(e) => handleAddonDragStart(e, addon)}
                                                        onClick={() => toast.success(`${addon.label} activated! Drag it to Addons Container.`)}
                                                        className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                        title="Drag onto Addons Container or window"
                                                    >
                                                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                            <addon.icon size={18} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-purple-600 transition-colors leading-tight">{addon.label}</span>
                                                    </div>
                                                ))}
                                                {filteredAddons.length === 0 && (
                                                    <div className="col-span-2 text-center py-6 text-xs text-slate-400 font-medium">
                                                        No matching Addons found.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
                <div className="flex-1 flex flex-col">
                    {/* Secondary Toolbar */}
                    <div className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between">         <div className="flex items-center gap-6">
                        <button
                            onClick={() => toast("Purple Accent Theme active. More templates coming soon!", { icon: '🎨' })}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors uppercase tracking-wider"
                        >
                            <Palette size={14} className="text-purple-500" />
                            <span>Theme</span>
                        </button>

                        <button
                            onClick={handleAiGenerateForm}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors uppercase tracking-wider"
                        >
                            <Bot size={14} className="text-purple-500" />
                            <span>Create with AI</span>
                        </button>

                        <button
                            onClick={() => toast("Integration settings opened: copy link or embed iframe script.", { icon: '🔗' })}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors uppercase tracking-wider"
                        >
                            <Link size={14} className="text-purple-500" />
                            <span>Integrate</span>
                        </button>

                        <button
                            onClick={() => toast("Drag and drop JSON schema file to import elements.", { icon: '📥' })}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors uppercase tracking-wider"
                        >
                            <FolderUp size={14} className="text-purple-500" />
                            <span>Import</span>
                        </button>

                        <button
                            onClick={() => toast("Layout saved as reusable template in your dashboard.", { icon: '💾' })}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors uppercase tracking-wider"
                        >
                            <Save size={14} className="text-purple-500" />
                            <span>Save as Template</span>
                        </button>
                    </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span>Saved to Cloud</span>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <main className="flex-1 bg-slate-50 relative flex flex-col overflow-hidden">

                        {/* Dotted Grid Canvas for Edit tab */}
                        {activeTab === 'Edit' && (
                            <div
                                id="edit-canvas-container"
                                className="flex-1 overflow-y-auto relative p-8 bg-slate-50 transition-colors pb-16 flex justify-center"
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                style={{
                                    backgroundImage: 'radial-gradient(#d8b4fe 1.5px, transparent 1.5px)',
                                    backgroundSize: '24px 24px'
                                }}
                            >
                                <div className="w-full max-w-7xl mx-auto min-h-[600px] pb-12">
                                    {formElements.length === 0 ? (
                                        <div className="mt-20 w-full flex justify-center">
                                            <div className="w-[480px] bg-white rounded-3xl p-10 text-center shadow-xl border border-slate-100 relative group transition-all duration-300 hover:shadow-2xl">
                                                {/* Pulsing AI Arrow */}
                                                <div className="absolute -left-16 top-12 animate-bounce-x hidden md:block">
                                                    <ArrowLeft size={44} className="text-purple-600" strokeWidth={3} />
                                                </div>

                                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md shadow-purple-100">
                                                    <Sparkles size={32} />
                                                </div>

                                                <h3 className="text-2xl font-extrabold text-slate-800 mb-3">Drag Elements Here</h3>
                                                <p className="text-slate-500 text-sm leading-relaxed mb-8 px-4">
                                                    Build your form by dragging elements from the sidebar or click on them. Customize labels, options, validation and more.
                                                </p>

                                                <button
                                                    onClick={handleAiGenerateForm}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 mx-auto active:scale-95 transition-all"
                                                >
                                                    <Bot size={18} />
                                                    <span>Generate Form with AI</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Form Elements List */}
                                            {(() => {
                                                const list = formElements.map((el, idx) => ({ el, originalIndex: idx }));
                                                if (isDragging && draggedQuestionIndex !== null && placeholderIndex !== null) {
                                                    const draggedItem = list[draggedQuestionIndex];
                                                    list.splice(draggedQuestionIndex, 1);
                                                    let insertIndex = placeholderIndex;
                                                    if (placeholderIndex > draggedQuestionIndex) {
                                                        insertIndex = placeholderIndex - 1;
                                                    }
                                                    list.splice(insertIndex, 0, draggedItem);
                                                }
                                                return list.map(({ el, originalIndex }) => (
                                                    <div
                                                        key={el.id || originalIndex}
                                                        id={`question-card-${originalIndex}`}
                                                        className="animate-fade-in question-card px-4 sm:px-6 md:px-8"
                                                    >
                                                        <QuestionBuilderCard
                                                            element={el}
                                                            index={originalIndex}
                                                            onDelete={() => {
                                                                const newElements = [...formElements];
                                                                newElements.splice(originalIndex, 1);
                                                                setFormElements(newElements);
                                                            }}
                                                            onDuplicate={() => {
                                                                const newElements = [...formElements];
                                                                const cloned = JSON.parse(JSON.stringify(el));
                                                                cloned.id = Math.random().toString(36).substring(2, 9);
                                                                newElements.splice(originalIndex + 1, 0, cloned);
                                                                setFormElements(newElements);
                                                                toast.success("Question duplicated successfully!");
                                                            }}
                                                            onUpdateText={(text) => updateElementText(originalIndex, text)}
                                                            onUpdateOptions={(options) => updateElementOptions(originalIndex, options)}
                                                            onUpdateField={(field, val) => updateElementField(originalIndex, field, val)}
                                                            onApplyAddonToAll={(addonLabel, isApplied) => handleApplyAddonToAll(originalIndex, addonLabel, isApplied)}
                                                            onApplyMoreSettingToAll={(settingKey, isApplied) => handleApplyMoreSettingToAll(originalIndex, settingKey, isApplied)}
                                                            onRemoveAddon={(addonLabel) => handleRemoveAddon(originalIndex, addonLabel)}
                                                            onDragStartCustom={(e) => handleCustomDragStart(e, originalIndex)}
                                                            isDragged={draggedQuestionIndex === originalIndex}
                                                            isDragging={isDragging}
                                                            onAddonClick={() => setSidebarTab('Elements/Addons')}
                                                        />
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Preview Mode Screen */}
                        {activeTab === 'Preview' && (
                            <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center items-start">
                                <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden animate-slide-up">
                                    {/* Browser Mockup Header */}
                                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                                        <div className="flex gap-1.5">
                                            <span className="w-3.5 h-3.5 rounded-full bg-red-400"></span>
                                            <span className="w-3.5 h-3.5 rounded-full bg-yellow-400"></span>
                                            <span className="w-3.5 h-3.5 rounded-full bg-green-400"></span>
                                        </div>
                                        <div className="flex-1 max-w-md mx-auto bg-white border border-slate-200 rounded-lg px-3 py-1 text-center text-xs text-slate-400 select-none truncate">
                                            lms-portal.com/preview/form-preview
                                        </div>
                                    </div>

                                    {/* Preview Document Body */}
                                    <div className="p-8 space-y-8">
                                        <div className="border-b border-slate-100 pb-6 text-center">
                                            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{connectData.name || 'Untitled Form'}</h1>
                                            <p className="text-slate-500 text-sm">
                                                {connectData.course ? `${connectData.course} - ${connectData.subject}` : 'Please respond to the queries below.'}
                                            </p>
                                        </div>

                                        {formElements.length === 0 ? (
                                            <div className="text-center py-12 text-slate-400 text-sm font-medium">
                                                No fields added to preview yet. Add some Elements in the editor!
                                            </div>
                                        ) : (
                                                <div className="space-y-6">
                                                {formElements.map((el, index) => (
                                                    <div key={index} className="space-y-2 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                                        <label className="block text-sm font-bold text-slate-700">
                                                            {el.text || `${el.label} Question ${index + 1}`}
                                                        </label>
                                                        {el.label === 'Short Answer' && (
                                                            <input
                                                                type="text"
                                                                placeholder="Your answer..."
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-sm shadow-sm transition-all"
                                                            />
                                                        )}

                                                        {(el.label === 'Paragraph' || el.label === 'Paragraph Answer') && (
                                                            <textarea
                                                                placeholder="Your long-form answer..."
                                                                rows={3}
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-sm shadow-sm transition-all resize-none"
                                                            ></textarea>
                                                        )}

                                                        {(el.label === 'Multiple Choice' || el.label === 'Multiple choices') && (
                                                            <div className="space-y-2.5 mt-2">
                                                                {(el.options && el.options.length > 0 ? el.options : [{ text: 'Option 1' }, { text: 'Option 2' }]).map((opt, oIdx) => (
                                                                    <label key={oIdx} className="flex items-center gap-3 cursor-pointer group">
                                                                        <input
                                                                            type="radio"
                                                                            name={`mc-${index}`}
                                                                            className="w-4.5 h-4.5 text-purple-600 focus:ring-purple-500 border-slate-300"
                                                                        />
                                                                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{opt.text}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {(el.label === 'Checkboxes' || el.label === 'Checkbox') && (
                                                            <div className="space-y-2.5 mt-2">
                                                                {(el.options && el.options.length > 0 ? el.options : [{ text: 'Option 1' }, { text: 'Option 2' }]).map((opt, oIdx) => (
                                                                    <label key={oIdx} className="flex items-center gap-3 cursor-pointer group">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="rounded text-purple-600 focus:ring-purple-500 border-slate-300 w-4.5 h-4.5"
                                                                        />
                                                                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{opt.text}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {el.label === 'Dropdown' && (
                                                            <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-sm shadow-sm transition-all">
                                                                <option value="">Select option...</option>
                                                                {(el.options && el.options.length > 0 ? el.options : [{ text: 'Option 1' }, { text: 'Option 2' }]).map((opt, oIdx) => (
                                                                    <option key={oIdx} value={opt.text}>{opt.text}</option>
                                                                ))}
                                                            </select>
                                                        )}

                                                        {(el.label === 'File Upload' || el.label === 'File upload') && (
                                                            <div className="border border-slate-200 rounded-xl p-4 bg-white flex items-center gap-3">
                                                                <button type="button" className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                                                                    <Upload size={14} />
                                                                    Choose File
                                                                </button>
                                                                <span className="text-xs text-slate-400">No file selected</span>
                                                            </div>
                                                        )}

                                                        {el.label === 'Rating' && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        size={20}
                                                                        className="text-slate-300 hover:text-amber-400 fill-transparent hover:fill-amber-400 cursor-pointer"
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}

                                                        {(el.label === 'Date/Time' || el.label === 'Date & Time') && (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 shadow-sm" />
                                                                <input type="time" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 shadow-sm" />
                                                            </div>
                                                        )}
                                                        {(el.label === 'Voice Rec' || el.label === 'Voice recording') && (
                                                            <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                                                                <button type="button" className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors">
                                                                    <Mic size={18} />
                                                                </button>
                                                                <span className="text-xs font-semibold text-slate-500">Click to record voice response</span>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Video Rec' || el.label === 'Video recording') && (
                                                            <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                                                                <button type="button" className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors">
                                                                    <Video size={18} />
                                                                </button>
                                                                <span className="text-xs font-semibold text-slate-500">Click to capture video response</span>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Image' || el.label === 'Image Displaying') && (
                                                            <div className="mt-2 flex justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                                <img
                                                                    src={el.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                                                                    alt={el.altText || 'Preview'}
                                                                    className={`max-w-full max-h-60 rounded-xl object-contain shadow-sm ${el.align === 'left' ? 'mr-auto' : el.align === 'right' ? 'ml-auto' : 'mx-auto'
                                                                        }`}
                                                                />
                                                            </div>
                                                        )}

                                                        {(el.label === 'Video' || el.label === 'Video Displaying') && (
                                                            <div className="mt-2 flex justify-center bg-slate-900 p-2 rounded-2xl border border-slate-800 overflow-hidden">
                                                                <video
                                                                    src={el.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'}
                                                                    controls
                                                                    autoPlay={!!el.autoplay}
                                                                    loop={!!el.loop}
                                                                    className="w-full max-h-60 rounded-lg object-contain bg-black"
                                                                />
                                                            </div>
                                                        )}

                                                        {(el.label === 'PDF' || el.label === 'PDF Displaying') && (
                                                            <div className="mt-2 flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                                                                        <FileText size={22} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700 text-sm">{el.text || 'View Document'}</span>
                                                                        <span className="text-xs text-slate-400">PDF Document File</span>
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={el.pdfUrl || '#'}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10"
                                                                >
                                                                    View Document
                                                                </a>
                                                            </div>
                                                        )}

                                                        {(el.label === 'YouTube' || el.label === 'Embedded Video Displaying') && (
                                                            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 shadow-sm aspect-video bg-black max-h-[300px] flex items-center justify-center">
                                                                {el.youtubeUrl || el.embeddedVideoUrl ? (
                                                                    <iframe
                                                                        src={getEmbedUrl(el.embeddedVideoUrl || el.youtubeUrl)}
                                                                        title="YouTube Video"
                                                                        className="w-full h-full border-0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                    ></iframe>
                                                                ) : (
                                                                    <div className="text-center text-slate-400 p-4">
                                                                        <Play size={32} className="mx-auto mb-2 text-red-500" />
                                                                        <p className="text-xs font-semibold">Enter a valid YouTube/Video URL to display it here</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {el.label === 'Webpage Displaying' && (
                                                            <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white text-left">
                                                                {el.webpageUrl ? (
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                                                                            <Globe size={10} className="text-purple-500" />
                                                                            <span>{el.webpageUrl}</span>
                                                                        </div>
                                                                        <iframe
                                                                            src={el.webpageUrl}
                                                                            title="Webpage Preview"
                                                                            className="w-full border-0 bg-white"
                                                                            style={{ height: `${Math.min(el.webpageHeight || 300, 200)}px` }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center text-slate-400 p-4 bg-slate-50">
                                                                        <Globe size={32} className="mx-auto mb-2 text-purple-400" />
                                                                        <p className="text-xs font-semibold">No webpage URL provided</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {el.label === 'Embedded SM Content Displaying' && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center gap-3 text-left">
                                                                <div className="p-3 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 shadow-sm">
                                                                    <Share2 size={20} />
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">{el.smPlatform || 'Social Media'} Post</span>
                                                                    <span className="text-sm font-semibold text-slate-700 block truncate max-w-xs">{el.smPostUrl || 'No social media link provided'}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {el.label === 'Multi file Displaying' && (
                                                            <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 bg-purple-50/20 text-center space-y-2">
                                                                <div className="p-3 bg-white text-purple-600 rounded-full border border-purple-150 inline-block">
                                                                    <Files size={20} />
                                                                </div>
                                                                <div>
                                                                    <button type="button" className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-sm mx-auto">
                                                                        Choose Multiple Files
                                                                    </button>
                                                                    <span className="text-xs text-slate-400 mt-2 block">
                                                                        Maximum of {el.multiMaxFiles || 5} files
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Screen Rec' || el.label === 'Screen recording') && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center gap-4 text-center">
                                                                <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center animate-pulse">
                                                                    <Monitor size={28} />
                                                                </div>
                                                                <div>
                                                                    <span className="text-sm font-bold text-slate-700 block">Screen Recorder Ready ({el.quality || '1080p'})</span>
                                                                    <span className="text-xs text-slate-400 mt-1 block">Permission will be requested to record your screen {el.includeMic ? 'and voice audio' : ''}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toast.success("Simulating screen capture start...", { icon: '📹' })}
                                                                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                                                                >
                                                                    <Monitor size={14} /> Start Screen Share
                                                                </button>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Screen Shot' || el.label === 'Screenshot taking') && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center gap-4 text-center">
                                                                <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                                                                    <Camera size={28} />
                                                                </div>
                                                                <div>
                                                                    <span className="text-sm font-bold text-slate-700 block">Capture Screenshot ({el.screenshotScope || 'Entire Screen'})</span>
                                                                    <span className="text-xs text-slate-400 mt-1 block">Take a screenshot of the specified frame and upload</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toast.success("Screenshot saved successfully!", { icon: '📸' })}
                                                                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                                                                >
                                                                    <Camera size={14} /> Capture Screenshot
                                                                </button>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Call Rec' || el.label === 'Web based Audio calling') && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50/80 flex flex-col gap-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                                                        <Phone size={22} />
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-bold text-slate-700 block">Dialer Roleplay Connection</span>
                                                                        <span className="text-xs text-slate-400">Incoming recording connection</span>
                                                                    </div>
                                                                </div>
                                                                {el.scriptScenario && (
                                                                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
                                                                        <strong className="text-slate-700 uppercase tracking-wider block mb-1 text-[10px]">Roleplay Scenario:</strong>
                                                                        {el.scriptScenario}
                                                                    </div>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toast.success("Dialing connection... Start call recording.", { icon: '📞' })}
                                                                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                                                >
                                                                    <Phone size={14} /> Establish Roleplay Connection
                                                                </button>
                                                            </div>
                                                        )}

                                                        {el.label === 'Web based video calling' && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-900 text-white flex flex-col gap-4 text-left">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl">
                                                                        <Video size={22} />
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-bold block">Web Video Call Meeting</span>
                                                                        <span className="text-xs text-slate-400">Simulating live interactive roleplay</span>
                                                                    </div>
                                                                </div>
                                                                {el.videoCallScenario && (
                                                                    <div className="bg-white/10 p-3 rounded-xl border border-white/5 text-xs font-medium text-slate-300 leading-relaxed max-h-24 overflow-y-auto">
                                                                        <strong className="text-white uppercase tracking-wider block mb-1 text-[10px]">Meeting Topic:</strong>
                                                                        {el.videoCallScenario}
                                                                    </div>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toast.success("Connecting video call room...", { icon: '📹' })}
                                                                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                                                >
                                                                    <Video size={14} /> Establish Video Connection ({el.videoCallDuration || 5} min)
                                                                </button>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Audio Listening' || el.label === 'Audio listening Displaying') && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col gap-4 text-left">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                                                                        <Headphones size={22} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Comprehension Track</span>
                                                                        <audio src={el.audioUrl || ''} controls className="w-full mt-1.5 h-9" />
                                                                    </div>
                                                                </div>

                                                                {/* Render MCQ choices for comprehension */}
                                                                <div className="space-y-2 mt-2 pt-4 border-t border-slate-200/50">
                                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Answer Options:</span>
                                                                    {(el.options && el.options.length > 0 ? el.options : [{ text: 'Listen to the audio to respond' }]).map((opt, oIdx) => (
                                                                        <label key={oIdx} className="flex items-center gap-3 cursor-pointer group bg-white p-2.5 rounded-xl border border-slate-100 hover:border-purple-200 transition-all">
                                                                            <input
                                                                                type="radio"
                                                                                name={`listening-mc-${index}`}
                                                                                className="w-4.5 h-4.5 text-purple-600 focus:ring-purple-500 border-slate-300"
                                                                            />
                                                                            <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors font-medium">{opt.text}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Text Chat AI' || el.label === 'Text based AI agent') && (
                                                            <div className="mt-2 border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm flex flex-col h-80">
                                                                <div className="bg-purple-600 p-4 flex items-center justify-between text-white">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                                            <Bot size={18} />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-extrabold">{el.agentName || 'AI Assistant'}</span>
                                                                            <span className="text-[10px] text-purple-100 flex items-center gap-1 font-semibold">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[10px] uppercase font-bold bg-white/10 px-2 py-0.5 rounded-full">AI Roleplay</span>
                                                                </div>
                                                                <div className="flex-1 p-4 bg-slate-50/50 overflow-y-auto space-y-3 text-xs custom-scrollbar">
                                                                    <div className="flex gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold text-[10px]">AI</div>
                                                                        <div className="bg-white p-2.5 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm max-w-[80%] font-medium text-slate-600">
                                                                            {el.greetingMessage || 'Hello! How can I help you today?'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Type message to chat..."
                                                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                toast.success("AI is typing a reply...", { icon: '🤖' });
                                                                                e.target.value = '';
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toast.success("AI typing simulation started...", { icon: '🤖' })}
                                                                        className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                                                    >
                                                                        Send
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Voice Chat AI' || el.label === 'Voice based AI Agent') && (
                                                            <div className="mt-2 border border-slate-200 rounded-3xl p-6 bg-slate-900 text-white flex flex-col items-center justify-center gap-6 min-h-60 relative overflow-hidden">
                                                                <div className="absolute top-4 right-4 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">Voice Call Sim</div>

                                                                <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full flex items-center justify-center animate-pulse">
                                                                    <Bot size={32} />
                                                                </div>

                                                                <div className="text-center">
                                                                    <span className="font-extrabold text-sm block">{el.agentName || 'AI Voice Assistant'}</span>
                                                                    <span className="text-xs text-slate-400 mt-1 block">Voice Persona: {el.voicePersona || 'Alloy'}</span>
                                                                </div>

                                                                {/* Audio Soundwaves Simulator */}
                                                                <div className="flex items-center gap-1.5 h-6">
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((h, i) => (
                                                                        <span
                                                                            key={i}
                                                                            className="w-0.75 bg-purple-400 rounded-full transition-all duration-300"
                                                                            style={{
                                                                                height: `${Math.max(4, h * 3)}px`,
                                                                                animation: `wave-dance 1.2s infinite ease-in-out`,
                                                                                animationDelay: `${i * 0.08}s`
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => toast.success("Voice channel connected successfully!", { icon: '🎙️' })}
                                                                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                                                >
                                                                    <Mic size={14} /> Establish Voice Channel
                                                                </button>

                                                                <style>{`
                                                                    @keyframes wave-dance {
                                                                        0%, 100% { transform: scaleY(1); }
                                                                        50% { transform: scaleY(2.2); }
                                                                    }
                                                                `}</style>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => toast.success("Mock response submitted! Visual verification completed.")}
                                                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all text-sm"
                                                >
                                                    Submit Form Response
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Responses Analytics Dashboard */}
                        {activeTab === 'Responses' && (
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50 animate-slide-up">
                                <div className="max-w-7xl mx-auto space-y-6">
                                    <h1 className="text-2xl font-extrabold text-slate-800">Form Response Dashboard</h1>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Total Responses</span>
                                            <span className="text-3xl font-extrabold text-purple-600">124</span>
                                            <span className="text-xs text-green-500 font-semibold">+12% from last week</span>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Completion Rate</span>
                                            <span className="text-3xl font-extrabold text-purple-600">94.2%</span>
                                            <span className="text-xs text-slate-400 font-medium">Average time: 4m 32s</span>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Dropoff Rate</span>
                                            <span className="text-3xl font-extrabold text-purple-600">5.8%</span>
                                            <span className="text-xs text-red-400 font-semibold">Highest dropoff: Pg 2</span>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Active Sessions</span>
                                            <span className="text-3xl font-extrabold text-emerald-500">8</span>
                                            <span className="text-xs text-slate-400 font-medium">Users taking form currently</span>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Recent Submissions</h3>
                                        <div className="divide-y divide-slate-100">
                                            {[
                                                { name: 'John Doe', email: 'johndoe@gmail.com', time: '5 mins ago', status: 'Completed' },
                                                { name: 'Sarah Smith', email: 'sarah.s@outlook.com', time: '12 mins ago', status: 'Completed' },
                                                { name: 'Michael Brown', email: 'mbrown@edu.co', time: '1 hour ago', status: 'In Progress' }
                                            ].map((sub, sIdx) => (
                                                <div key={sIdx} className="flex justify-between items-center py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 text-sm">{sub.name}</span>
                                                        <span className="text-xs text-slate-400">{sub.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs text-slate-400 font-medium">{sub.time}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sub.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                            }`}>{sub.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Version History panel */}
                        {activeTab === 'History' && (
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50 animate-slide-up">
                                <div className="max-w-xl mx-auto space-y-6">
                                    <h1 className="text-2xl font-extrabold text-slate-800">Version Revision History</h1>
                                    <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                        {[
                                            { rev: 'V3', date: 'Jun 6, 2026, 3:30 PM', author: 'Admin User', desc: 'Published updated questions (Multiple Choice & Ratings)' },
                                            { rev: 'V2', date: 'Jun 6, 2026, 11:15 AM', author: 'Admin User', desc: 'Connected to Web Development Bootcamp course' },
                                            { rev: 'V1', date: 'Jun 5, 2026, 5:00 PM', author: 'Admin User', desc: 'Created form draft' }
                                        ].map((rev, rIdx) => (
                                            <div key={rIdx} className="flex gap-6 relative items-start">
                                                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md z-10 ${rIdx === 0 ? 'bg-purple-600 shadow-purple-200' : 'bg-slate-400'
                                                    }`}>
                                                    {rev.rev}
                                                </div>
                                                <div className="flex-1 bg-white p-4 border border-slate-200/50 rounded-2xl shadow-sm space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-400">{rev.date}</span>
                                                        <span className="text-xs font-semibold text-purple-600">{rev.author}</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-700 leading-snug">{rev.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Collaborate panel */}
                        {activeTab === 'Collaborate' && (
                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 animate-slide-up">
                                <div className="max-w-xl mx-auto bg-white p-6 border border-slate-200/50 rounded-3xl shadow-sm space-y-6">
                                    <h2 className="text-xl font-extrabold text-slate-800">Collaborate with Team</h2>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Share access to edit this form, view submission answers, and get real-time analytics reports with other faculty members.
                                    </p>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Invite New Member</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                placeholder="Enter collaborator email..."
                                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                                            />
                                            <button
                                                onClick={() => toast.success("Invitation sent successfully!")}
                                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10 active:scale-95"
                                            >
                                                Send Invite
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Members with access</span>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                                        AU
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-700">Admin User (You)</span>
                                                        <span className="text-xs text-slate-400">admin@lms.com</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">Owner</span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                                        TU
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-700">Teacher User</span>
                                                        <span className="text-xs text-slate-400">teacher@lms.com</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">Editor</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Page/Logic Footer Bar (Only shown in Edit tab) */}
                        {activeTab === 'Edit' && (
                            <div className="h-12 bg-white border-t border-slate-200 flex items-center justify-center px-6 w-full z-20 shadow-[0_-5px_10px_rgba(0,0,0,0.01)] shrink-0 relative">
                                <div className="absolute left-6 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setIsDiscussionModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-350 rounded-xl shadow-sm transition-all whitespace-nowrap"
                                    >
                                        <MessageSquare size={14} className="text-purple-600" />
                                        <span>Decide Activity</span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toast.success("Page added! Page splits let you build multi-page survey forms.")}
                                        className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                                    >
                                        <Plus size={16} />
                                        <span>Add Page</span>
                                    </button>
                                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 items-center">
                                        <button className="px-3.5 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                                            <Settings size={12} className="text-purple-600" />
                                            <span>Page 1</span>
                                        </button>
                                        <button
                                            onClick={() => toast("Conditional Logic: configure rules to jump to pages.")}
                                            className="px-3.5 py-1.5 text-slate-500 text-xs font-bold hover:text-slate-800 flex items-center gap-1.5 rounded-lg transition-all whitespace-nowrap"
                                        >
                                            <Hash size={12} />
                                            <span>Logic Rules</span>
                                        </button>
                                        <button
                                            onClick={() => toast("Pick form Elements template design from database.")}
                                            className="px-3.5 py-1.5 text-slate-500 text-xs font-bold hover:text-slate-800 flex items-center gap-1.5 rounded-lg transition-all whitespace-nowrap"
                                        >
                                            <Layout size={12} />
                                            <span>Templates</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Floating Counter Badge */}
                        <div className="absolute bottom-4 right-4 z-30">
                            <button
                                onClick={() => toast(`Form is composed of ${formElements.length} custom Elements.`)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                            >
                                <Zap size={14} fill="currentColor" />
                                <span>{formElements.length} UI Elements</span>
                            </button>
                        </div>

                    </main>
                </div>

                {/* Custom Styles */}
                <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes bounce-x {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(-6px); }
                }
                .animate-bounce-x {
                    animation: bounce-x 1.2s infinite ease-in-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

                <ConnectItModal
                    isOpen={isConnectModalOpen}
                    onClose={() => setIsConnectModalOpen(false)}
                    onSave={handleConnectSave}
                    initialData={connectData}
                />

                <PublishOptionsModal
                    isOpen={isPublishOptionsModalOpen}
                    onClose={() => setIsPublishOptionsModalOpen(false)}
                    onPublish={handlePublish}
                    initialSettings={publicSettings}
                    isConnected={isConnected}
                    initialMode={publishModeSelected}
                    onOpenConnect={() => {
                        setIsPublishOptionsModalOpen(false);
                        setIsConnectModalOpen(true);
                    }}
                />

                <PublishSuccessModal
                    isOpen={!!publishSuccessInfo}
                    onClose={() => {
                        setPublishSuccessInfo(null);
                        navigate('/admin/tests');
                    }}
                    testId={publishSuccessInfo?.testId}
                    testTitle={publishSuccessInfo?.testTitle}
                    publishMode={publishSuccessInfo?.publishMode}
                />

                {isDiscussionModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsDiscussionModalOpen(false)}>
                        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col p-6 animate-scale-up" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                                    <MessageSquare size={20} className="text-purple-600" />
                                    <span>Decide Activity</span>
                                </h3>
                                <button
                                    onClick={() => setIsDiscussionModalOpen(false)}
                                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="py-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Activity Name</label>
                                    <input
                                        type="text"
                                        value={discussionActivity?.activityName || ''}
                                        onChange={(e) => setDiscussionActivity(prev => ({ ...prev, activityName: e.target.value }))}
                                        placeholder="Enter activity name (e.g. Discuss on Slack)"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none text-sm font-semibold transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Activity Link (URL)</label>
                                    <input
                                        type="url"
                                        value={discussionActivity?.activityLink || ''}
                                        onChange={(e) => setDiscussionActivity(prev => ({ ...prev, activityLink: e.target.value }))}
                                        placeholder="https://example.com/discussion"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none text-sm font-semibold transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDiscussionModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!discussionActivity?.activityName?.trim()) {
                                            toast.error("Please enter an activity name.");
                                            return;
                                        }
                                        if (!discussionActivity?.activityLink?.trim()) {
                                            toast.error("Please enter a valid link.");
                                            return;
                                        }
                                        setIsDiscussionModalOpen(false);
                                        toast.success("Decide Activity settings configured!");
                                    }}
                                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-500/15"
                                >
                                    Save Activity
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default TestBuilder;
