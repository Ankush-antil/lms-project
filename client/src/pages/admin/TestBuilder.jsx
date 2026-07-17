import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Home, Settings, Eye, Send, BarChart2, Clock, Users,
    Search, Type, AlignLeft, CheckSquare, List,
    ChevronDown, Upload, Download, Star, Calendar, Image as ImageIcon,
    MoreVertical, Plus, Wand2, ArrowLeft,
    FileText, Zap, Layout, Share2, History, MessageSquare,
    Play, PanelLeft, Bot, Palette, Link, Save, Hash, Check,
    FolderUp, CircleDot, File, Mic, Video, Monitor, Camera, Phone,
    PlaySquare, Box, Globe, Headphones, Brain, Trash2, X, Sparkles, CheckCircle2, AlertCircle, Copy, Info, Loader2,
    Bold, Italic, Underline, Strikethrough, ArrowRightLeft, Activity, Code, Quote, Table, HelpCircle, Sliders, GitBranch, Smile, Heading, ListOrdered, GripVertical, AlertTriangle,
    Move, ZoomIn, ZoomOut, Feather, Cog, AlignCenter, AlignRight, AlignJustify, Edit, PieChart, Languages, Paperclip,
    Files, Volume2, PhoneCall, Film, MapPin, Lock, Shield, LayoutTemplate
} from 'lucide-react';
import { uploadVideo } from "../../api/videoApi";
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, UserPlus } from 'lucide-react';
import { useUserProfile } from '../../components/common/UserProfileContext';
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
import ShortAnswerBuilder from '../../components/builder/elements/ShortAnswer';
import ParagraphBuilder from '../../components/builder/elements/ParagraphAnswer';
import MCQBuilder from '../../components/builder/elements/MultipleChoices';
import CheckboxesBuilder from '../../components/builder/elements/Checkbox';
import DropdownBuilder from '../../components/builder/elements/Dropdown';
import TrueFalseBuilder from '../../components/builder/elements/TrueFalse';
import MatchingBuilder from '../../components/builder/elements/MatchingBuilder';
import FillBlanksBuilder from '../../components/builder/elements/FillBlanksBuilder';
import AssignmentBuilder from '../../components/builder/elements/AssignmentBuilder';
import ActivityBuilder from '../../components/builder/elements/ActivityBuilder';
import DateTimeBuilder from '../../components/builder/elements/DateTime';
import AudioListeningBuilder from '../../components/builder/elements/AudioListeningDisplaying';
import ImageBuilder from '../../components/builder/elements/ImageDisplaying';
import FileUploadBuilder from '../../components/builder/elements/FileUpload';
import RatingBuilder from '../../components/builder/elements/Rating';
import YouTubeBuilder from '../../components/builder/elements/EmbeddedVideoDisplaying';
import VideoBuilder from '../../components/builder/elements/VideoDisplaying';
import PDFBuilder from '../../components/builder/elements/PDFDisplaying';
import VoiceRecBuilder from '../../components/builder/elements/VoiceRecording';
import VideoRecBuilder from '../../components/builder/elements/VideoRecording';
import CallRecBuilder from '../../components/builder/elements/CallRecBuilder';
import ScreenRecBuilder from '../../components/builder/elements/ScreenRecording';
import ScreenShotBuilder from '../../components/builder/elements/ScreenShotTaking';
import TextChatAIBuilder from '../../components/builder/elements/TextBasedAiAgent';
import VoiceChatAIBuilder from '../../components/builder/elements/VoiceBasedAiAgent';
import WebpageBuilder from '../../components/builder/elements/WebpageDisplaying';
import EmbeddedVideoBuilder from '../../components/builder/elements/EmbeddedVideoBuilder';
import EmbeddedSMBuilder from '../../components/builder/elements/EmbeddedSMContentDisplaying';
import MultiFileBuilder from '../../components/builder/elements/MultiFileDisplaying';
import VideoCallBuilder from '../../components/builder/elements/WebBasedVideoCalling';
import TabularDataBuilder from '../../components/builder/elements/TabularDataBuilder';

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
    onAddonClick,
    onOpenAiGenerator
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
                        <PieChart size={14} className="text-[#0b1329] animate-pulse" /> Addons Window
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
                                    <div className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 shadow-sm hover:border-[#0b1329] transition-all text-xs font-bold text-slate-700 min-w-[140px]">
                                        <div className="p-1 bg-slate-100 text-[#0b1329] rounded">
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
                                            ? 'bg-slate-100 border-slate-200 text-[#0b1329] font-extrabold shadow-sm'
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
            const lblLower = label.toLowerCase();

            if (lblLower.includes('choice') || lblLower.includes('dropdown') || lblLower.includes('listening')) {
                mockQ = "Which of the following is a key feature of React?";
                mockOpts = [
                    { text: "Virtual DOM", isCorrect: true },
                    { text: "Direct DOM manipulation", isCorrect: false },
                    { text: "Two-way data binding by default", isCorrect: false },
                    { text: "Static templates", isCorrect: false }
                ];
            } else if (lblLower.includes('checkbox')) {
                mockQ = "Select all frontend frameworks/libraries from the list:";
                mockOpts = [
                    { text: "React", isCorrect: true },
                    { text: "Angular", isCorrect: true },
                    { text: "Django", isCorrect: false },
                    { text: "Vue", isCorrect: true }
                ];
            } else if (lblLower.includes('true') || lblLower.includes('false')) {
                mockQ = "Vite uses ES modules internally for hot module replacement during development.";
                mockOpts = [
                    { text: "True", isCorrect: true },
                    { text: "False", isCorrect: false }
                ];
            } else if (lblLower.includes('matching')) {
                mockQ = "Match the following databases with their primary types:";
                onUpdateField('matchingPairs', [
                    { key: "MongoDB", value: "NoSQL Document Store" },
                    { key: "PostgreSQL", value: "Relational RDBMS" },
                    { key: "Neo4j", value: "Graph Database" }
                ]);
            } else if (lblLower.includes('blank')) {
                mockQ = "A [blank] is a function passed as an argument to another function, to be executed after some event.";
                onUpdateField('blankAnswers', ["callback", "callback function"]);
            } else if (lblLower.includes('tabular')) {
                mockQ = "Analyze the logic truth table below and fill in the missing output cells for the boolean operations:";
                onUpdateField('tableData', {
                    headers: ["Input A", "Input B", "A AND B", "A OR B"],
                    rows: [
                        ["0", "0", "0", "0"],
                        ["0", "1", "0", "1"],
                        ["1", "0", "0", "1"],
                        ["1", "1", "1", ""]
                    ]
                });
            } else if (lblLower.includes('paragraph')) {
                mockQ = "Compare and contrast SQL and NoSQL databases. Mention consistency, horizontal scaling, and transaction support.";
            } else if (lblLower.includes('voice') || lblLower.includes('audio') || lblLower.includes('call')) {
                mockQ = "Please pronounce the word: 'Antigravity' and describe its meaning in physics.";
            } else if (lblLower.includes('video')) {
                mockQ = "Record a short video introducing yourself and explaining why you chose this course.";
            } else if (lblLower.includes('screen') || lblLower.includes('shot')) {
                mockQ = "Record your screen demonstrating how to run a dev server with Vite, then take a screenshot of the terminal.";
            } else if (lblLower.includes('file') || lblLower.includes('upload')) {
                mockQ = "Upload your solution project source files in a single zip archive:";
            } else if (lblLower.includes('pdf')) {
                mockQ = "Read the attached React documentation PDF and answer the questions that follow.";
            } else if (lblLower.includes('image')) {
                mockQ = "Look at the architectural diagram below and identify the database component.";
            } else if (lblLower.includes('rating')) {
                mockQ = "Rate your experience with using JavaScript Async/Await vs Promises:";
            } else if (lblLower.includes('date') || lblLower.includes('time')) {
                mockQ = "Select the date and time when the first astronaut landed on the Moon:";
            } else if (lblLower.includes('assignment')) {
                mockQ = "Create a fully functional Todo list application using React and TailwindCSS. Upload your source files as a zip.";
            } else if (lblLower.includes('activity')) {
                mockQ = "Participate in the hands-on keyboard speed typing test and match the target speed of 45 WPM.";
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
            className={`bg-white rounded-xl border transition-all duration-300 font-sans shadow-sm hover:shadow-md ${enabled ? 'border-slate-200 hover:border-[#0b1329]' : 'border-slate-200 bg-slate-50/50 opacity-70'
                } ${writeMode ? 'ring-2 ring-slate-100 border-[#0b1329]' : ''} ${isDragged ? 'opacity-40 border-[#0b1329] border-dashed scale-[0.99] bg-slate-50/30 shadow-inner' : ''
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
                    <div className="p-1.5 bg-[#0b1329] text-white rounded-lg flex items-center justify-center shadow-sm w-7.5 h-7.5">
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


                            {/* Upload */}
                            {label === 'Short Answer' ? (
                                element.uploadedResource ? (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowUploadMenu(!showUploadMenu)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
                                                        <Edit size={12} className="text-[#0b1329] shrink-0" />
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
                                                        <Eye size={12} className="text-slate-655 shrink-0" />
                                                        <span>Preview</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onUpdateField('noteContent', '');
                                                            setShowNoteDropdown(false);
                                                            toast.success("Note removed successfully!");
                                                        }}
                                                        className="w-full px-2.5 py-1.5 hover:bg-red-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-red-600 transition-colors"
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
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
                                    className={`px-3 py-1.5 rounded-lg transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm border ${writeMode ? 'bg-[#0b1329] text-white border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'}`}
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
                                    className={`p-1.5 rounded-lg transition-all ${element.insertedImage ? 'bg-slate-100 text-[#0b1329]' : 'bg-slate-100 text-slate-655 hover:bg-slate-200'}`}
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
                                    className={`p-1.5 rounded-lg transition-all ${element.mediaUrl ? 'bg-slate-100 text-[#0b1329]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
                                                {label === item.label && <span className="w-1.5 h-1.5 rounded-full bg-[#0b1329]" />}
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
                                    onClick={(e) => {
                                        const anchor = e.target.closest('a');
                                        if (anchor) {
                                            e.preventDefault();
                                            const url = anchor.getAttribute('href');
                                            if (url) {
                                                window.open(url, '_blank');
                                            }
                                        }
                                    }}
                                    className="w-full font-bold text-slate-800 bg-transparent outline-none min-h-[32px] pr-12 placeholder:text-slate-400 rich-text-editor font-sans"
                                    placeholder="Type your Text here"
                                    style={{ fontSize: `${18 * (zoomScale / 100)}px` }}
                                />
                            ) : (
                                <textarea
                                    value={stripHtml(element.text || '')}
                                    onChange={(e) => {
                                        onUpdateText(e.target.value);
                                        // Auto-grow
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    placeholder="Type your Text here"
                                    rows={1}
                                    className="w-full font-bold text-slate-800 bg-transparent outline-none pr-12 placeholder:text-slate-400 border-none font-sans resize-none overflow-hidden"
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
                                    <label className="cursor-pointer bg-[#0b1329] text-white px-2 py-1 rounded font-bold text-[10px] hover:bg-[#152244] transition-colors shadow-sm flex items-center gap-1">
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
                                        className={`px-2 py-1 bg-slate-100 hover:bg-slate-100 text-[#0b1329] rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all ${openMenu === 'insert' ? 'bg-slate-100' : ''}`}
                                        title="Insert media, tables or formulas"
                                    >
                                        <span>Insert</span>
                                        <ChevronDown size={10} className="text-slate-400" />
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
                                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-[#0b1329] transition-all shadow-sm"
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
                        <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-2">
                            <span className="text-[10px] font-black text-[#0b1329] uppercase tracking-widest block">Attachments ({element.uploadedFiles.length})</span>
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
                                case 'Tabular Data':
                                    return <TabularDataBuilder {...commonProps} />;
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
                                                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0b1329]"></div>
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
                                                    ? 'bg-[#0b1329] text-white border-[#0b1329] shadow-sm'
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
                                                    ? 'bg-[#0b1329] text-white border-[#0b1329] shadow-sm'
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
                                                        ? 'bg-[#0b1329] text-white border-[#0b1329] shadow-sm'
                                                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
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
                                                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center gap-1.5 bg-slate-50 text-[#0b1329] hover:bg-slate-100 border border-slate-200 shadow-sm"
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
                            onClick={(e) => {
                                const anchor = e.target.closest('a');
                                if (anchor) {
                                    e.preventDefault();
                                    const url = anchor.getAttribute('href');
                                    if (url) {
                                        window.open(url, '_blank');
                                    }
                                }
                            }}
                            onFocus={updateNoteActiveFormat}
                            className="w-full text-xs font-medium bg-slate-55 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none min-h-[180px] focus:bg-white focus:border-[#0b1329] transition-all shadow-sm rich-text-editor font-sans"
                            placeholder="Write a note..."
                            style={{ outline: 'none' }}
                        />
                    </div>
                </div>

            )}
        </div>
    );
};

const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const TestBuilder = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, logout, switchAccount, removeAccount } = useAuth();
    const { openProfile } = useUserProfile();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    const handleCloseBuilder = () => {
        const fallbackPath = user?.role === 'Editor'
            ? '/editor'
            : user?.role === 'Teacher'
                ? '/teacher/activities'
                : user?.role === 'Institute'
                    ? '/institute/activities'
                    : '/admin/activities';
        navigate(fallbackPath);
    };

    const editorControls = user?.editorProfile?.controls;
    if (user?.role === 'Editor' && editorControls?.tools?.enabled === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center p-6">
                <div className="w-16 h-16 bg-red-50 text-red-550 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
                    <Settings className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-800">Section Deactivated</h3>
                <p className="text-slate-500 font-medium max-w-sm mt-2">
                    {editorControls.tools.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                </p>
                <button
                    onClick={handleCloseBuilder}
                    className="mt-6 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/10 active:scale-95 transition-all"
                >
                    Back to Workspace
                </button>
            </div>
        );
    }

    const hasActivityControl = (controlName) => {
        if (user?.role === 'Admin' || user?.role === 'Institute') return true;

        // 1. Check parent institute allowed status
        const instAllowed = user?.institute?.controls?.activities?.[controlName] !== false;
        if (!instAllowed) return false;

        // 2. If Teacher, check teacher profile controls
        if (user?.role === 'Teacher') {
            const builderControls = user?.teacherProfile?.controls?.tools;
            if (builderControls) {
                if (builderControls.enabled === false) return false;
                if (builderControls[controlName] === false) return false;
            }
        }
        return true;
    };

    const savedAccounts = (() => {
        try {
            const listStr = localStorage.getItem('lmsSavedAccounts');
            const list = listStr ? JSON.parse(listStr) : [];
            return Array.isArray(list) ? list.filter(acc => acc.user?.email !== user?.email) : [];
        } catch (e) {
            return [];
        }
    })();

    const [activeTab, setActiveTab] = useState('Edit');
    const [sidebarTab, setSidebarTab] = useState('Elements & Addons');

    useEffect(() => {
        if (user) {
            const hasElements = hasActivityControl('elementsControl');
            const hasAddons = hasActivityControl('addons');
            if (!hasElements && hasAddons) {
                setSidebarTab('Elements/Addons');
            }
        }
    }, [user]);

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

    // AI Question Generator States
    const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
    const [aiGeneratorTargetIndex, setAiGeneratorTargetIndex] = useState(null);
    const [aiChatMessages, setAiChatMessages] = useState([
        { sender: 'ai', text: 'Hello! I am your AI Assistant. Tell me what topic you want questions on, how many, and what type (e.g. MCQ, Short Answer), and I will generate them for you!' }
    ]);
    const [aiChatInput, setAiChatInput] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    // Clean up speech recognition on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const [activeVideoId, setActiveVideoId] = useState(null);
    const [addedVideoUrls, setAddedVideoUrls] = useState([]);
    
    // AI Assistant Attachment States & Ref
    const [aiAttachment, setAiAttachment] = useState(null);
    const [aiAttachmentPreview, setAiAttachmentPreview] = useState('');
    const [aiAttachmentType, setAiAttachmentType] = useState('');
    const [aiPdfText, setAiPdfText] = useState('');
    const [aiParsingPdf, setAiParsingPdf] = useState(false);
    const aiAttachmentInputRef = useRef(null);

    const dragPositionsRef = useRef([]);
    const draggedIndexRef = useRef(null);
    const placeholderIndexRef = useRef(null);
    const formElementsRef = useRef([]);
    const chatEndRef = useRef(null);

    // Load user-specific and test-specific AI chat history from localStorage
    useEffect(() => {
        if (user?._id) {
            const key = `lms_ai_chat_messages_${user._id}_${id || 'new'}`;
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    setAiChatMessages(JSON.parse(saved));
                } else {
                    setAiChatMessages([
                        { sender: 'ai', text: 'Hello! I am your AI Assistant. Tell me what topic you want questions on, how many, and what type (e.g. MCQ, Short Answer), and I will generate them for you!' }
                    ]);
                }
            } catch (e) {
                console.error("Failed to load AI chat history from localStorage", e);
            }
        }
    }, [user?._id, id]);

    useEffect(() => {
        if (isAiGeneratorOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [aiChatMessages, isAiGeneratorOpen]);

    // Save user-specific and test-specific AI chat history to localStorage
    useEffect(() => {
        if (user?._id && aiChatMessages.length > 0) {
            const key = `lms_ai_chat_messages_${user._id}_${id || 'new'}`;
            try {
                localStorage.setItem(key, JSON.stringify(aiChatMessages));
            } catch (e) {
                console.error("Failed to save AI chat history to localStorage", e);
            }
        }
    }, [aiChatMessages, user?._id, id]);

    useEffect(() => {
        formElementsRef.current = formElements;
    }, [formElements]);

    const convertToSubjectRelativeInbox = (courseObj, subjectName, rawInbox) => {
        if (!rawInbox || !subjectName || !courseObj) return rawInbox;
        
        const subjects = courseObj.subjects || [];
        const durations = courseObj.subjectDurations || [];
        const totalDuration = courseObj.duration || 5;

        let currentDayIndex = 1;
        const mapping = [];

        if (subjects && subjects.length > 0) {
            subjects.forEach(subjName => {
                const d = durations.find(dur => dur.subjectName?.toLowerCase() === subjName.toLowerCase());
                if (d) {
                    const subName = d.subjectName;
                    const subDur = Number(d.duration) || 0;
                    const subDays = [];
                    for (let i = 1; i <= subDur; i++) {
                        if (currentDayIndex <= totalDuration) {
                            subDays.push({
                                dayNum: i,
                                indexNum: currentDayIndex,
                                id: `Inbox ${currentDayIndex}`
                            });
                            currentDayIndex++;
                        }
                    }
                    if (subDays.length > 0) {
                        mapping.push({
                            subjectName: subjName,
                            days: subDays
                        });
                    }
                }
            });
        }

        const matchedGroup = mapping.find(m => m.subjectName.toLowerCase() === subjectName.toLowerCase());
        if (matchedGroup) {
            const inboxNorm = rawInbox.trim().toLowerCase();
            const foundDay = matchedGroup.days.find(d => d.id.trim().toLowerCase() === inboxNorm);
            if (foundDay) {
                return `Inbox ${foundDay.dayNum}`;
            }
        }
        return rawInbox;
    };

    useEffect(() => {
        const studentIdParam = searchParams.get('studentId');
        const inboxIdParam = searchParams.get('inboxId');
        
        const instParam = searchParams.get('institute');
        const courseParam = searchParams.get('course');
        const subjectParam = searchParams.get('subject');
        const inboxParam = searchParams.get('inbox');
        
        const initializeConnectData = async () => {
            try {
                const { data: coursesList } = await axios.get('/api/setup/courses');
                
                let finalInst = instParam || '';
                let finalCourse = courseParam || '';
                let finalSubject = subjectParam || '';
                let rawInbox = inboxParam || inboxIdParam || 'Inbox 1';
                let studentName = '';

                if (studentIdParam) {
                    const { data: studentData } = await axios.get(`/api/users/${studentIdParam}`);
                    if (studentData) {
                        const studentInstitute = studentData.institute?.name || studentData.institute || '';
                        const studentCourse = studentData.studentProfile?.course?.name || studentData.studentProfile?.course || '';
                        const studentSubject = studentData.studentProfile?.subject || '';
                        
                        finalInst = instParam || studentInstitute;
                        finalCourse = courseParam || studentCourse || '';
                        finalSubject = subjectParam || studentSubject;
                        studentName = studentData.name;
                    }
                }

                let finalInbox = rawInbox;
                if (finalCourse && finalSubject && coursesList && coursesList.length > 0) {
                    const courseObj = coursesList.find(c => c.name?.toLowerCase() === finalCourse.toLowerCase());
                    if (courseObj) {
                        finalInbox = convertToSubjectRelativeInbox(courseObj, finalSubject, rawInbox);
                    }
                }

                setConnectData(prev => ({
                    ...prev,
                    name: studentName ? `Test for ${studentName}` : (prev.name || 'Untitled Form'),
                    institute: finalInst,
                    course: finalCourse,
                    subject: finalSubject,
                    index: finalInbox,
                    date: new Date().toISOString().split('T')[0],
                    activity: prev.activity || 'Quiz',
                    isAssigned: true
                }));
                setIsConnected(true);

            } catch (err) {
                console.error("Error during TestBuilder connect prefill:", err);
            }
        };

        if (studentIdParam || instParam || courseParam || subjectParam || inboxParam) {
            initializeConnectData();
        }
    }, [searchParams]);

    // Connect Metadata
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [allowTeacherEdit, setAllowTeacherEdit] = useState(false);
    const [isDiscussionModalOpen, setIsDiscussionModalOpen] = useState(false);
    const [monitoringEnabled, setMonitoringEnabled] = useState(false);
    const [locationLockedEnabled, setLocationLockedEnabled] = useState(false);
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
    const formNameInputRef = useRef(null);
    const [discussionActivity, setDiscussionActivity] = useState({ activityName: '', activityLink: '' });

    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
    const [templateMeta, setTemplateMeta] = useState({
        name: '',
        type: 'form', // 'section' | 'form'
        target: 'site' // 'site' | 'cloud'
    });

    const [isTemplatesBrowseOpen, setIsTemplatesBrowseOpen] = useState(false);
    const [browseTab, setBrowseTab] = useState('site'); // 'site' | 'cloud'
    const [activeLibraryHeaderTab, setActiveLibraryHeaderTab] = useState('Templates'); // 'Section' | 'Form' | 'Templates'
    const [templateSearchQuery, setTemplateSearchQuery] = useState('');
    const [previewTemplate, setPreviewTemplate] = useState(null);

    const [siteTemplates, setSiteTemplates] = useState(() => {
        const saved = localStorage.getItem('lms_site_templates');
        return saved ? JSON.parse(saved) : [];
    });

    const [cloudTemplates, setCloudTemplates] = useState(() => {
        const saved = localStorage.getItem('lms_cloud_templates');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('lms_site_templates', JSON.stringify(siteTemplates));
    }, [siteTemplates]);

    useEffect(() => {
        localStorage.setItem('lms_cloud_templates', JSON.stringify(cloudTemplates));
    }, [cloudTemplates]);

    const handleSaveAsTemplate = () => {
        if (!templateMeta.name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = new Date().toLocaleDateString('en-US', options);

        const newTemplate = {
            id: 'template_' + Date.now(),
            name: templateMeta.name.trim(),
            type: templateMeta.type === 'form' ? 'Form' : 'Section',
            createdBy: user?.name || user?.username || 'mubarakgnr',
            creationDate: formattedDate,
            target: templateMeta.target,
            elements: JSON.parse(JSON.stringify(formElements)) // clone elements
        };

        if (templateMeta.target === 'site') {
            setSiteTemplates(prev => [newTemplate, ...prev]);
            toast.success(`Saved to Site Templates (Your Profile)!`);
        } else {
            setCloudTemplates(prev => [newTemplate, ...prev]);
            toast.success(`Saved to Cloud Templates (Publicly Shared)!`);
        }

        setIsSaveTemplateModalOpen(false);
    };

    const handleSelectTemplate = (template) => {
        if (template.elements && template.elements.length > 0) {
            setFormElements(template.elements);
            toast.success(`Loaded template: ${template.name}`);
        } else {
            toast.error("Selected template is empty");
        }
        setIsTemplatesBrowseOpen(false);
    };

    const handleExportSingleTemplate = (tpl) => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tpl, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${tpl.name.replace(/\s+/g, '_')}_template.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            toast.success(`Template "${tpl.name}" exported successfully!`);
        } catch (error) {
            toast.error("Failed to export template");
        }
    };

    const handleImportTemplates = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                const templatesToAdd = Array.isArray(parsed) ? parsed : [parsed];

                // Validate templates
                const validTemplates = templatesToAdd.filter(tpl => {
                    return tpl && typeof tpl === 'object' && tpl.name && tpl.type && Array.isArray(tpl.elements);
                });

                if (validTemplates.length === 0) {
                    toast.error("No valid templates found in file");
                    return;
                }

                // Add unique IDs and set fields
                const processed = validTemplates.map(tpl => ({
                    id: tpl.id || `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: tpl.name,
                    type: tpl.type === 'Section' ? 'Section' : 'Form',
                    createdBy: tpl.createdBy || user?.name || 'Imported User',
                    creationDate: tpl.creationDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    elements: tpl.elements
                }));

                setSiteTemplates(prev => [...processed, ...prev]);
                toast.success(`Successfully imported ${processed.length} template(s)!`);
            } catch (err) {
                toast.error("Failed to parse JSON template file");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleInsertGeneratedQuestions = (questionsList, messageIndex) => {
        if (!questionsList || questionsList.length === 0) return;

        // Create new form elements based on generated questions
        const newElements = questionsList.map(q => {
            let label = 'Short Answer';
            let defaultOptions = [];
            let defaultMatchingPairs = [];
            let defaultBlankAnswers = [];
            let defaultTableData = null;

            const typeLower = (q.type || '').toLowerCase();

            if (typeLower === 'tabular data' || q.tableData) {
                label = 'Tabular Data';
                defaultTableData = q.tableData || {
                    headers: ["Input A", "Input B", "A AND B", "A OR B"],
                    rows: [
                        ["0", "0", "0", "0"],
                        ["0", "1", "0", "1"],
                        ["1", "0", "0", "1"],
                        ["1", "1", "1", ""]
                    ]
                };
            } else if (typeLower === 'matching' || (q.matchingPairs && q.matchingPairs.length > 0)) {
                label = 'Matching';
                defaultMatchingPairs = q.matchingPairs || [];
            } else if (typeLower === 'fill in the blanks' || (Array.isArray(q.blankAnswers) && q.blankAnswers.length > 0) || typeLower.includes('blank')) {
                label = 'Fill in the Blanks';
                defaultBlankAnswers = q.blankAnswers || (q.correctAnswer ? [q.correctAnswer] : []);
            } else if (typeLower === 'checkboxes' || typeLower === 'checkbox') {
                label = 'Checkboxes';
                defaultOptions = (q.options || []).map(opt => ({
                    text: typeof opt === 'object' ? opt.text : opt,
                    isCorrect: typeof opt === 'object' ? !!opt.isCorrect : (Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : opt === q.correctAnswer)
                }));
            } else if (typeLower === 'true/false' || typeLower === 'true false') {
                label = 'True/False';
                defaultOptions = [
                    { text: 'True', isCorrect: String(q.correctAnswer).toLowerCase() === 'true' },
                    { text: 'False', isCorrect: String(q.correctAnswer).toLowerCase() === 'false' }
                ];
            } else if (q.options && q.options.length > 0) {
                label = typeLower.includes('dropdown') ? 'Dropdown' : 'Multiple Choice';
                defaultOptions = q.options.map(opt => ({
                    text: typeof opt === 'object' ? opt.text : opt,
                    isCorrect: typeof opt === 'object' ? !!opt.isCorrect : opt === q.correctAnswer
                }));
            } else if (typeLower) {
                const mappedLabels = {
                    'short answer': 'Short Answer',
                    'paragraph': 'Paragraph',
                    'paragraph answer': 'Paragraph',
                    'voice rec': 'Voice Rec',
                    'video rec': 'Video Rec',
                    'screen rec': 'Screen Rec',
                    'file upload': 'File Upload',
                    'rating': 'Rating',
                    'date/time': 'Date/Time',
                    'date & time': 'Date/Time',
                    'pdf': 'PDF',
                    'image': 'Image',
                    'youtube': 'YouTube',
                    'assignment': 'Assignment',
                    'activity': 'Activity'
                };
                label = mappedLabels[typeLower] || 'Short Answer';
            }

            return {
                id: Math.random().toString(36).substring(2, 9),
                label: label,
                text: q.question,
                options: defaultOptions,
                matchingPairs: defaultMatchingPairs,
                blankAnswers: defaultBlankAnswers,
                tableData: defaultTableData,
                description: q.answer || '',
                helperText: '',
                instructions: '',
                required: q.required !== undefined ? q.required : false,
                enabled: true,
                marks: q.marks !== undefined ? Number(q.marks) : 1,
                negativeMarks: q.negativeMarks !== undefined ? Number(q.negativeMarks) : 0,
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
                    fileTypes: 'All',
                    required: false,
                    singleLineMode: false,
                    minChars: '',
                    maxChars: '',
                    minWords: '',
                    maxWords: '',
                    placeholderText: 'Your answer',
                    defaultValue: q.answer || '',
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
                },
                addons: Array.isArray(q.addons) ? q.addons : []
            };
        });

        // Insert new elements after target index, or append if targetIndex is null
        setFormElements(prev => {
            const list = [...prev];
            const insertIdx = aiGeneratorTargetIndex !== null ? aiGeneratorTargetIndex + 1 : list.length;
            list.splice(insertIdx, 0, ...newElements);
            return list;
        });

        setAiChatMessages(prev => prev.map((msg, i) => i === messageIndex ? { ...msg, added: true } : msg));
        toast.success(`Successfully added ${newElements.length} questions to the test!`);
    };

    const handleInsertEmbeddedVideo = (videoInfo, messageIndex) => {
        if (!videoInfo || !videoInfo.url) return;

        const newElement = {
            id: Math.random().toString(36).substring(2, 9),
            label: 'Embedded Video Displaying',
            text: videoInfo.title || 'YouTube Video Recommended by AI',
            options: [],
            matchingPairs: [],
            blankAnswers: [],
            tableData: null,
            icon: sidebarElements.find(s => s.label === 'Embedded Video Displaying')?.icon || Play,
            description: videoInfo.description || '',
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
                fileTypes: 'All',
                required: false,
                singleLineMode: false,
                minChars: '',
                maxChars: '',
                minWords: '',
                maxWords: '',
                placeholderText: '',
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
            youtubeUrl: videoInfo.url,
            embeddedVideoUrl: videoInfo.url,
            videoUrl: '',
            autoplay: false,
            loop: false,
            quality: '1080p',
            includeMic: false,
            screenshotScope: 'Entire Screen',
            agentName: '',
            greetingMessage: '',
            agentInstructions: '',
            agentScenario: '',
            agentTriggerWord: '',
            agentTemperature: 0.7,
            agentVoiceName: '',
            agentMaxTurns: 10,
            agentAutoStart: false,
            agentShowAvatar: true,
            embeddedSMUrl: '',
            audioUrlDisplay: '',
            multipleFilesDisplay: [],
            pdfUrlDisplay: '',
            webpageUrl: '',
            webpageSandbox: true,
            particularsTab: 'particulars'
        };

        // Insert new elements after target index, or append if targetIndex is null
        setFormElements(prev => {
            const list = [...prev];
            const insertIdx = aiGeneratorTargetIndex !== null ? aiGeneratorTargetIndex + 1 : list.length;
            list.splice(insertIdx, 0, newElement);
            return list;
        });

        // Mark as added in global addedVideoUrls state
        setAddedVideoUrls(prev => [...prev, videoInfo.url]);
        toast.success("Successfully added Video Displaying element to the test!");
    };

    const loadPdfJs = () => {
        return new Promise((resolve, reject) => {
            if (window['pdfjs-dist/build/pdf']) {
                resolve(window['pdfjs-dist/build/pdf']);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.onload = () => {
                resolve(window['pdfjs-dist/build/pdf']);
            };
            script.onerror = () => {
                reject(new Error("Failed to load PDF parser library"));
            };
            document.body.appendChild(script);
        });
    };

    const handleAiAttachmentChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAiAttachment(file);
        setAiPdfText('');

        if (file.type.startsWith('image/')) {
            setAiAttachmentType('image');
            const reader = new FileReader();
            reader.onload = () => {
                setAiAttachmentPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            setAiAttachmentType('pdf');
            setAiAttachmentPreview(file.name);
            setAiParsingPdf(true);

            try {
                const pdfjsLib = await loadPdfJs();
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

                const fileReader = new FileReader();
                fileReader.onload = async (event) => {
                    try {
                        const typedarray = new Uint8Array(event.target.result);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        let extractedText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            const pageText = content.items.map(item => item.str).join(' ');
                            extractedText += pageText + '\n';
                        }
                        setAiPdfText(extractedText);
                        setAiParsingPdf(false);
                        toast.success(`Successfully parsed PDF (${pdf.numPages} pages)!`);
                    } catch (err) {
                        console.error("PDF Parsing Error:", err);
                        toast.error("Failed to parse PDF content");
                        setAiParsingPdf(false);
                        setAiAttachment(null);
                        setAiAttachmentPreview('');
                        setAiAttachmentType('');
                    }
                };
                fileReader.readAsArrayBuffer(file);
            } catch (err) {
                console.error("Failed to initialize PDF library:", err);
                toast.error("Could not load PDF parsing library");
                setAiParsingPdf(false);
                setAiAttachment(null);
                setAiAttachmentPreview('');
                setAiAttachmentType('');
            }
        } else {
            toast.error("Unsupported file type. Please select an image or PDF.");
            setAiAttachment(null);
            setAiAttachmentPreview('');
            setAiAttachmentType('');
        }
    };

    const handleVoiceTyping = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Voice typing is not supported in this browser. Please use Google Chrome or Edge.");
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Indian English / Hinglish support

        recognition.onstart = () => {
            setIsListening(true);
            toast('Listening... Speak now!', { icon: '🎙️' });
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                setAiChatInput(prev => prev ? prev + ' ' + transcript : transcript);
                toast.success("Voice input added!");
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event);
            if (event.error === 'not-allowed') {
                toast.error("Microphone access denied. Please check your browser settings.");
            } else {
                toast.error(`Voice error: ${event.error}`);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleSendChatMessage = async () => {
        if (!aiChatInput.trim() && !aiAttachment) return;

        const userMessage = aiChatInput.trim();
        let promptText = userMessage;

        // If it's a PDF, we append the extracted text to the prompt!
        if (aiAttachmentType === 'pdf' && aiPdfText) {
            promptText = `[Attached PDF Content: "${aiPdfText}"]\n\nUser Message: ${userMessage || "Please generate questions based on this PDF document"}`;
        }

        const payloadMessage = userMessage || (aiAttachmentType === 'image' ? "Question generation from image" : `Questions from PDF: ${aiAttachmentPreview}`);

        // Add user message to chat log
        setAiChatMessages(prev => [
            ...prev,
            { 
                sender: 'user', 
                text: payloadMessage, 
                attachmentPreview: aiAttachmentType === 'image' ? aiAttachmentPreview : null,
                attachmentName: aiAttachmentType === 'pdf' ? aiAttachmentPreview : null
            }
        ]);

        setAiChatInput('');
        const currentAttachmentPreview = aiAttachmentPreview;
        const currentAttachmentType = aiAttachmentType;

        // Reset attachment state immediately
        setAiAttachment(null);
        setAiAttachmentPreview('');
        setAiAttachmentType('');
        setAiPdfText('');

        setAiGenerating(true);

        // Construct history context for Gemini
        const chatHistoryText = aiChatMessages
            .map(msg => `${msg.sender === 'user' ? 'User' : 'AI Assistant'}: ${msg.text}`)
            .join('\n');

        const fullPromptText = `
You are an AI Question Generator assistant in an online LMS test builder.
The user is talking to you in a chat interface. They will ask you to generate questions, suggest video courses/tutorials, change difficulty, refine topics, translate, etc.

Current conversation history:
${chatHistoryText}

User's new request: "${promptText}"

Your instructions:
1. If the user asks to generate, update, or refine questions (e.g. "make 5 HTML questions", "translate to Hindi", "make it hard"), you MUST generate the requested questions and place them in the "questions" array.
2. If the user asks for video tutorials, courses, or video links (e.g. "muja 5 HTML videos chaya"), find or construct a list of valid, real YouTube video links matching the topic, and place them in the "videos" array. If they do not ask for videos, keep the "videos" array empty [].
3. If the user asks to add any add-ons or tools (e.g., "addon bhi add kar do", "calculator", "timer"), include them in the "addons" array for each question. Available addons are: "Translator it", "Help with AI", "Voice typing", "Timer", "Rich Text", "Calculator".
4. In the "message" field, provide a friendly and helpful response to the user in Hinglish/English.
5. If the user is just chatting or asking a general question without requesting test questions, you can leave the "questions" array empty.
6. You MUST strictly set the "type" field of each question to match what the user requested. If the user asks for "short questions", "short answer", or "brief answers", you MUST set the type to "Short Answer" (do NOT use "Fill in the Blanks"). If they ask for multiple choice, use "Multiple Choice". If they ask for checkboxes/multi-select, use "Checkboxes". Only use "Fill in the Blanks" if they explicitly asked for blanks or fill in the blanks.

JSON Output Schema format (strictly return ONLY valid JSON matching this structure, do NOT wrap in markdown code blocks like \`\`\`json):
{
  "message": "Your friendly reply summarizing what you did or asking for clarifications",
  "questions": [
    {
      "question": "The question text here",
      "type": "Multiple Choice | Checkboxes | True/False | Matching | Fill in the Blanks | Tabular Data | Paragraph | Short Answer | Voice Rec | Video Rec | Screen Rec | File Upload | PDF | Image | YouTube | Rating | Date/Time | Assignment | Activity",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Include options if MCQ/True-False/Dropdown/Checkboxes, otherwise keep empty array []
      "correctAnswer": "Option A", // Match one option exactly if MCQ or True/False. For Fill in Blanks, the answer.
      "matchingPairs": [{"key": "Term A", "value": "Match A"}], // Only if type is Matching, otherwise empty array []
      "blankAnswers": ["word1", "word2"], // Only if type is Fill in the Blanks, otherwise empty array []
      "tableData": { "headers": ["Header 1", "Header 2"], "rows": [["Cell 1", "Cell 2"], ["Cell 3", ""]] }, // Only if type is Tabular Data, otherwise null. Pre-fill some cells, leave others empty "" for students to fill.
      "answer": "Model answer or explanation",
      "addons": ["Timer", "Translator it"], // Add addons if requested by user, otherwise empty array []
      "marks": 1, // Default to 1, update if user asks for specific marks
      "negativeMarks": 0, // Default to 0, update if user asks for negative marking
      "required": false // Default to false, update if user wants to make question mandatory
    }
  ],
  "videos": [
    {
      "title": "Title of the recommended YouTube video",
      "url": "https://www.youtube.com/watch?v=...", // A valid, real YouTube watch link
      "description": "Short description of what the video covers"
    }
  ]
}
`;

        try {
            const bodyPayload = { prompt: fullPromptText };
            if (currentAttachmentType === 'image' && currentAttachmentPreview) {
                bodyPayload.image = currentAttachmentPreview;
            }

            const response = await axios.post('/api/ai/chat', bodyPayload);
            const responseText = response.data.text;

            if (!responseText) {
                throw new Error("No response returned from AI");
            }

            // Clean markdown wrappers
            let cleanText = responseText.trim();
            if (cleanText.startsWith("```")) {
                cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, "");
                cleanText = cleanText.replace(/\n```$/, "");
            }
            cleanText = cleanText.trim();

            const parsed = JSON.parse(cleanText);
            const replyMessage = parsed.message || "Here is the response.";
            const questionsList = parsed.questions || [];

            let videosList = parsed.videos || [];
            if (parsed.video && videosList.length === 0) {
                videosList = [parsed.video];
            }

            // Add AI response message to chat log
            setAiChatMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: replyMessage,
                    questions: questionsList.length > 0 ? questionsList : null,
                    videos: videosList.length > 0 ? videosList : null,
                    added: false
                }
            ]);

        } catch (err) {
            console.error("Gemini Chat Generation Error:", err);
            const errMsg = err.response?.data?.message || err.message || 'Unknown network error';
            setAiChatMessages(prev => [
                ...prev,
                { sender: 'ai', text: `Failed to process request: ${errMsg}` }
            ]);
        } finally {
            setAiGenerating(false);
        }
    };

    const handleExportForm = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            connectData,
            formElements,
            version: "1.0",
            exportedAt: new Date().toISOString()
        }, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${connectData?.name || 'form'}_export.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success("Form exported as JSON successfully!");
    };

    const importFileInputRef = useRef(null);

    const handleImportForm = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsedData = JSON.parse(event.target.result);
                if (parsedData && (parsedData.formElements || Array.isArray(parsedData.elements))) {
                    if (parsedData.connectData) {
                        setConnectData(parsedData.connectData);
                        if (parsedData.connectData.name) {
                            setIsConnected(true);
                        }
                    }
                    const elements = parsedData.formElements || parsedData.elements;
                    setFormElements(elements);
                    toast.success("Form imported successfully!");
                } else {
                    toast.error("Invalid JSON format. Make sure it is a valid exported form.");
                }
            } catch (err) {
                console.error("JSON parsing error:", err);
                toast.error("Failed to parse JSON file.");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };
    const [connectData, setConnectData] = useState({
        name: 'Untitled Form',
        institute: '',
        course: '',
        subject: '',
        date: new Date().toISOString().split('T')[0],
        index: 'Inbox 1',
        activity: 'Quiz',
        isAssigned: true,
        duration: '',
        passingMarks: ''
    });
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [tempDescription, setTempDescription] = useState('');

    const [publishing, setPublishing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!id);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

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
        { icon: Activity, label: 'Activity', category: 'Advanced Fields' },
        { icon: Table, label: 'Tabular Data', category: 'Advanced Fields' }
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
                        index: test.index || 'Inbox 1',
                        activity: test.activity || 'Quiz',
                        isAssigned: !!test.isAssigned,
                        duration: test.settings?.duration || '',
                        passingMarks: test.settings?.passingMarks || '',
                        description: test.description || ''
                    });
                    setIsConnected(true);
                    setAllowTeacherEdit(!!test.allowTeacherEdit);
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
                            tableData: q.tableData || null,
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
                            videoWidth: q.videoWidth || 500,
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
                    handleCloseBuilder();
                }
            };
            fetchTest();
        }
    }, [id, navigate]);

    // Fetch history logs
    useEffect(() => {
        if (id && activeTab === 'History') {
            const fetchHistory = async () => {
                try {
                    setHistoryLoading(true);
                    const res = await axios.get(`/api/tests/${id}/history`);
                    setHistoryData(res.data || []);
                } catch (error) {
                    console.error("Error fetching test history:", error);
                } finally {
                    setHistoryLoading(false);
                }
            };
            fetchHistory();
        }
    }, [id, activeTab, historyRefreshKey]);

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

        const defaultTableData = element.label === 'Tabular Data'
            ? { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', ''], ['', '', '']] }
            : null;

        setFormElements(prev => [...prev, {
            id: Math.random().toString(36).substring(2, 9),
            label: element.label,
            text: '',
            options: defaultOptions,
            matchingPairs: defaultMatchingPairs,
            blankAnswers: defaultBlankAnswers,
            tableData: defaultTableData,
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

    const handleVideoResizeStart = (e, index, corner) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = formElements[index].videoWidth || 500;

        const handleMouseMove = (moveEvent) => {
            let deltaX = moveEvent.clientX - startX;
            let deltaY = moveEvent.clientY - startY;
            // Use the maximum delta to represent uniform resize
            let change = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
            if (deltaX < 0 && (corner === 'top-right' || corner === 'bottom-right')) change = -Math.abs(change);
            if (deltaX > 0 && (corner === 'top-left' || corner === 'bottom-left')) change = -Math.abs(change);
            if (deltaX > 0 && (corner === 'top-right' || corner === 'bottom-right')) change = Math.abs(change);
            if (deltaX < 0 && (corner === 'top-left' || corner === 'bottom-left')) change = Math.abs(change);

            const newWidth = Math.max(500, Math.min(1000, startWidth + change * 1.5));
            setFormElements(prev => prev.map((el, i) => i === index ? { ...el, videoWidth: newWidth } : el));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleConnectSave = async (data) => {
        setConnectData(data);
        setIsConnected(true);
        setIsConnectModalOpen(false);

        if (id) {
            try {
                setSaving(true);
                const titleVal = data?.name?.trim() || 'Untitled Draft Test';
                const currentMode = publishModeSelected || 'connected';

                const testData = {
                    testDetails: {
                        title: titleVal,
                        description: data?.description || '',
                        institute: data?.institute || user?.institute?.name || (typeof user?.institute === 'string' ? user.institute : 'Default Institute'),
                        course: data?.course || '',
                        subject: data?.subject || '',
                        date: data?.date || new Date().toISOString().split('T')[0],
                        index: data?.index || 'Inbox 1',
                        activity: data?.activity || 'Quiz',
                        publishMode: currentMode,
                        discussionActivity: discussionActivity,
                        assignmentType: 'all',
                        assignedStudents: [],
                        allowTeacherEdit: allowTeacherEdit,
                        isAssigned: data?.isAssigned || false
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
                        tableData: el.tableData || null,
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
                        videoWidth: el.videoWidth || 500,
                        htmlContent: el.htmlContent || '',
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
                        duration: Number(data?.duration) || 60,
                        passingMarks: Number(data?.passingMarks) || 40
                    }
                };

                await axios.put(`/api/tests/${id}`, testData);
                toast.success("Information saved and synced to database! ✓");
            } catch (error) {
                console.error("Error auto-saving connected details:", error);
                toast.error(error.response?.data?.message || "Failed to save changes to database.");
            } finally {
                setSaving(false);
            }
        } else {
            toast.success("Form details connected successfully! Make sure to Save or Publish.");
        }
    };

    // AI Form Generation Mock
    const handleAiGenerateForm = () => {
        setAiGeneratorTargetIndex(null);
        if (aiChatMessages.length <= 1) {
            setAiChatMessages([
                { sender: 'ai', text: 'Hello! I am your AI Assistant. Tell me what topic you want questions on, how many, and what type (e.g. MCQ, Short Answer), and I will generate them for you!' }
            ]);
        }
        setIsAiGeneratorOpen(true);
    };

    const handleAddPage = () => {
        let basePath = '/admin/activities-builder';
        if (user?.role === 'Institute') basePath = '/institute/activities-builder';
        else if (user?.role === 'Editor') basePath = '/editor/activities-builder';
        else if (user?.role === 'Teacher') basePath = '/teacher/activities-builder';

        const params = new URLSearchParams();
        if (connectData?.institute) params.set('institute', connectData.institute);
        if (connectData?.course) params.set('course', connectData.course);
        if (connectData?.subject) params.set('subject', connectData.subject);
        if (connectData?.index) params.set('inbox', connectData.index);
        
        const wasLocked = searchParams.get('locked') === 'true';
        if (wasLocked) {
            params.set('locked', 'true');
        }

        // Navigate to the builder path with parameters
        navigate(`${basePath}?${params.toString()}`);
        
        // Also clear local builder state to ensure fresh initialization
        setFormElements([]);
        setPublishModeSelected('connected');
        setConnectData(prev => ({
            ...prev,
            name: 'Untitled Form',
            date: new Date().toISOString().split('T')[0],
            isAssigned: true,
            duration: '',
            passingMarks: '',
            description: ''
        }));
        setIsConnected(true);
        toast.success("Ready to create a new test in the same inbox!");
    };

    const handleSaveAsDraft = () => {
        handlePublish('draft', null);
    };

    const handlePublish = async (mode = 'connected', settingsObj = null) => {
        if (mode === 'connected' && (!isConnected || !connectData)) {
            toast.error('Please configure the Form metadata first using the Relevant Information tab!');
            setIsConnectModalOpen(true);
            return;
        }

        if (formElements.length === 0) {
            toast.error('Please add at least one form widget to save!');
            return;
        }

        try {
            setPublishing(true);
            const titleVal = connectData?.name?.trim() || (mode === 'draft' ? 'Untitled Draft Test' : 'Untitled Public Test');

            const testData = {
                testDetails: {
                    title: titleVal,
                    description: (mode === 'connected' || mode === 'draft') ? (connectData?.description || '') : (settingsObj?.description || ''),
                    institute: (mode === 'connected' || mode === 'draft')
                        ? (connectData?.institute || user?.institute?.name || (typeof user?.institute === 'string' ? user.institute : 'Default Institute'))
                        : (settingsObj?.selectedFolder ? (settingsObj.selectedFolder.institute || 'Public Web') : 'Public Web'),
                    course: (mode === 'connected' || mode === 'draft')
                        ? (connectData?.course || '')
                        : (settingsObj?.selectedFolder ? (settingsObj.selectedFolder.course || '') : 'Public Access'),
                    subject: (mode === 'connected' || mode === 'draft')
                        ? (connectData?.subject || '')
                        : (settingsObj?.selectedFolder ? (settingsObj.selectedFolder.subject || '') : 'General'),
                    date: connectData?.date || new Date().toISOString().split('T')[0],
                    index: (mode === 'connected' || mode === 'draft') ? (connectData?.index || 'Inbox 1') : 'Public Inbox',
                    activity: (mode === 'connected' || mode === 'draft') ? (connectData?.activity || 'Quiz') : 'Quiz',
                    publishMode: mode,
                    publicSettings: mode === 'public' ? (settingsObj || publicSettings) : {},
                    discussionActivity: discussionActivity,
                    assignmentType: (mode === 'connected' && settingsObj) ? settingsObj.assignmentType : 'all',
                    assignedStudents: (mode === 'connected' && settingsObj) ? settingsObj.assignedStudents : [],
                    allowTeacherEdit: (mode === 'connected' && settingsObj && settingsObj.allowTeacherEdit !== undefined) ? settingsObj.allowTeacherEdit : allowTeacherEdit,
                    isAssigned: (mode === 'connected' || mode === 'draft') ? (connectData?.isAssigned || false) : false
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
                    tableData: el.tableData || null,
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
                    videoWidth: el.videoWidth || 500,
                    htmlContent: el.htmlContent || '',
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
                    duration: mode === 'public' ? (Number((settingsObj || publicSettings).timeLimit) || 60) : (Number(connectData?.duration) || 60),
                    passingMarks: Number(connectData?.passingMarks) || 40
                }
            };

            let publishedTest;
            if (id) {
                const res = await axios.put(`/api/tests/${id}`, testData);
                publishedTest = res.data;
                if (mode === 'draft') {
                    toast.success('Draft updated successfully!');
                } else {
                    toast.success('Form updated successfully!');
                }
            } else {
                const res = await axios.post('/api/tests', testData);
                publishedTest = res.data;
                if (mode === 'draft') {
                    toast.success('Draft saved successfully!');
                } else {
                    toast.success('Form published successfully!');
                }
            }

            // Log history
            const targetId = id || publishedTest?._id;
            if (targetId) {
                try {
                    const actionVal = mode === 'draft' ? 'saved' : 'published';
                    const descVal = mode === 'draft' 
                        ? `Saved draft of "${titleVal}"`
                        : `Published "${titleVal}" (${mode} mode) with ${formElements.length} element(s)`;
                    await axios.post(`/api/tests/${targetId}/history`, {
                        action: actionVal,
                        description: descVal,
                        meta: { mode, title: titleVal, questionCount: formElements.length }
                    });
                } catch (_) {}
            }

            setPublishing(false);
            setIsPublishOptionsModalOpen(false);

            if (mode === 'draft') {
                const redirectPath = (searchParams.get('studentId') || user?.role === 'Teacher')
                    ? '/teacher/activities'
                    : (user?.role === 'Editor' ? '/editor' : user?.role === 'Institute' ? '/institute/activities' : '/admin/activities');
                
                if (redirectPath !== '/teacher/activities') {
                    const inst = testData.testDetails.institute || '';
                    const crs = testData.testDetails.course || '';
                    const subj = testData.testDetails.subject || '';
                    const inbox = testData.testDetails.index || 'Inbox 1';
                    const testId = publishedTest?._id || id || '';
                    navigate(`${redirectPath}?exp_inst=${encodeURIComponent(inst)}&exp_course=${encodeURIComponent(crs)}&exp_subject=${encodeURIComponent(subj)}&exp_inbox=${encodeURIComponent(inbox)}&highlightTestId=${testId}`);
                } else {
                    navigate(redirectPath);
                }
                return;
            }

            if (publishedTest && publishedTest._id) {
                setPublishSuccessInfo({
                    testId: publishedTest._id,
                    testTitle: titleVal,
                    publishMode: mode
                });
            } else {
                const redirectPath = (searchParams.get('studentId') || user?.role === 'Teacher')
                    ? '/teacher/activities'
                    : (user?.role === 'Editor' ? '/editor' : user?.role === 'Institute' ? '/institute/activities' : '/admin/activities');
                
                if (redirectPath !== '/teacher/activities') {
                    const inst = testData.testDetails.institute || '';
                    const crs = testData.testDetails.course || '';
                    const subj = testData.testDetails.subject || '';
                    const inbox = testData.testDetails.index || 'Inbox 1';
                    const testId = id || '';
                    navigate(`${redirectPath}?exp_inst=${encodeURIComponent(inst)}&exp_course=${encodeURIComponent(crs)}&exp_subject=${encodeURIComponent(subj)}&exp_inbox=${encodeURIComponent(inbox)}&highlightTestId=${testId}`);
                } else {
                    navigate(redirectPath);
                }
            }
        } catch (error) {
            console.error("Error publishing form:", error);
            toast.error(error.response?.data?.message || 'Error publishing form');
            setPublishing(false);
        }
    };

    // Quick Save — saves the current form data without changing publish mode or navigating away
    const handleSave = async () => {
        if (formElements.length === 0) {
            toast.error('Please add at least one form widget to save!');
            return;
        }
        try {
            setSaving(true);
            const titleVal = connectData?.name?.trim() || 'Untitled Draft Test';
            const currentMode = publishModeSelected || 'connected';

            const testData = {
                testDetails: {
                    title: titleVal,
                    institute: connectData?.institute || user?.institute?.name || (typeof user?.institute === 'string' ? user.institute : 'Default Institute'),
                    course: connectData?.course || '',
                    subject: connectData?.subject || '',
                    date: connectData?.date || new Date().toISOString().split('T')[0],
                    index: connectData?.index || 'Inbox 1',
                    activity: connectData?.activity || 'Quiz',
                    publishMode: currentMode,
                    discussionActivity: discussionActivity,
                    assignmentType: 'all',
                    assignedStudents: [],
                    allowTeacherEdit: allowTeacherEdit,
                    isAssigned: connectData?.isAssigned || false
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
                    tableData: el.tableData || null,
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
                    videoWidth: el.videoWidth || 500,
                    htmlContent: el.htmlContent || '',
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
                    duration: Number(connectData?.duration) || 60,
                    passingMarks: Number(connectData?.passingMarks) || 40
                }
            };

            let targetId = id;
            if (id) {
                await axios.put(`/api/tests/${id}`, testData);
                toast.success('Changes saved successfully! ✓');
            } else {
                const res = await axios.post('/api/tests', testData);
                toast.success('Activity saved successfully! ✓');
                const newId = res.data?._id;
                targetId = newId;
                if (newId) {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('id', newId);
                    window.history.replaceState({}, '', newUrl.toString());
                }
            }

            // Log history
            if (targetId) {
                try {
                    await axios.post(`/api/tests/${targetId}/history`, {
                        action: 'saved',
                        description: `Saved changes to "${titleVal}" with ${formElements.length} widget(s)`,
                        meta: { questionCount: formElements.length, title: titleVal }
                    });
                    setHistoryRefreshKey(prev => prev + 1);
                } catch (_) {}
            }
        } catch (error) {
            console.error('Error saving form:', error);
            toast.error(error.response?.data?.message || 'Error saving changes');
        } finally {
            setSaving(false);
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1329]"></div>
                    <p className="text-slate-500 font-medium">Loading form builder details...</p>
                </div>
            </div>
        );
    }

    const builderControls = user?.teacherProfile?.controls?.tools;
    if (user?.role === 'Teacher' && builderControls?.enabled === false) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-sans">
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/60 backdrop-blur-xl border border-slate-200 rounded-[32px] text-center shadow-xl shadow-slate-100/50 max-w-2xl mx-auto my-12 relative overflow-hidden group">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                    <div className="w-20 h-20 bg-red-50 text-red-650 rounded-3xl flex items-center justify-center mb-6 shadow-inner transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Tools Locked</h2>
                    <p className="text-sm font-bold text-slate-500 max-w-md mb-6 leading-relaxed">
                        {builderControls.note || 'The tools page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                    <button
                        onClick={handleCloseBuilder}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-slate-100 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="bg-[#0b1329] text-white border-b border-slate-800 h-16 flex items-center justify-between px-6 sticky top-0 z-50 shadow-md">

                {/* Left: Home & Form Title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCloseBuilder}
                        className="flex items-center gap-2 px-3.5 py-2 border border-slate-800 rounded-xl hover:bg-white/10 text-white font-semibold text-sm transition-all"
                    >
                        <Home size={16} className="text-white" />
                        <span>Home</span>
                    </button>
                    <div className="h-5 w-px bg-slate-800"></div>

                    {/* Form Name Input */}
                    <div className="flex items-center gap-2 relative">
                        <input
                            type="text"
                            ref={formNameInputRef}
                            value={connectData?.name || ''}
                            onChange={(e) => setConnectData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Untitled Form"
                            className="bg-transparent font-bold text-white text-base border-b border-transparent hover:border-slate-750 focus:border-white focus:outline-none transition-colors px-1 py-0.5 min-w-[150px] max-w-[240px]"
                        />
                        {/* Options Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all focus:outline-none flex items-center justify-center"
                                title="Form Options"
                            >
                                <ChevronDown size={14} />
                            </button>

                            {isHeaderMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                                    <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-slate-800 animate-fade-in text-left">
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                toast.success("Starred this form!");
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-left text-slate-700"
                                        >
                                            <Star size={13} className="text-amber-500" fill="currentColor" />
                                            <span>Star</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                setTempDescription(connectData.description || '');
                                                setIsDescriptionModalOpen(true);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-left text-slate-700"
                                        >
                                            <FileText size={13} className="text-slate-400" />
                                            <span>Description</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                formNameInputRef.current?.focus();
                                                formNameInputRef.current?.select();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-left text-slate-700 border-t border-slate-100"
                                        >
                                            <Edit size={13} className="text-slate-400" />
                                            <span>Rename</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                toast.success("Form duplicated as draft!");
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-left text-slate-700"
                                        >
                                            <Copy size={13} className="text-slate-400" />
                                            <span>Duplicate</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                handleExportForm();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-left text-slate-700 border-t border-slate-100"
                                        >
                                            <Download size={13} className="text-emerald-600" />
                                            <span className="text-emerald-700 font-extrabold">Export form</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                toast("Access management details opened.");
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-left text-slate-700"
                                        >
                                            <Users size={13} className="text-slate-400" />
                                            <span>Manage Access</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                handleCloseBuilder();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-rose-50 hover:text-rose-700 transition-colors text-left text-slate-700 border-t border-slate-100"
                                        >
                                            <X size={13} className="text-rose-500" />
                                            <span>Close form</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsHeaderMenuOpen(false);
                                                toast.error("Moved to trash!");
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold hover:bg-red-50 hover:text-red-700 transition-colors text-left text-slate-700"
                                        >
                                            <Trash2 size={13} className="text-red-500" />
                                            <span>Move to trash</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleSaveAsDraft}
                            disabled={publishing}
                            className="flex items-center gap-1 text-[10px] uppercase font-black text-white bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700/80 hover:border-slate-600 px-3 py-1.5 rounded-full shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Save all changes as Draft"
                        >
                            <Save size={10} className="text-slate-350" />
                            <span>Save as Draft</span>
                        </button>
                    </div>
                </div>

                {/* Center Tabs */}
                <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                    {hasActivityControl('connectIt') !== false && (
                        <button
                            onClick={() => {
                                setIsConnectModalOpen(true);
                            }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isConnected
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
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
                    )}

                    {['Edit', 'History', 'Collaborate', 'Preview'].filter((tab) => {
                        if (tab === 'Collaborate') return hasActivityControl('collaborate') !== false;
                        return true;
                    }).map((tab) => (
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
                                ? 'bg-white text-[#0b1329] shadow-md'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Right actions: Green Publish button, More Setting, and Profile Dropdown */}
                <div className="flex items-center gap-3 relative">
                    <button
                        onClick={() => setIsPublishOptionsModalOpen(true)}
                        disabled={publishing}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Send size={16} />
                        <span>Publish</span>
                    </button>

                    {hasActivityControl('moreSettings') !== false && (
                        <button
                            onClick={() => {
                                sessionStorage.setItem('lastTestBuilderUrl', window.location.pathname + window.location.search);
                                window.location.href = '/more-setting/more-settings.html';
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-850 hover:border-slate-700 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-sm font-bold active:scale-95 transition-all focus:outline-none"
                        >
                            <Settings size={15} />
                            <span>More Setting</span>
                        </button>
                    )}

                    {/* User profile avatar to verify account and open settings dropdown */}
                    {user && (
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-black shadow-md overflow-hidden ring-2 ring-slate-805 hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none flex-shrink-0"
                                title={`Logged in as: ${user.name} (${user.role})`}
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user.name?.[0]?.toUpperCase() || 'U'
                                )}
                            </button>

                            {isProfileDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-full right-0 mt-3 w-64 bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-1.5 text-white text-left animate-fade-in"
                                    >
                                        <div
                                            onClick={() => {
                                                openProfile(user?._id || user?.id);
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="px-3 py-2.5 border-b border-slate-800 cursor-pointer hover:bg-white/5 rounded-xl transition-all"
                                        >
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                                            <p className="text-xs font-bold text-slate-200 truncate">{user?.email}</p>
                                            <span className="inline-block mt-1.5 text-[8px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-widest">{user?.role}</span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                openProfile(user?._id || user?.id);
                                                setIsProfileDropdownOpen(false);
                                            }}
                                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold text-left"
                                        >
                                            <User size={16} />
                                            <span>My Profile Settings</span>
                                        </button>

                                        {hasActivityControl('profileUnderSettings') !== false && (
                                            <button
                                                onClick={() => {
                                                    sessionStorage.setItem('lastTestBuilderUrl', window.location.pathname + window.location.search);
                                                    setIsProfileDropdownOpen(false);
                                                    window.location.href = '/more-setting/settings.html';
                                                }}
                                                className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold text-left"
                                            >
                                                <Settings size={16} />
                                                <span>Settings</span>
                                            </button>
                                        )}

                                        {/* Saved Accounts Switcher */}
                                        {savedAccounts.length > 0 && (
                                            <div className="border-t border-b border-slate-800/80 py-2 flex flex-col gap-1">
                                                <p className="px-3 text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Switch Account</p>
                                                <div className="max-h-[160px] overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                                                    {savedAccounts.map((acc, index) => (
                                                        <div
                                                            key={index}
                                                            onClick={() => {
                                                                switchAccount(acc.token, acc.user);
                                                                setIsProfileDropdownOpen(false);
                                                            }}
                                                            className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/5 rounded-xl transition-all group/acc cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-200 overflow-hidden shrink-0">
                                                                    {acc.user?.avatar ? (
                                                                        <img src={acc.user.avatar} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                                                                    ) : (
                                                                        acc.user?.name?.[0]?.toUpperCase() || 'U'
                                                                    )}
                                                                </div>
                                                                <div className="text-left min-w-0">
                                                                    <p className="text-xs font-bold text-slate-200 truncate leading-none">{acc.user?.name || 'Saved Account'}</p>
                                                                    <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider">{acc.user?.role}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeAccount(acc.user?.email);
                                                                }}
                                                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-md transition-all opacity-0 group-hover/acc:opacity-100"
                                                                title="Remove Account"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                setIsProfileDropdownOpen(false);
                                                window.location.href = '/login?mode=add-account';
                                            }}
                                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-indigo-400 hover:bg-indigo-950/20 rounded-xl transition-all font-bold border border-indigo-900/30 border-dashed text-left"
                                        >
                                            <UserPlus size={16} />
                                            <span>Add More Account</span>
                                        </button>

                                        <hr className="my-0.5 border-slate-800" />

                                        <button
                                            onClick={() => {
                                                setIsProfileDropdownOpen(false);
                                                logout();
                                            }}
                                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-red-400 hover:bg-red-950/20 rounded-xl transition-all font-bold text-left"
                                        >
                                            <LogOut size={16} />
                                            <span>Sign Out Portal</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </header>



            <div className="flex h-screen overflow-hidden">

                {/* Left Sidebar (Only visible when in Edit tab) */}
                {activeTab === 'Edit' && (hasActivityControl('elementsControl') !== false || hasActivityControl('addons') !== false) && (
                    <aside className="w-64 bg-[#0b1329] border-r border-slate-800/80 flex flex-col h-full z-20 shadow-md text-white">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-slate-800 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="font-extrabold text-white text-base">Elements & Addons</h2>
                            </div>

                            {/* Sidebar Tab Selector */}
                            {hasActivityControl('elementsControl') !== false && hasActivityControl('addons') !== false && (
                                <div className="flex gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
                                    <button
                                        onClick={() => setSidebarTab('Elements & Addons')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'Elements & Addons'
                                            ? 'bg-white text-[#0b1329] shadow-sm'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Elements
                                    </button>
                                    <button
                                        onClick={() => setSidebarTab('Elements/Addons')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'Elements/Addons'
                                            ? 'bg-white text-[#0b1329] shadow-sm'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Addons
                                    </button>
                                </div>
                            )}

                            {/* Search Box */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search elements..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm outline-none focus:bg-slate-800 focus:border-slate-700 transition-all placeholder:text-slate-500 text-white"
                                />
                            </div>
                        </div>

                        {/* Draggable Elements List */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                            {sidebarTab === 'Elements & Addons' ? (
                                <div className="space-y-4 animate-fade-in">
                                    {/* 1. Input Elements */}
                                    {hasActivityControl('inputElements') !== false && (
                                        <div className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-[#0b1329]">
                                            <button
                                                type="button"
                                                onClick={() => setIsInputExpanded(!isInputExpanded)}
                                                className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60 transition-all font-bold text-xs"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span>📝</span>
                                                    <span>Input Elements (1-8)</span>
                                                    <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                        {filteredElements.filter(el => el.category === 'Input Elements').length}
                                                    </span>
                                                </div>
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${isInputExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isInputExpanded && (
                                                <div className="p-2.5 bg-[#0b1329] grid grid-cols-2 gap-2 animate-fade-in">
                                                    {filteredElements.filter(el => el.category === 'Input Elements').map((el) => {
                                                        const absoluteIndex = sidebarElements.findIndex(s => s.label === el.label) + 1;
                                                        return (
                                                            <div
                                                                key={el.label}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, el)}
                                                                onClick={() => handleAddElement(el)}
                                                                className="flex flex-col items-center justify-center p-2.5 bg-[#0e1936] border border-slate-800 rounded-2xl hover:border-white/40 hover:bg-white/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                                title="Drag onto canvas or click to append"
                                                            >
                                                                <div className="p-2 bg-white/10 text-white rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                                    <el.icon size={16} />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors leading-tight">
                                                                    {absoluteIndex}. {el.label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {filteredElements.filter(el => el.category === 'Input Elements').length === 0 && (
                                                        <div className="col-span-2 text-center py-4 text-xs text-slate-500 font-medium">No matches</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. Displaying Elements */}
                                    {hasActivityControl('displayingElements') !== false && (
                                        <div className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-[#0b1329]">
                                            <button
                                                type="button"
                                                onClick={() => setIsDisplayExpanded(!isDisplayExpanded)}
                                                className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60 transition-all font-bold text-xs"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span>📺</span>
                                                    <span>Displaying Elements (9-16)</span>
                                                    <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                        {filteredElements.filter(el => el.category === 'Displaying Elements').length}
                                                    </span>
                                                </div>
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${isDisplayExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isDisplayExpanded && (
                                                <div className="p-2.5 bg-[#0b1329] grid grid-cols-2 gap-2 animate-fade-in">
                                                    {filteredElements.filter(el => el.category === 'Displaying Elements').map((el) => {
                                                        const absoluteIndex = sidebarElements.findIndex(s => s.label === el.label) + 1;
                                                        return (
                                                            <div
                                                                key={el.label}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, el)}
                                                                onClick={() => handleAddElement(el)}
                                                                className="flex flex-col items-center justify-center p-2.5 bg-[#0e1936] border border-slate-800 rounded-2xl hover:border-white/40 hover:bg-white/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                                title="Drag onto canvas or click to append"
                                                            >
                                                                <div className="p-2 bg-white/10 text-white rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                                    <el.icon size={16} />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors leading-tight">
                                                                    {absoluteIndex}. {el.label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {filteredElements.filter(el => el.category === 'Displaying Elements').length === 0 && (
                                                        <div className="col-span-2 text-center py-4 text-xs text-slate-500 font-medium">No matches</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. Recording & AI Agents */}
                                    {hasActivityControl('recordingElements') !== false && (
                                        <div className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-[#0b1329]">
                                            <button
                                                type="button"
                                                onClick={() => setIsRecordingExpanded(!isRecordingExpanded)}
                                                className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60 transition-all font-bold text-xs"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span>🎙️</span>
                                                    <span>Recording & AI (17-24)</span>
                                                    <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                        {filteredElements.filter(el => el.category === 'Recording & AI Agents').length}
                                                    </span>
                                                </div>
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${isRecordingExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isRecordingExpanded && (
                                                <div className="p-2.5 bg-[#0b1329] grid grid-cols-2 gap-2 animate-fade-in">
                                                    {filteredElements.filter(el => el.category === 'Recording & AI Agents').map((el) => {
                                                        const absoluteIndex = sidebarElements.findIndex(s => s.label === el.label) + 1;
                                                        return (
                                                            <div
                                                                key={el.label}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, el)}
                                                                onClick={() => handleAddElement(el)}
                                                                className="flex flex-col items-center justify-center p-2.5 bg-[#0e1936] border border-slate-800 rounded-2xl hover:border-white/40 hover:bg-white/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                                title="Drag onto canvas or click to append"
                                                            >
                                                                <div className="p-2 bg-white/10 text-white rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                                    <el.icon size={16} />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors leading-tight">
                                                                    {absoluteIndex}. {el.label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {filteredElements.filter(el => el.category === 'Recording & AI Agents').length === 0 && (
                                                        <div className="col-span-2 text-center py-4 text-xs text-slate-500 font-medium">No matches</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. Advanced Fields */}
                                    {hasActivityControl('advanceElements') !== false && (
                                        <div className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-[#0b1329]">
                                            <button
                                                type="button"
                                                onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                                                className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60 transition-all font-bold text-xs"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span>⚡</span>
                                                    <span>Advanced Fields</span>
                                                    <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                        {filteredElements.filter(el => el.category === 'Advanced Fields').length}
                                                    </span>
                                                </div>
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${isAdvancedExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isAdvancedExpanded && (
                                                <div className="p-2.5 bg-[#0b1329] grid grid-cols-2 gap-2 animate-fade-in">
                                                    {filteredElements.filter(el => el.category === 'Advanced Fields').map((el) => (
                                                        <div
                                                            key={el.label}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, el)}
                                                            onClick={() => handleAddElement(el)}
                                                            className="flex flex-col items-center justify-center p-2.5 bg-[#0e1936] border border-slate-800 rounded-2xl hover:border-white/40 hover:bg-white/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                            title="Drag onto canvas or click to append"
                                                        >
                                                            <div className="p-2 bg-white/10 text-white rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                                <el.icon size={16} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors leading-tight">
                                                                {el.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {filteredElements.filter(el => el.category === 'Advanced Fields').length === 0 && (
                                                        <div className="col-span-2 text-center py-4 text-xs text-slate-500 font-medium">No matches</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Addons Tab Render
                                <div className="space-y-4">
                                    <div className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-[#0b1329]">
                                        <button
                                            type="button"
                                            onClick={() => setIsAnalyticalWidgetsExpanded(!isAnalyticalWidgetsExpanded)}
                                            className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 text-slate-200 hover:bg-slate-900/60 transition-all font-bold text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <PieChart size={16} className="text-white" />
                                                <span>Analytical Widgets</span>
                                                <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full font-extrabold ml-1 animate-pulse">
                                                    {filteredAddons.length}
                                                </span>
                                            </div>
                                            <ChevronDown size={16} className={`transition-transform duration-300 ${isAnalyticalWidgetsExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isAnalyticalWidgetsExpanded && (
                                            <div className="p-3 bg-[#0b1329] grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto custom-scrollbar animate-fade-in">
                                                {filteredAddons.map((addon, idx) => (
                                                    <div
                                                        key={idx}
                                                        draggable
                                                        onDragStart={(e) => handleAddonDragStart(e, addon)}
                                                        onClick={() => toast.success(`${addon.label} activated! Drag it to Addons Container.`)}
                                                        className="flex flex-col items-center justify-center p-3.5 bg-[#0e1936] border border-slate-800 rounded-2xl hover:border-white/40 hover:bg-white/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                        title="Drag onto Addons Container or window"
                                                    >
                                                        <div className="p-2.5 bg-white/10 text-white rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                            <addon.icon size={18} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors leading-tight">{addon.label}</span>
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
                    <div className="h-12 bg-blue-100 border-b text-black border-slate-200 px-6 flex items-center">
                        {/* Left spacer — balances Save button width on right */}
                        <div className="flex-1" />

                        {/* Center: toolbar buttons */}
                        <div className="flex items-center gap-6">
                            {hasActivityControl('theme') !== false && (
                                <button
                                    onClick={() => toast("Purple Accent Theme active. More templates coming soon!", { icon: '🎨' })}
                                    className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0b1329] transition-colors uppercase tracking-wider"
                                >
                                    <Palette size={14} className="text-[#0b1329]" />
                                    <span>Theme</span>
                                </button>
                            )}

                            {hasActivityControl('createWithAi') !== false && (
                                <button
                                    onClick={handleAiGenerateForm}
                                    className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0b1329] transition-colors uppercase tracking-wider"
                                >
                                    <Bot size={14} className="text-[#0b1329]" />
                                    <span>Create with AI</span>
                                </button>
                            )}

                            {hasActivityControl('integrate') !== false && (
                                <button
                                    onClick={() => toast("Integration settings opened: copy link or embed iframe script.", { icon: '🔗' })}
                                    className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0b1329] transition-colors uppercase tracking-wider"
                                >
                                    <Link size={14} className="text-[#0b1329]" />
                                    <span>Integrate</span>
                                </button>
                            )}

                            {hasActivityControl('import') !== false && (
                                <>
                                    <input
                                        type="file"
                                        ref={importFileInputRef}
                                        onChange={handleImportForm}
                                        accept=".json"
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        onClick={() => importFileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0b1329] transition-colors uppercase tracking-wider"
                                    >
                                        <FolderUp size={14} className="text-[#0b1329]" />
                                        <span>Import</span>
                                    </button>
                                </>
                            )}

                            {hasActivityControl('saveAsTemplate') !== false && (
                                <button
                                    onClick={() => {
                                        setTemplateMeta({
                                            name: connectData?.name || 'Untitled Template',
                                            type: 'form',
                                            target: 'site'
                                        });
                                        setIsSaveTemplateModalOpen(true);
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0b1329] transition-colors uppercase tracking-wider"
                                >
                                    <Save size={14} className="text-[#0b1329]" />
                                    <span>Save as Template</span>
                                </button>
                            )}
                        </div>

                        {/* Right: Quick Save Button */}
                        <div className="flex-1 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving || publishing}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0b1329] hover:bg-[#1a2a4a] text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={13} />
                                        <span>Save</span>
                                    </>
                                )}
                            </button>
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
                                                    <ArrowLeft size={44} className="text-[#0b1329]" strokeWidth={3} />
                                                </div>

                                                <div className="w-16 h-16 bg-slate-100 text-[#0b1329] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md shadow-slate-100">
                                                    <Sparkles size={32} />
                                                </div>

                                                <h3 className="text-2xl font-extrabold text-slate-800 mb-3">Drag Elements Here</h3>
                                                <p className="text-slate-500 text-sm leading-relaxed mb-8 px-4">
                                                    Build your form by dragging elements from the sidebar or click on them. Customize labels, options, validation and more.
                                                </p>

                                                <button
                                                    onClick={handleAiGenerateForm}
                                                    className="flex items-center gap-2 px-6 py-3 bg-[#0b1329] hover:bg-[#152244] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#0b1329]/20 hover:shadow-[#0b1329]/30 mx-auto active:scale-95 transition-all"
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
                                                            onAddonClick={() => setSidebarTab('Elements/Addons')}
                                                            onOpenAiGenerator={() => {
                                                                setAiGeneratorTargetIndex(originalIndex);
                                                                let defaultType = 'Multiple Choice';
                                                                if (['Multiple Choice', 'Multiple choices', 'Checkboxes', 'Checkbox', 'Dropdown'].includes(el.label)) {
                                                                    defaultType = 'Multiple Choice';
                                                                } else if (['Short Answer', 'Short question'].includes(el.label)) {
                                                                    defaultType = 'Short Answer';
                                                                } else if (['Paragraph', 'ParagraphAnswer'].includes(el.label)) {
                                                                    defaultType = 'Paragraph';
                                                                } else if (['True/False', 'True/false'].includes(el.label)) {
                                                                    defaultType = 'True/False';
                                                                } else if (['Fill in the Blanks', 'Fill in the Blank'].includes(el.label)) {
                                                                    defaultType = 'Fill in the Blanks';
                                                                }
                                                                setAiChatMessages(prev => [
                                                                    ...prev,
                                                                    {
                                                                        sender: 'ai',
                                                                        text: `I see you want to generate questions near a "${defaultType}" question. Tell me what topic you want questions on, how many, and what type (e.g. MCQ, Short Answer), and I will generate them for you!`
                                                                    }
                                                                ]);
                                                                setIsAiGeneratorOpen(true);
                                                            }}
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
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#0b1329] outline-none text-sm shadow-sm transition-all"
                                                            />
                                                        )}

                                                        {(el.label === 'Paragraph' || el.label === 'Paragraph Answer') && (
                                                            <textarea
                                                                placeholder="Your long-form answer..."
                                                                rows={3}
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#0b1329] outline-none text-sm shadow-sm transition-all resize-none"
                                                            ></textarea>
                                                        )}

                                                        {(el.label === 'Multiple Choice' || el.label === 'Multiple choices') && (
                                                            <div className="space-y-2.5 mt-2">
                                                                {(el.options && el.options.length > 0 ? el.options : [{ text: 'Option 1' }, { text: 'Option 2' }]).map((opt, oIdx) => (
                                                                    <label key={oIdx} className="flex items-center gap-3 cursor-pointer group">
                                                                        <input
                                                                            type="radio"
                                                                            name={`mc-${index}`}
                                                                            className="w-4.5 h-4.5 text-[#0b1329] focus:ring-[#0b1329]/20 border-slate-300"
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
                                                                            className="rounded text-[#0b1329] focus:ring-[#0b1329]/20 border-slate-300 w-4.5 h-4.5"
                                                                        />
                                                                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{opt.text}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {el.label === 'Dropdown' && (
                                                            <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#0b1329] outline-none text-sm shadow-sm transition-all">
                                                                <option value="">Select option...</option>
                                                                {(el.options && el.options.length > 0 ? el.options : [{ text: 'Option 1' }, { text: 'Option 2' }]).map((opt, oIdx) => (
                                                                    <option key={oIdx} value={opt.text}>{opt.text}</option>
                                                                ))}
                                                            </select>
                                                        )}

                                                        {(el.label === 'File Upload' || el.label === 'File upload') && (
                                                            <div className="border border-slate-200 rounded-xl p-4 bg-white flex items-center gap-3">
                                                                <button type="button" className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-[#0b1329] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
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
                                                                <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0b1329] shadow-sm" />
                                                                <input type="time" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0b1329] shadow-sm" />
                                                            </div>
                                                        )}
                                                        {(el.label === 'Voice Rec' || el.label === 'Voice recording') && (
                                                            <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                                                                <button type="button" className="w-10 h-10 rounded-full bg-slate-100 text-[#0b1329] flex items-center justify-center hover:bg-slate-100 transition-colors">
                                                                    <Mic size={18} />
                                                                </button>
                                                                <span className="text-xs font-semibold text-slate-500">Click to record voice response</span>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Video Rec' || el.label === 'Video recording') && (
                                                            <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                                                                <button type="button" className="w-10 h-10 rounded-full bg-slate-100 text-[#0b1329] flex items-center justify-center hover:bg-slate-100 transition-colors">
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
                                                            <div
                                                                className="mt-2 relative mx-auto group/video rounded-2xl border border-slate-800 bg-black flex items-center justify-center transition-shadow hover:shadow-lg"
                                                                style={{ width: `${el.videoWidth || 500}px`, maxWidth: '100%' }}
                                                            >
                                                                <video
                                                                    src={el.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'}
                                                                    controls
                                                                    autoPlay={!!el.autoplay}
                                                                    loop={!!el.loop}
                                                                    className="w-full rounded-2xl object-contain bg-black pointer-events-auto"
                                                                />

                                                                {/* Resize handles at four corners */}
                                                                <div
                                                                    onMouseDown={(e) => handleVideoResizeStart(e, index, 'top-left')}
                                                                    className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                    title="Resize video"
                                                                />
                                                                <div
                                                                    onMouseDown={(e) => handleVideoResizeStart(e, index, 'top-right')}
                                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                    title="Resize video"
                                                                />
                                                                <div
                                                                    onMouseDown={(e) => handleVideoResizeStart(e, index, 'bottom-left')}
                                                                    className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                    title="Resize video"
                                                                />
                                                                <div
                                                                    onMouseDown={(e) => handleVideoResizeStart(e, index, 'bottom-right')}
                                                                    className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                    title="Resize video"
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
                                                                    className="px-4 py-2 bg-[#0b1329] hover:bg-[#0b1329] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-200"
                                                                >
                                                                    View Document
                                                                </a>
                                                            </div>
                                                        )}

                                                        {(el.label === 'YouTube' || el.label === 'Embedded Video Displaying') && (
                                                            <div
                                                                className="mt-2 relative mx-auto group/video rounded-2xl border border-slate-200 shadow-md aspect-video bg-black flex items-center justify-center transition-shadow hover:shadow-lg"
                                                                style={{ width: `${el.videoWidth || 500}px`, maxWidth: '100%' }}
                                                            >
                                                                {el.youtubeUrl || el.embeddedVideoUrl ? (
                                                                    <>
                                                                        <iframe
                                                                            src={getEmbedUrl(el.embeddedVideoUrl || el.youtubeUrl)}
                                                                            title="YouTube Video"
                                                                            className="w-full h-full border-0 rounded-2xl pointer-events-auto"
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                        ></iframe>

                                                                        {/* Resize handles at four corners */}
                                                                        <div
                                                                            onMouseDown={(e) => handleVideoResizeStart(e, index, 'top-left')}
                                                                            className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                            title="Resize video"
                                                                        />
                                                                        <div
                                                                            onMouseDown={(e) => handleVideoResizeStart(e, index, 'top-right')}
                                                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                            title="Resize video"
                                                                        />
                                                                        <div
                                                                            onMouseDown={(e) => handleVideoResizeStart(e, index, 'bottom-left')}
                                                                            className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                            title="Resize video"
                                                                        />
                                                                        <div
                                                                            onMouseDown={(e) => handleVideoResizeStart(e, index, 'bottom-right')}
                                                                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                                                                            title="Resize video"
                                                                        />

                                                                        {/* Drag Helper Label */}
                                                                        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-[9px] font-black text-white px-2 py-1 rounded-lg uppercase tracking-wider opacity-0 group-hover/video:opacity-100 transition-opacity pointer-events-none select-none z-10 shadow-sm border border-white/10">
                                                                            Drag corners to resize
                                                                        </div>
                                                                    </>
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
                                                                            <Globe size={10} className="text-[#0b1329]" />
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
                                                                        <Globe size={32} className="mx-auto mb-2 text-slate-400" />
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
                                                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/20 text-center space-y-2">
                                                                <div className="p-3 bg-white text-[#0b1329] rounded-full border border-slate-200 inline-block">
                                                                    <Files size={20} />
                                                                </div>
                                                                <div>
                                                                    <button type="button" className="px-4 py-2 bg-[#0b1329] text-white text-xs font-bold rounded-lg shadow-sm mx-auto">
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
                                                                <div className="w-14 h-14 bg-slate-100 text-[#0b1329] rounded-2xl flex items-center justify-center">
                                                                    <Camera size={28} />
                                                                </div>
                                                                <div>
                                                                    <span className="text-sm font-bold text-slate-700 block">Capture Screenshot ({el.screenshotScope || 'Entire Screen'})</span>
                                                                    <span className="text-xs text-slate-400 mt-1 block">Take a screenshot of the specified frame and upload</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toast.success("Screenshot saved successfully!", { icon: '📸' })}
                                                                    className="px-6 py-2.5 bg-[#0b1329] hover:bg-[#0b1329] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
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
                                                                    <div className="p-3 bg-slate-1000/10 border border-[#0b1329]/30 text-slate-400 rounded-xl">
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
                                                                    className="w-full py-2.5 bg-[#0b1329] hover:bg-[#0b1329] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                                                >
                                                                    <Video size={14} /> Establish Video Connection ({el.videoCallDuration || 5} min)
                                                                </button>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Audio Listening' || el.label === 'Audio listening Displaying') && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col gap-4 text-left">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-slate-100 text-[#0b1329] rounded-xl">
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
                                                                        <label key={oIdx} className="flex items-center gap-3 cursor-pointer group bg-white p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                                                                            <input
                                                                                type="radio"
                                                                                name={`listening-mc-${index}`}
                                                                                className="w-4.5 h-4.5 text-[#0b1329] focus:ring-[#0b1329]/20 border-slate-300"
                                                                            />
                                                                            <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors font-medium">{opt.text}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Text Chat AI' || el.label === 'Text based AI agent') && (
                                                            <div className="mt-2 border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm flex flex-col h-80">
                                                                <div className="bg-[#0b1329] p-4 flex items-center justify-between text-white">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                                            <Bot size={18} />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-extrabold">{el.agentName || 'AI Assistant'}</span>
                                                                            <span className="text-[10px] text-slate-300 flex items-center gap-1 font-semibold">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[10px] uppercase font-bold bg-white/10 px-2 py-0.5 rounded-full">AI Roleplay</span>
                                                                </div>
                                                                <div className="flex-1 p-4 bg-slate-50/50 overflow-y-auto space-y-3 text-xs custom-scrollbar">
                                                                    <div className="flex gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-[#0b1329] flex items-center justify-center shrink-0 font-bold text-[10px]">AI</div>
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
                                                                        className="px-4 bg-[#0b1329] hover:bg-[#0b1329] text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                                                    >
                                                                        Send
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(el.label === 'Voice Chat AI' || el.label === 'Voice based AI Agent') && (
                                                            <div className="mt-2 border border-slate-200 rounded-3xl p-6 bg-slate-900 text-white flex flex-col items-center justify-center gap-6 min-h-60 relative overflow-hidden">
                                                                <div className="absolute top-4 right-4 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">Voice Call Sim</div>

                                                                <div className="w-16 h-16 bg-slate-1000/10 border border-[#0b1329]/30 text-slate-400 rounded-full flex items-center justify-center animate-pulse">
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
                                                                            className="w-0.75 bg-[#0b1329] rounded-full transition-all duration-300"
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
                                                                    className="px-6 py-2.5 bg-[#0b1329] hover:bg-[#0b1329] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#0b1329]/20 flex items-center gap-2"
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
                                                    className="w-full py-3.5 bg-[#0b1329] hover:bg-[#0b1329] text-white rounded-2xl font-bold shadow-lg shadow-[#0b1329]/20 active:scale-95 transition-all text-sm"
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
                                            <span className="text-3xl font-extrabold text-[#0b1329]">124</span>
                                            <span className="text-xs text-green-500 font-semibold">+12% from last week</span>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Completion Rate</span>
                                            <span className="text-3xl font-extrabold text-[#0b1329]">94.2%</span>
                                            <span className="text-xs text-slate-400 font-medium">Average time: 4m 32s</span>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Dropoff Rate</span>
                                            <span className="text-3xl font-extrabold text-[#0b1329]">5.8%</span>
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
                                    
                                    {historyLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                                            <Loader2 className="animate-spin w-8 h-8" />
                                            <span className="text-sm font-semibold">Loading version history...</span>
                                        </div>
                                    ) : !id ? (
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm text-center">
                                            <p className="text-sm text-slate-500 font-semibold">Save or Publish this activity first to start tracking version history.</p>
                                        </div>
                                    ) : historyData.length === 0 ? (
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm text-center">
                                            <p className="text-sm text-slate-500 font-semibold">No version updates recorded yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                            {historyData.map((item, idx) => {
                                                const versionNumber = historyData.length - idx;
                                                const formattedDate = new Date(item.createdAt).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short'
                                                });
                                                return (
                                                    <div key={item._id || idx} className="flex gap-6 relative items-start">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md z-10 ${
                                                            idx === 0 ? 'bg-[#0b1329] shadow-slate-200' : 'bg-slate-400'
                                                        }`}>
                                                            V{versionNumber}
                                                        </div>
                                                        <div className="flex-1 bg-white p-4 border border-slate-200/50 rounded-2xl shadow-sm space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[11px] font-bold text-slate-450">{formattedDate}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-5 h-5 rounded-full bg-slate-100 text-[#0b1329] flex items-center justify-center font-bold text-[9px] uppercase border border-slate-200">
                                                                        {(item.userName || 'U')[0]}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-[#0b1329]">
                                                                        {item.userName || 'Unknown'} 
                                                                        <span className="text-[10px] text-slate-400 font-semibold ml-1">({item.userRole || 'Admin'})</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-semibold text-slate-700 leading-snug">{item.description}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
                                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#0b1329] focus:ring-2 focus:ring-slate-100 transition-all"
                                            />
                                            <button
                                                onClick={() => toast.success("Invitation sent successfully!")}
                                                className="px-5 py-2.5 bg-[#0b1329] hover:bg-[#0b1329] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-200 active:scale-95"
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
                                                    <div className="w-8 h-8 rounded-full bg-[#0b1329] text-white font-bold text-xs flex items-center justify-center shadow-sm">
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
                                                    <div className="w-8 h-8 rounded-full bg-slate-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
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
                                {hasActivityControl('decideActivity') !== false && (
                                    <div className="absolute left-6 flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setIsDiscussionModalOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-350 rounded-xl shadow-sm transition-all whitespace-nowrap"
                                        >
                                            <MessageSquare size={14} className="text-[#0b1329]" />
                                            <span>Decide Activity</span>
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleAddPage}
                                        className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                                    >
                                        <Plus size={16} />
                                        <span>Add Page</span>
                                    </button>
                                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 items-center">
                                        <button className="px-3.5 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                                            <Settings size={12} className="text-[#0b1329]" />
                                            <span>Page 1</span>
                                        </button>
                                        {hasActivityControl('logicRules') !== false && (
                                            <button
                                                onClick={() => toast("Conditional Logic: configure rules to jump to pages.")}
                                                className="px-3.5 py-1.5 text-slate-500 text-xs font-bold hover:text-slate-800 flex items-center gap-1.5 rounded-lg transition-all whitespace-nowrap"
                                            >
                                                <Hash size={12} />
                                                <span>Logic Rules</span>
                                            </button>
                                        )}
                                        {hasActivityControl('templates') !== false && (
                                            <button
                                                onClick={() => {
                                                    setBrowseTab('site');
                                                    setIsTemplatesBrowseOpen(true);
                                                }}
                                                className="px-3.5 py-1.5 text-slate-500 text-xs font-bold hover:text-slate-800 flex items-center gap-1.5 rounded-lg transition-all whitespace-nowrap"
                                            >
                                                <Layout size={12} />
                                                <span>Templates</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Location Locked + Monitoring */}
                                <div className="absolute right-6 flex items-center gap-2">
                                    {/* Location Locked Button + Toggle */}
                                    {hasActivityControl('locationLocked') !== false && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl shadow-sm transition-all">
                                            <MapPin size={13} className={locationLockedEnabled ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
                                            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Location Locked</span>
                                            {/* Toggle Switch */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLocationLockedEnabled(prev => !prev);
                                                    toast(locationLockedEnabled ? 'Location Lock disabled' : 'Location Lock enabled — students must be at the designated location.');
                                                }}
                                                className="w-8 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 flex items-center focus:outline-none"
                                                style={{ backgroundColor: locationLockedEnabled ? '#f43f5e' : '#cbd5e1' }}
                                                title={locationLockedEnabled ? 'Location Lock ON' : 'Location Lock OFF'}
                                            >
                                                <div
                                                    className="w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200"
                                                    style={{ transform: locationLockedEnabled ? 'translateX(16px)' : 'translateX(0px)' }}
                                                />
                                            </button>
                                        </div>
                                    )}

                                    {hasActivityControl('locationLocked') !== false && hasActivityControl('monitoring') !== false && (
                                        <div className="w-px h-4 bg-slate-200" />
                                    )}

                                    {/* Monitoring Button + Toggle */}
                                    {hasActivityControl('monitoring') !== false && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl shadow-sm transition-all">
                                            <Shield size={13} className={monitoringEnabled ? 'text-emerald-500' : 'text-slate-400'} />
                                            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Monitoring</span>
                                            {/* Toggle Switch */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMonitoringEnabled(prev => !prev);
                                                    toast(monitoringEnabled ? 'Monitoring disabled' : 'Monitoring enabled — student activity will be tracked.');
                                                }}
                                                className="w-8 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 flex items-center focus:outline-none"
                                                style={{ backgroundColor: monitoringEnabled ? '#10b981' : '#cbd5e1' }}
                                                title={monitoringEnabled ? 'Monitoring ON' : 'Monitoring OFF'}
                                            >
                                                <div
                                                    className="w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200"
                                                    style={{ transform: monitoringEnabled ? 'translateX(16px)' : 'translateX(0px)' }}
                                                />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Floating Counter Badge */}
                        <div className="absolute bottom-16 right-4 z-30">
                            <button
                                onClick={() => toast(`Form is composed of ${formElements.length} custom Elements.`)}
                                className="bg-[#0b1329] hover:bg-[#0b1329] text-white px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
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
                .rich-text-editor a {
                    color: #2563eb !important;
                    text-decoration: underline !important;
                    cursor: pointer !important;
                }
            `}</style>

                <ConnectItModal
                    isOpen={isConnectModalOpen}
                    onClose={() => setIsConnectModalOpen(false)}
                    onSave={handleConnectSave}
                    initialData={connectData}
                    disabledFields={{
                        institute: searchParams.get('locked') === 'true' || searchParams.get('institute') ? true : false,
                        course: searchParams.get('locked') === 'true' || searchParams.get('course') ? true : false,
                        subject: searchParams.get('locked') === 'true' || searchParams.get('subject') ? true : false,
                        index: searchParams.get('locked') === 'true' || searchParams.get('inbox') ? true : false
                    }}
                />

                {isDescriptionModalOpen && (
                    <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
                        <div className="bg-white w-full max-w-lg rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                    <FileText size={18} className="text-[#0b1329]" />
                                    <span>Test Description</span>
                                </h3>
                                <button
                                    onClick={() => setIsDescriptionModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-150 rounded-full text-slate-400 hover:text-slate-650 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <p className="text-xs font-semibold text-slate-500">
                                    Provide a description for this test. This will be shown to students before they start and will be visible in the Relevant Information popup.
                                </p>
                                <textarea
                                    value={tempDescription}
                                    onChange={(e) => setTempDescription(e.target.value)}
                                    placeholder="Enter a description for this test..."
                                    rows={6}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans font-bold resize-none"
                                />
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button
                                    onClick={() => setIsDescriptionModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 font-bold border border-slate-200 rounded-xl hover:bg-white transition-all text-xs active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setIsDescriptionModalOpen(false);
                                        const updatedData = {
                                            ...connectData,
                                            description: tempDescription
                                        };
                                        setConnectData(updatedData);

                                        // If this test is already saved, sync it to the backend immediately
                                        if (id) {
                                            try {
                                                setSaving(true);
                                                const currentMode = publishModeSelected || 'connected';
                                                const payload = {
                                                    testDetails: {
                                                        title: connectData.name,
                                                        description: tempDescription,
                                                        institute: connectData.institute || user?.institute?.name || (typeof user?.institute === 'string' ? user.institute : 'Default Institute'),
                                                        course: connectData.course || '',
                                                        subject: connectData.subject || '',
                                                        date: connectData.date || new Date().toISOString().split('T')[0],
                                                        index: connectData.index || 'Inbox 1',
                                                        activity: connectData.activity || 'Quiz',
                                                        publishMode: currentMode,
                                                        discussionActivity: discussionActivity,
                                                        assignmentType: 'all',
                                                        assignedStudents: [],
                                                        allowTeacherEdit: allowTeacherEdit,
                                                        isAssigned: connectData.isAssigned || false
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
                                                        tableData: el.tableData || null,
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
                                                        videoWidth: el.videoWidth || 500,
                                                        htmlContent: el.htmlContent || '',
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
                                                        duration: Number(connectData.duration) || 60,
                                                        passingMarks: Number(connectData.passingMarks) || 40
                                                    }
                                                };
                                                await axios.put(`/api/tests/${id}`, payload);
                                                toast.success("Description updated and synced to database! ✓");
                                            } catch (error) {
                                                console.error("Error auto-saving description:", error);
                                                toast.error("Failed to sync description to database.");
                                            } finally {
                                                setSaving(false);
                                            }
                                        } else {
                                            toast.success("Description saved successfully! Make sure to Save or Publish.");
                                        }
                                    }}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all text-xs active:scale-95"
                                >
                                    Save Description
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                    studentId={searchParams.get('studentId')}
                    connectData={connectData}
                    initialAllowTeacherEdit={allowTeacherEdit}
                />

                <PublishSuccessModal
                    isOpen={!!publishSuccessInfo}
                    onClose={() => {
                        setPublishSuccessInfo(null);
                        const redirectPath = (searchParams.get('studentId') || user?.role === 'Teacher')
                            ? '/teacher/activities'
                            : (user?.role === 'Editor' ? '/editor' : user?.role === 'Institute' ? '/institute/activities' : '/admin/activities');
                        
                        if (redirectPath !== '/teacher/activities') {
                            const inst = connectData?.institute || user?.institute?.name || (typeof user?.institute === 'string' ? user.institute : 'Default Institute');
                            const crs = connectData?.course || '';
                            const subj = connectData?.subject || '';
                            const inbox = connectData?.index || 'Inbox 1';
                            const testId = publishSuccessInfo?.testId || '';
                            navigate(`${redirectPath}?exp_inst=${encodeURIComponent(inst)}&exp_course=${encodeURIComponent(crs)}&exp_subject=${encodeURIComponent(subj)}&exp_inbox=${encodeURIComponent(inbox)}&highlightTestId=${testId}`);
                        } else {
                            navigate(redirectPath);
                        }
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
                                    <MessageSquare size={20} className="text-[#0b1329]" />
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
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0b1329] outline-none text-sm font-semibold transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Activity Link (URL)</label>
                                    <input
                                        type="url"
                                        value={discussionActivity?.activityLink || ''}
                                        onChange={(e) => setDiscussionActivity(prev => ({ ...prev, activityLink: e.target.value }))}
                                        placeholder="https://example.com/discussion"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0b1329] outline-none text-sm font-semibold transition-all"
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
                                    className="px-5 py-2 bg-[#0b1329] hover:bg-[#152244] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#0b1329]/15"
                                >
                                    Save Activity
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Save as Template Modal */}
                {isSaveTemplateModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-6 border border-slate-100 flex flex-col gap-4 animate-scale-up">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                    <Save size={16} className="text-indigo-650" />
                                    <span>Save as Template</span>
                                </h3>
                                <button
                                    onClick={() => setIsSaveTemplateModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-655 transition-all focus:outline-none"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Template Name</label>
                                    <input
                                        type="text"
                                        value={templateMeta.name}
                                        onChange={(e) => setTemplateMeta(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. Admission Form"
                                        className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0b1329] outline-none text-sm font-semibold transition-all text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Template Type</label>
                                    <select
                                        value={templateMeta.type}
                                        onChange={(e) => setTemplateMeta(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0b1329] outline-none text-sm font-semibold transition-all text-slate-800"
                                    >
                                        <option value="form">Form (Complete layout)</option>
                                        <option value="section">Section (Group of questions)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Where to Save?</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setTemplateMeta(prev => ({ ...prev, target: 'site' }))}
                                            className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-center ${templateMeta.target === 'site'
                                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-extrabold ring-1 ring-indigo-600'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <span className="text-xs font-bold">Save as Site</span>
                                            <span className="text-[10px] text-slate-450 leading-tight">Save privately to your profile dashboard</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTemplateMeta(prev => ({ ...prev, target: 'cloud' }))}
                                            className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-center ${templateMeta.target === 'cloud'
                                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-extrabold ring-1 ring-indigo-600'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <span className="text-xs font-bold">Save as Cloud</span>
                                            <span className="text-[10px] text-slate-450 leading-tight">Save publicly under public template store</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSaveTemplateModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAsTemplate}
                                    className="px-5 py-2 bg-[#0b1329] hover:bg-[#152244] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#0b1329]/15"
                                >
                                    Save Template
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Browse Templates Modal */}
                {isTemplatesBrowseOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl p-6 border border-slate-100 flex flex-col gap-4 animate-scale-up max-h-[85vh]">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                    <LayoutTemplate size={18} className="text-indigo-650" />
                                    <span>Browse Templates</span>
                                </h3>
                                <button
                                    onClick={() => setIsTemplatesBrowseOpen(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-655 transition-all focus:outline-none"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Library Sub Header */}
                            <div className="flex items-center gap-6 border-b border-slate-200 pb-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveLibraryHeaderTab('Section')}
                                    className={`${activeLibraryHeaderTab === 'Section'
                                        ? 'text-indigo-650 font-black border-b-2 border-indigo-650 pb-2 px-1'
                                        : 'text-slate-400 font-extrabold pb-2 px-1 hover:text-slate-650'} text-xs focus:outline-none transition-all`}
                                >
                                    Section
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveLibraryHeaderTab('Form')}
                                    className={`${activeLibraryHeaderTab === 'Form'
                                        ? 'text-indigo-650 font-black border-b-2 border-indigo-650 pb-2 px-1'
                                        : 'text-slate-400 font-extrabold pb-2 px-1 hover:text-slate-650'} text-xs focus:outline-none transition-all`}
                                >
                                    Form
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveLibraryHeaderTab('Templates')}
                                    className={`${activeLibraryHeaderTab === 'Templates'
                                        ? 'text-indigo-650 font-black border-b-2 border-indigo-650 pb-2 px-1'
                                        : 'text-slate-400 font-extrabold pb-2 px-1 hover:text-slate-650'} text-xs focus:outline-none transition-all`}
                                >
                                    Templates
                                </button>
                            </div>

                            {/* Tab Pills Selection */}
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBrowseTab('site')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-extrabold border transition-all ${browseTab === 'site'
                                            ? 'bg-slate-100 border-slate-350 text-slate-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55'}`}
                                    >
                                        <FolderUp size={12} />
                                        <span>Site templates</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBrowseTab('cloud')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-extrabold border transition-all ${browseTab === 'cloud'
                                            ? 'bg-slate-100 border-slate-350 text-slate-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55'}`}
                                    >
                                        <Globe size={12} />
                                        <span>Cloud templates</span>
                                        <span className="text-[8px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded border border-indigo-100 scale-90 origin-left">Pro</span>
                                    </button>

                                    <input
                                        type="file"
                                        id="template-import-file-input"
                                        accept=".json"
                                        onChange={handleImportTemplates}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('template-import-file-input')?.click()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-extrabold shadow-sm transition-all focus:outline-none ml-2"
                                    >
                                        <Upload size={12} />
                                        <span>Import Template</span>
                                    </button>
                                </div>

                                {/* Search display */}
                                <div className="relative flex items-center">
                                    <Search size={12} className="absolute left-3 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search templates..."
                                        value={templateSearchQuery}
                                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                        className="pl-8 pr-8 py-1.5 w-60 bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0b1329] outline-none text-xs font-bold text-slate-800 transition-all placeholder-slate-400"
                                    />
                                    {templateSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setTemplateSearchQuery('')}
                                            className="absolute right-2.5 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all focus:outline-none"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Table area */}
                            <div className="flex-1 overflow-y-auto min-h-[320px] max-h-[50vh] pr-1 custom-scrollbar mt-2">
                                {(() => {
                                    const currentTemplates = (browseTab === 'site' ? siteTemplates : cloudTemplates).filter(tpl => {
                                        // 1. Tab filter
                                        if (activeLibraryHeaderTab === 'Form' && tpl.type !== 'Form') return false;
                                        if (activeLibraryHeaderTab === 'Section' && tpl.type !== 'Section') return false;

                                        // 2. Search query filter
                                        if (templateSearchQuery.trim()) {
                                            const query = templateSearchQuery.toLowerCase().trim();
                                            return (
                                                tpl.name.toLowerCase().includes(query) ||
                                                (tpl.createdBy && tpl.createdBy.toLowerCase().includes(query)) ||
                                                (tpl.type && tpl.type.toLowerCase().includes(query))
                                            );
                                        }
                                        return true;
                                    });
                                    if (currentTemplates.length === 0) {
                                        return (
                                            <div className="text-center py-16 text-slate-400 text-xs italic font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                {templateSearchQuery.trim() ? (
                                                    <span>No matching results found for "{templateSearchQuery}".</span>
                                                ) : (
                                                    <span>
                                                        {browseTab === 'site'
                                                            ? `No ${activeLibraryHeaderTab.toLowerCase()} templates saved yet in your profile.`
                                                            : `No public cloud ${activeLibraryHeaderTab.toLowerCase()} templates available.`}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                                <thead>
                                                    <tr className="border-b border-slate-250 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                        <th className="py-2.5 px-4 font-black">Name</th>
                                                        <th className="py-2.5 px-4 font-black">Type</th>
                                                        <th className="py-2.5 px-4 font-black">Created By</th>
                                                        <th className="py-2.5 px-4 font-black">Creation Date</th>
                                                        <th className="py-2.5 px-4 font-black text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {currentTemplates.map((tpl, index) => (
                                                        <tr key={tpl.id} className="hover:bg-slate-50/70 transition-colors group">
                                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                                {index + 1}. {tpl.name}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-550 font-semibold">
                                                                {tpl.type}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-500 font-semibold">
                                                                {tpl.createdBy}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-450 font-semibold">
                                                                {tpl.creationDate}
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <div className="flex items-center justify-end gap-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setPreviewTemplate(tpl);
                                                                        }}
                                                                        className="text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 transition-colors focus:outline-none"
                                                                    >
                                                                        <Eye size={12} />
                                                                        <span>Preview</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleExportSingleTemplate(tpl)}
                                                                        className="text-slate-500 hover:text-green-600 font-extrabold flex items-center gap-1 transition-colors focus:outline-none"
                                                                        title="Export Template"
                                                                    >
                                                                        <Download size={12} />
                                                                        <span>Export</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectTemplate(tpl)}
                                                                        className="text-indigo-650 hover:text-indigo-750 font-extrabold flex items-center gap-1 transition-colors focus:outline-none"
                                                                    >
                                                                        <FolderUp size={12} />
                                                                        <span>Insert</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (browseTab === 'site') {
                                                                                setSiteTemplates(prev => prev.filter(t => t.id !== tpl.id));
                                                                            } else {
                                                                                setCloudTemplates(prev => prev.filter(t => t.id !== tpl.id));
                                                                            }
                                                                            toast.success("Template deleted");
                                                                        }}
                                                                        className="text-slate-350 hover:text-rose-600 transition-colors focus:outline-none"
                                                                        title="Delete Template"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsTemplatesBrowseOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {previewTemplate && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 font-sans animate-fade-in animate-scale-up">
                        <div className="bg-white rounded-[30px] max-w-2xl w-full shadow-2xl p-6 border border-slate-100 flex flex-col gap-4 max-h-[80vh]">
                            {/* Header */}
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 bg-white">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                        <Eye size={18} className="text-indigo-655" />
                                        <span>Template Preview: {previewTemplate.name}</span>
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                        Type: <span className="text-indigo-600 font-black">{previewTemplate.type}</span> | Created By: <span className="text-slate-600 font-black">{previewTemplate.createdBy}</span> | Date: {previewTemplate.creationDate}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Questions Content */}
                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 py-2 text-xs">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Questions / Form Elements ({previewTemplate.elements?.length || 0})</span>
                                {previewTemplate.elements && previewTemplate.elements.length > 0 ? (
                                    previewTemplate.elements.map((el, i) => (
                                        <div key={i} className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-2">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                                                        {i + 1}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                        {el.label || el.type}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded-md font-bold text-slate-600">
                                                    {el.marks !== undefined ? el.marks : 1} Marks
                                                </span>
                                            </div>
                                            <p className="font-bold text-slate-800 text-sm mt-1">
                                                {el.text || `${el.label || el.type} Field`}
                                            </p>
                                            {el.options && el.options.length > 0 && (
                                                <div className="pl-7 space-y-1.5 mt-2">
                                                    {el.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                            <span>{opt.text || opt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {el.helperText && (
                                                <p className="text-[10px] text-slate-400 italic mt-1 pl-7">
                                                    Note: {el.helperText}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 italic text-center py-6">No elements in this template.</p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTemplate(null)}
                                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all"
                                >
                                    Close Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleSelectTemplate(previewTemplate);
                                        setPreviewTemplate(null);
                                        setIsTemplatesBrowseOpen(false);
                                    }}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5"
                                >
                                    <FolderUp size={13} />
                                    <span>Insert Template</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Question Generator Modal */}
                {isAiGeneratorOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-lg h-[600px] mx-4 transform scale-100 transition-all duration-300 animate-slide-up flex flex-col overflow-hidden">

                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-650 animate-pulse" />
                                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight font-sans">AI Question Assistant</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAiChatMessages([
                                                { sender: 'ai', text: 'Hello! I am your Gemini AI Assistant. Tell me what topic you want questions on, how many, and what type (e.g. MCQ, Short Answer), and I will generate them for you!' }
                                            ]);
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-all px-2.5 py-1 hover:bg-rose-50 rounded-lg"
                                        title="Clear chat history"
                                    >
                                        Clear Chat
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAiGeneratorOpen(false)}
                                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
                                {aiChatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-semibold shadow-sm leading-relaxed ${msg.sender === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white text-slate-800 border border-slate-200/60 rounded-tl-none'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            {msg.attachmentPreview && (
                                                <div className="mt-2 rounded-xl overflow-hidden border border-white/20 max-w-[200px]">
                                                    <img src={msg.attachmentPreview} alt="attachment" className="w-full max-h-[150px] object-cover" />
                                                </div>
                                            )}
                                            {msg.attachmentName && (
                                                <div className="mt-2 flex items-center gap-1.5 bg-slate-900/25 text-white/90 rounded-xl px-3 py-1.5 text-[10px] w-fit">
                                                    <span>📄</span>
                                                    <span className="font-bold truncate max-w-[150px]">{msg.attachmentName}</span>
                                                </div>
                                            )}

                                            {/* YouTube Embedded Cards */}
                                            {msg.videos && msg.videos.length > 0 && (
                                                <div className="mt-3 space-y-3">
                                                    {msg.videos.map((vid, vIdx) => {
                                                        const videoId = getYoutubeId(vid.url);
                                                        const isAdded = addedVideoUrls.includes(vid.url);
                                                        return (
                                                            <div key={vIdx} className="bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-lg text-left">
                                                                {videoId && (
                                                                    <div className="relative group">
                                                                        {activeVideoId === videoId ? (
                                                                            <div className="aspect-video w-full">
                                                                                <iframe
                                                                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                                                                    title={vid.title}
                                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                                    allowFullScreen
                                                                                    className="w-full h-full border-0"
                                                                                ></iframe>
                                                                            </div>
                                                                        ) : (
                                                                            <div
                                                                                onClick={() => setActiveVideoId(videoId)}
                                                                                className="relative aspect-video w-full cursor-pointer overflow-hidden group bg-black"
                                                                            >
                                                                                <img
                                                                                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                                                                    alt={vid.title}
                                                                                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-300"
                                                                                />
                                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/45 transition-colors">
                                                                                    <div className="w-10 h-10 rounded-full bg-rose-655 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-110 duration-300">
                                                                                        <Play size={16} fill="currentColor" className="ml-0.5" />
                                                                                    </div>
                                                                                </div>
                                                                                <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[9px] font-bold rounded">
                                                                                    YouTube ↗
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="p-3 space-y-1">
                                                                    <h4 className="text-[11px] font-extrabold line-clamp-1 leading-snug text-slate-100">{vid.title}</h4>
                                                                    {vid.description && (
                                                                        <p className="text-[9px] text-slate-400 font-medium line-clamp-2">{vid.description}</p>
                                                                    )}
                                                                    <div className="flex items-center justify-between gap-2 pt-2">
                                                                        <a
                                                                            href={vid.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-500 hover:underline"
                                                                        >
                                                                            <span>Watch on YouTube</span>
                                                                            <span>↗</span>
                                                                        </a>
                                                                        <button
                                                                            type="button"
                                                                            disabled={isAdded}
                                                                            onClick={() => handleInsertEmbeddedVideo(vid, idx)}
                                                                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 ${isAdded
                                                                                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                                                                }`}
                                                                        >
                                                                            {isAdded ? (
                                                                                <>
                                                                                    <Check size={10} />
                                                                                    <span>Added to Test</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Plus size={10} />
                                                                                    <span>Add to Test</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Nested Generated Questions Card */}
                                            {msg.questions && msg.questions.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-100 flex items-center gap-1">
                                                            <span>📦</span>
                                                            <span>{msg.questions.length} Questions Generated</span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={msg.added}
                                                            onClick={() => handleInsertGeneratedQuestions(msg.questions, idx)}
                                                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 ${msg.added
                                                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                                                }`}
                                                        >
                                                            {msg.added ? (
                                                                <>
                                                                    <Check size={10} />
                                                                    <span>Added to Test</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={10} />
                                                                    <span>Add to Test</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Questions Mini Preview */}
                                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 text-[10px] text-slate-500 font-medium custom-scrollbar">
                                                        {msg.questions.map((q, qIdx) => (
                                                            <div key={qIdx} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                <span className="font-bold text-slate-700">Q{qIdx + 1}. </span>
                                                                <span>{q.question}</span>
                                                                {q.options && q.options.length > 0 && (
                                                                    <div className="mt-1 pl-3 grid grid-cols-2 gap-1 text-[9px]">
                                                                        {q.options.map((opt, oIdx) => (
                                                                            <div key={oIdx} className={opt === q.correctAnswer ? 'text-emerald-600 font-bold' : ''}>
                                                                                • {opt}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-bold px-1">
                                            {msg.sender === 'user' ? 'You' : 'Gemini AI'}
                                        </span>
                                    </div>
                                ))}
                                {aiGenerating && (
                                    <div className="flex flex-col items-start animate-pulse">
                                        <div className="bg-white text-slate-500 border border-slate-200/60 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
                                            <span>AI is thinking & generating...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Attachment Preview Card */}
                            {(aiAttachmentPreview || aiParsingPdf) && (
                                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 animate-fade-in shrink-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {aiAttachmentType === 'image' && aiAttachmentPreview && (
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                                                <img src={aiAttachmentPreview} alt="attachment preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        {aiAttachmentType === 'pdf' && (
                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg text-indigo-650 shrink-0">
                                                📄
                                            </div>
                                        )}
                                        <div className="min-w-0 text-left">
                                            <p className="text-xs font-bold text-slate-700 truncate max-w-[240px]">
                                                {aiAttachmentType === 'image' ? 'Attached Image' : aiAttachmentPreview}
                                            </p>
                                            <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">
                                                {aiParsingPdf ? (
                                                    <span className="flex items-center gap-1 text-indigo-600 animate-pulse">
                                                        <Loader2 className="animate-spin" size={10} />
                                                        Parsing document content...
                                                    </span>
                                                ) : 'Ready to analyze'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAiAttachment(null);
                                            setAiAttachmentPreview('');
                                            setAiAttachmentType('');
                                            setAiPdfText('');
                                            setAiParsingPdf(false);
                                            if (aiAttachmentInputRef.current) aiAttachmentInputRef.current.value = '';
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded-full text-slate-450 hover:text-slate-700 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Chat Input */}
                            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSendChatMessage();
                                    }}
                                    className="flex gap-2 items-center"
                                >
                                    <input
                                        type="file"
                                        ref={aiAttachmentInputRef}
                                        onChange={handleAiAttachmentChange}
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => aiAttachmentInputRef.current?.click()}
                                        disabled={aiGenerating || aiParsingPdf}
                                        className="p-2.5 text-slate-500 hover:text-indigo-650 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                        title="Attach Image or PDF"
                                    >
                                        <Paperclip size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleVoiceTyping}
                                        disabled={aiGenerating || aiParsingPdf}
                                        className={`p-2.5 border rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 ${
                                            isListening
                                                ? 'bg-rose-50 border-rose-200 text-rose-650 animate-pulse'
                                                : 'text-slate-500 hover:text-indigo-650 hover:bg-slate-50 border-slate-200 bg-white'
                                        }`}
                                        title={isListening ? "Stop Listening" : "Voice Typing (Speech to Text)"}
                                    >
                                        <Mic size={14} />
                                    </button>
                                    <input
                                        type="text"
                                        value={aiChatInput}
                                        onChange={(e) => setAiChatInput(e.target.value)}
                                        placeholder="Ask AI (e.g. 'make 5 questions from this')"
                                        disabled={aiGenerating || aiParsingPdf}
                                        className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white focus:border-indigo-600 transition-all font-sans disabled:opacity-60"
                                    />
                                    <button
                                        type="submit"
                                        disabled={aiGenerating || aiParsingPdf || (!aiChatInput.trim() && !aiAttachmentPreview)}
                                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                    >
                                        <Send size={14} />
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default TestBuilder;
