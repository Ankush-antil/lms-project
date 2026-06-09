import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Home, Settings, Eye, Send, BarChart2, Clock, Users,
    Search, Type, AlignLeft, CheckSquare, List,
    ChevronDown, Upload, Star, Calendar, Image as ImageIcon,
    MoreVertical, Plus, Wand2, ArrowLeft,
    FileText, Zap, Layout, Share2, History, MessageSquare,
    Play, PanelLeft, Bot, Palette, Link, Save, Hash, Check,
    FolderUp, CircleDot, File, Mic, Video, Monitor, Camera, Phone,
    PlaySquare, Box, Globe, Headphones, Brain, Trash2, X, Sparkles, CheckCircle2, AlertCircle, Copy, Info,
    Bold, Italic, Underline, Strikethrough, ArrowRightLeft, Activity, Code, Quote, Table, HelpCircle, Sliders, GitBranch, Smile, Heading, ListOrdered, GripVertical, AlertTriangle,
    Move, ZoomIn, ZoomOut, Feather, Cog, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ShortAnswerWidget from '../../components/builder/ShortAnswerWidget';
import VoiceWidget from '../../components/builder/VoiceWidget';
import VideoWidget from '../../components/builder/VideoWidget';
import ParagraphWidget from '../../components/builder/ParagraphWidget';
import ConnectItModal from '../../components/builder/ConnectItModal';
import PublishOptionsModal from '../../components/builder/PublishOptionsModal';
import PublishSuccessModal from '../../components/builder/PublishSuccessModal';

// Custom Widget for Multiple Choice, Checkboxes, Dropdown, File Upload, Rating, Date/Time
const QuestionBuilderCard = ({
    element,
    index,
    onDelete,
    onDuplicate,
    onUpdateText,
    onUpdateOptions,
    onUpdateField,
    onDragStartCustom,
    isDragged,
    isDragging
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeFooterTab, setActiveFooterTab] = useState(null); // null | 'assistive' | 'particulars' | 'logic' | 'textLogic' | 'validation' | 'scoring' | 'advanced'
    const [isRecording, setIsRecording] = useState(false);
    const [isCardDraggable, setIsCardDraggable] = useState(false);
    const [zoomScale, setZoomScale] = useState(100);
    const [showSettings, setShowSettings] = useState(false);
    const [openMenu, setOpenMenu] = useState(null); // null | 'align' | 'insert'
    
    const recognitionRef = useRef(null);
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    const label = element.label || 'Short Answer';
    
    const getElementIcon = (lbl) => {
        switch (lbl) {
            case 'Short Answer': return Type;
            case 'Paragraph': return AlignLeft;
            case 'Date/Time': return Calendar;
            case 'Audio Listening': return Headphones;
            case 'Multiple Choice': return CircleDot;
            case 'Checkboxes': return CheckSquare;
            case 'Dropdown': return List;
            case 'File Upload': return Upload;
            case 'Rating': return Star;
            case 'Image': return ImageIcon;
            case 'Video': return Video;
            case 'PDF': return FileText;
            case 'YouTube': return Play;
            case 'Voice Rec': return Mic;
            case 'Video Rec': return Video;
            case 'Call Rec': return Phone;
            case 'Screen Rec': return Monitor;
            case 'Screen Shot': return Camera;
            case 'Text Chat AI': return MessageSquare;
            case 'Voice Chat AI': return Bot;
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
        accessibility: false
    };

    const particulars = element.particulars || {
        shuffleOptions: false,
        multipleAttempts: false,
        charLimit: '',
        wordLimit: '',
        fileSizeLimit: 10,
        fileTypes: 'All'
    };

    const videoSettings = element.videoSettings || {
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
            className={`bg-white rounded-xl border transition-all duration-300 font-sans shadow-sm hover:shadow-md ${
                enabled ? 'border-slate-200 hover:border-purple-300' : 'border-slate-200 bg-slate-50/50 opacity-70'
            } ${writeMode ? 'ring-2 ring-purple-100 border-purple-400' : ''} ${
                isDragged ? 'opacity-40 border-purple-500 border-dashed scale-[0.99] bg-purple-50/30 shadow-inner' : ''
            } overflow-hidden mb-2 ${isDragging ? 'pointer-events-none select-none' : ''}`}
        >
            
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

            {/* HEADER SECTION */}
            <div className="flex flex-wrap items-center justify-between py-1 px-3 border-b border-slate-100 bg-white gap-2 select-none">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onDragStartCustom(e, index);
                        }}
                        onTouchStart={(e) => {
                            onDragStartCustom(e, index);
                        }}
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg shrink-0 pointer-events-auto"
                        title="Drag to reorder"
                    >
                        <GripVertical size={16} />
                    </button>
                    <div className="p-1.5 bg-[#6366F1] text-white rounded-lg flex items-center justify-center shadow-sm w-7.5 h-7.5">
                        <WidgetIcon size={14} />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{label}</span>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1.5">
                    {/* Make it using AI */}
                    <button
                        type="button"
                        onClick={handleAiGenerate}
                        className="p-1.5 bg-blue-50 text-[#0086F0] hover:bg-blue-100 rounded-lg transition-all"
                        title="Generate Question content automatically using AI"
                    >
                        <Wand2 size={13} />
                    </button>

                    {/* Upload */}
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        className="p-1.5 bg-indigo-50 text-[#5A5CD6] hover:bg-indigo-100 rounded-lg transition-all"
                        title="Upload attachment for this question"
                    >
                        <Upload size={13} />
                    </button>

                    {/* Write Mode (Format toolbar toggle) */}
                    <button
                        type="button"
                        onClick={() => onUpdateField('writeMode', !writeMode)}
                        className={`p-1.5 rounded-lg transition-all ${
                            writeMode ? 'bg-[#5A5CD6] text-white' : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                        }`}
                        title="Toggle Advanced Rich Text Toolbar"
                    >
                        <Type size={13} />
                    </button>

                    {/* Media url button */}
                    <button
                        type="button"
                        onClick={() => {
                            const url = prompt("Enter media URL (image, video, or audio file):");
                            if (url) onUpdateField('mediaUrl', url);
                        }}
                        className={`p-1.5 rounded-lg transition-all ${
                            element.mediaUrl ? 'bg-purple-100 text-purple-750' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Attach media Link URL"
                    >
                        <ImageIcon size={14} />
                    </button>

                    {/* Duplicate */}
                    <button
                        type="button"
                        onClick={onDuplicate}
                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
                        title="Duplicate Question"
                    >
                        <Copy size={13} />
                    </button>

                    {/* Delete */}
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
                        className={`p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all ${
                            isExpanded ? '' : 'rotate-180'
                        }`}
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
                            {writeMode ? (
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    dangerouslySetInnerHTML={{ __html: element.text || '' }}
                                    onBlur={(e) => onUpdateText(e.target.innerHTML)}
                                    className="w-full font-bold text-slate-800 bg-transparent outline-none min-h-[32px] pr-12 placeholder:text-slate-400 rich-text-editor"
                                    placeholder="Type your Text here"
                                    style={{ fontSize: `${18 * (zoomScale / 100)}px` }}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={element.text || ''}
                                    onChange={(e) => onUpdateText(e.target.value)}
                                    placeholder="Type your Text here"
                                    className="w-full font-bold text-slate-800 bg-transparent outline-none pr-12 placeholder:text-slate-400 border-none"
                                    style={{ fontSize: `${18 * (zoomScale / 100)}px` }}
                                />
                            )}
                            <button
                                type="button"
                                onClick={handleMicClick}
                                className={`absolute right-1 top-0.5 p-1.5 rounded-full transition-all ${
                                    isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-700 hover:text-slate-900'
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
                    {writeMode && (
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
                                    className={`p-1 hover:bg-slate-100 rounded flex items-center gap-0.5 text-slate-700 ${openMenu === 'align' ? 'bg-slate-100' : ''}`}
                                    title="Alignment & Lists"
                                >
                                    <AlignLeft size={13} />
                                    <ChevronDown size={10} className="text-slate-400" />
                                </button>
                                {openMenu === 'align' && (
                                    <div className="absolute left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5 min-w-[130px]">
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyLeft'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignLeft size={12} /> Align Left</button>
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyCenter'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignCenter size={12} /> Align Center</button>
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyRight'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignRight size={12} /> Align Right</button>
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyFull'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><AlignJustify size={12} /> Align Justify</button>
                                        <hr className="border-slate-100 my-0.5" />
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><List size={12} /> Bulleted List</button>
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertOrderedList'); setOpenMenu(null); }} className="px-2 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><ListOrdered size={12} /> Numbered List</button>
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
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('createLink', prompt('Link URL:')); setOpenMenu(null); }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><Link size={12} /> Hyperlink</button>
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertImage', prompt('Enter Image URL:')); setOpenMenu(null); }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><ImageIcon size={12} /> Image URL</button>
                                        <button type="button" onMouseDown={(e) => {
                                            e.preventDefault();
                                            const audio = prompt('Enter Audio URL:');
                                            if (audio) handleFormat('insertHTML', `<audio controls src="${audio}"></audio>`);
                                            setOpenMenu(null);
                                        }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><Headphones size={12} /> Audio URL</button>
                                        <button type="button" onMouseDown={(e) => {
                                            e.preventDefault();
                                            const video = prompt('Enter Video URL:');
                                            if (video) handleFormat('insertHTML', `<video controls width="320" src="${video}"></video>`);
                                            setOpenMenu(null);
                                        }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><Video size={12} /> Video URL</button>
                                        <hr className="border-slate-100 my-0.5" />
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormat('insertHTML', '😊'); setOpenMenu(null); }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><Smile size={12} /> Emoji 😊</button>
                                        <button type="button" onMouseDown={(e) => {
                                            e.preventDefault();
                                            const eq = prompt("Enter LaTeX/Math Formula:");
                                            if (eq) handleFormat('insertHTML', `<span class="italic font-serif bg-amber-50 px-1 border border-amber-200 rounded">${eq}</span>`);
                                            setOpenMenu(null);
                                        }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><Code size={12} /> Formula Editor</button>
                                        <button type="button" onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleFormat('insertHTML', `<table class="border border-slate-205 w-full text-xs text-left my-1"><tr class="bg-slate-50"><th class="p-1 border-b">H1</th><th class="p-1 border-b">H2</th></tr><tr><td class="p-1">C1</td><td class="p-1">C2</td></tr></table>`);
                                            setOpenMenu(null);
                                        }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><Table size={12} /> Table Insert</button>
                                        <button type="button" onMouseDown={(e) => {
                                            e.preventDefault();
                                            const code = prompt("Enter Code Block:");
                                            if (code) handleFormat('insertHTML', `<pre class="bg-slate-800 text-slate-100 p-2 rounded font-mono text-[10px] my-1">${code}</pre>`);
                                            setOpenMenu(null);
                                        }} className="px-2.5 py-1.5 hover:bg-slate-50 rounded text-left text-xs font-semibold flex items-center gap-2 text-slate-700"><Code size={12} /> Code Block</button>
                                    </div>
                                )}
                            </div>

                            {/* Zoom level group */}
                            <div className="flex items-center gap-1.5 ml-auto text-slate-600">
                                <button type="button" onClick={handleZoomOut} className="p-1 hover:bg-slate-150 rounded" title="Zoom Out"><ZoomOut size={13} /></button>
                                <span className="text-[10px] font-extrabold w-8 text-center">{zoomScale}%</span>
                                <button type="button" onClick={handleZoomIn} className="p-1 hover:bg-slate-150 rounded" title="Zoom In"><ZoomIn size={13} /></button>
                            </div>
                        </div>
                    )}

                    {/* Secondary Description, Helper, Instructions grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-0.5">
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Question Description</label>
                            <input
                                type="text"
                                value={element.description || ''}
                                onChange={(e) => onUpdateField('description', e.target.value)}
                                placeholder="E.g., Answer in 100 words..."
                                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-purple-500 transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Helper Text</label>
                            <input
                                type="text"
                                value={element.helperText || ''}
                                onChange={(e) => onUpdateField('helperText', e.target.value)}
                                placeholder="E.g., Avoid copying from search..."
                                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-purple-500 transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Instructions</label>
                            <input
                                type="text"
                                value={element.instructions || ''}
                                onChange={(e) => onUpdateField('instructions', e.target.value)}
                                placeholder="E.g., Answer carefully..."
                                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-purple-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>

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

                    {/* QUESTION BODY (ELEMENT SPECIFIC RENDER) */}
                    <div className="border-t border-slate-100 pt-2.5">
                        
                        {/* 1. Short Answer */}
                        {label === 'Short Answer' && (
                            <div className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-xl shadow-sm">
                                <input
                                    type="text"
                                    placeholder="Type your Answer here"
                                    disabled
                                    className="bg-transparent outline-none flex-1 text-sm text-slate-400 cursor-not-allowed border-none font-bold"
                                />
                                <div className="flex items-center gap-3.5 ml-auto select-none border-l border-slate-150 pl-3">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Enable it</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={required}
                                            onChange={(e) => onUpdateField('required', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650"></div>
                                    </label>
                                    <ChevronDown
                                        size={18}
                                        className={`text-slate-400 cursor-pointer transition-transform ${isExpanded ? '' : 'rotate-180'}`}
                                        onClick={() => setIsExpanded(!isExpanded)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 2. Paragraph */}
                        {label === 'Paragraph' && (
                            <div className="flex items-start justify-between bg-white px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm">
                                <textarea
                                    placeholder="Type your Paragraph Answer here"
                                    disabled
                                    rows={3}
                                    className="bg-transparent outline-none flex-1 text-sm text-slate-400 cursor-not-allowed border-none font-bold resize-none"
                                />
                                <div className="flex items-center gap-3.5 ml-auto select-none border-l border-slate-150 pl-3 pt-1">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Enable it</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={required}
                                            onChange={(e) => onUpdateField('required', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650"></div>
                                    </label>
                                    <ChevronDown
                                        size={18}
                                        className={`text-slate-400 cursor-pointer transition-transform ${isExpanded ? '' : 'rotate-180'}`}
                                        onClick={() => setIsExpanded(!isExpanded)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3. Multiple Choice */}
                        {label === 'Multiple Choice' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">MCQ Options & Answers</label>
                                <div className="space-y-1.5">
                                    {options.map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center gap-3 bg-white p-1.5 border border-slate-150 rounded-xl hover:border-purple-200 transition-colors">
                                            <div className="w-5 h-5 rounded-full border-2 border-purple-300 flex items-center justify-center">
                                                {opt.isCorrect && <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>}
                                            </div>
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                                placeholder={`Option ${optIdx + 1}`}
                                                className="flex-1 bg-transparent text-sm text-slate-750 font-bold outline-none"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => handleToggleCorrect(optIdx)}
                                                className={`p-1.5 rounded-xl text-xs font-bold transition-all ${opt.isCorrect
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                                    }`}
                                                title={opt.isCorrect ? "Correct answer" : "Mark as correct answer"}
                                            >
                                                <Check size={14} strokeWidth={3} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(optIdx)}
                                                className="p-1.5 text-slate-350 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-750 transition-colors mt-1.5"
                                >
                                    <Plus size={14} /> Add Option
                                </button>
                            </div>
                        )}

                        {/* 4. Checkboxes */}
                        {label === 'Checkboxes' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Multiple Selection Options</label>
                                <div className="space-y-1.5">
                                    {options.map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center gap-3 bg-white p-1.5 border border-slate-150 rounded-xl hover:border-purple-200 transition-colors">
                                            <div className={`w-5 h-5 rounded border-2 border-purple-300 flex items-center justify-center ${opt.isCorrect ? 'bg-purple-100' : ''}`}>
                                                {opt.isCorrect && <Check size={14} className="text-purple-600" strokeWidth={3} />}
                                            </div>
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                                placeholder={`Option ${optIdx + 1}`}
                                                className="flex-1 bg-transparent text-sm text-slate-750 font-bold outline-none"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => handleToggleCorrect(optIdx)}
                                                className={`p-1.5 rounded-xl text-xs font-bold transition-all ${opt.isCorrect
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                                    }`}
                                                title={opt.isCorrect ? "Correct answer" : "Mark as correct answer"}
                                            >
                                                <Check size={14} strokeWidth={3} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(optIdx)}
                                                className="p-1.5 text-slate-350 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-750 transition-colors mt-1.5"
                                >
                                    <Plus size={14} /> Add Option
                                </button>
                            </div>
                        )}

                        {/* 5. Dropdown */}
                        {label === 'Dropdown' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dropdown Selections</label>
                                <div className="space-y-1.5">
                                    {options.map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center gap-3 bg-white p-1.5 border border-slate-150 rounded-xl hover:border-purple-200 transition-colors">
                                            <span className="text-xs font-bold text-slate-400">{optIdx + 1}.</span>
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                                placeholder={`Option ${optIdx + 1}`}
                                                className="flex-1 bg-transparent text-sm text-slate-750 font-bold outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(optIdx)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-750 transition-colors mt-1.5"
                                >
                                    <Plus size={14} /> Add Option
                                </button>
                            </div>
                        )}

                        {/* 6. True / False */}
                        {label === 'True/False' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">True / False Answer Selection</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['True', 'False'].map((tfValue) => {
                                        const optIdx = tfValue === 'True' ? 0 : 1;
                                        const isCorrect = options[optIdx]?.isCorrect || false;
                                        return (
                                            <button
                                                key={tfValue}
                                                type="button"
                                                onClick={() => {
                                                    const newOpts = [
                                                        { text: 'True', isCorrect: tfValue === 'True' },
                                                        { text: 'False', isCorrect: tfValue === 'False' }
                                                    ];
                                                    onUpdateOptions(newOpts);
                                                }}
                                                className={`p-2 rounded-xl border text-center text-sm font-bold transition-all ${
                                                    isCorrect
                                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm shadow-emerald-50'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                                                }`}
                                            >
                                                {tfValue} {isCorrect ? '✓ (Correct)' : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 7. Matching Pairs */}
                        {label === 'Matching' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Matching Items Pair Builder</label>
                                <div className="space-y-1.5">
                                    {(element.matchingPairs || [
                                        { key: "React", value: "Frontend Library" },
                                        { key: "NodeJS", value: "Backend Runtime" }
                                    ]).map((pair, pIdx) => (
                                        <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-150 relative">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-400">Match Item {pIdx+1}</span>
                                                <input
                                                    type="text"
                                                    value={pair.key || ''}
                                                    onChange={(e) => {
                                                        const copy = [...(element.matchingPairs || [{ key: "React", value: "Frontend Library" }, { key: "NodeJS", value: "Backend Runtime" }])];
                                                        copy[pIdx].key = e.target.value;
                                                        onUpdateField('matchingPairs', copy);
                                                    }}
                                                    placeholder="Match Item (e.g. React)"
                                                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 outline-none focus:bg-white focus:border-purple-500"
                                                />
                                            </div>
                                            <div className="space-y-1 relative">
                                                <span className="text-[9px] font-bold text-slate-400">Target Answer {pIdx+1}</span>
                                                <input
                                                    type="text"
                                                    value={pair.value || ''}
                                                    onChange={(e) => {
                                                        const copy = [...(element.matchingPairs || [{ key: "React", value: "Frontend Library" }, { key: "NodeJS", value: "Backend Runtime" }])];
                                                        copy[pIdx].value = e.target.value;
                                                        onUpdateField('matchingPairs', copy);
                                                    }}
                                                    placeholder="Corresponding Match (e.g. Frontend)"
                                                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 pr-8 outline-none focus:bg-white focus:border-purple-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const copy = (element.matchingPairs || []).filter((_, i) => i !== pIdx);
                                                        onUpdateField('matchingPairs', copy);
                                                    }}
                                                    className="absolute right-2 top-5 text-slate-350 hover:text-red-500"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const list = element.matchingPairs || [{ key: "React", value: "Frontend Library" }, { key: "NodeJS", value: "Backend Runtime" }];
                                            onUpdateField('matchingPairs', [...list, { key: '', value: '' }]);
                                        }}
                                        className="text-xs font-bold text-purple-650 hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={13} /> Add Matching Pair
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 8. Fill in the Blanks */}
                        {label === 'Fill in the Blanks' && (
                            <div className="space-y-1.5">
                                <div className="p-2 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs space-y-1">
                                    <p className="font-bold flex items-center gap-1"><Info size={13} /> Writing blanks format:</p>
                                    <p>Insert the token <span className="font-mono bg-white px-1.5 py-0.5 rounded font-black border border-amber-205">[blank]</span> inside your question prompt (e.g., "React is a [blank] library developed by [blank]."). Then provide the correct answers below.</p>
                                </div>
                                <div className="bg-white p-2 border border-slate-150 rounded-xl space-y-1.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Blank Answers list</span>
                                    {(element.blankAnswers || ["frontend"]).map((ans, bIdx) => (
                                        <div key={bIdx} className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 w-16">Blank #{bIdx+1}:</span>
                                            <input
                                                type="text"
                                                value={ans || ''}
                                                onChange={(e) => {
                                                    const copy = [...(element.blankAnswers || ["frontend"])];
                                                    copy[bIdx] = e.target.value;
                                                    onUpdateField('blankAnswers', copy);
                                                }}
                                                placeholder={`Correct answer for blank ${bIdx+1}`}
                                                className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-purple-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const copy = (element.blankAnswers || []).filter((_, i) => i !== bIdx);
                                                    onUpdateField('blankAnswers', copy);
                                                }}
                                                className="text-slate-350 hover:text-red-500 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const list = element.blankAnswers || ["frontend"];
                                            onUpdateField('blankAnswers', [...list, '']);
                                        }}
                                        className="text-xs font-bold text-purple-655 hover:underline flex items-center gap-1 mt-1"
                                    >
                                        <Plus size={13} /> Add Blank Answer
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 9. Assignment */}
                        {label === 'Assignment' && (
                            <div className="border-2 border-dashed border-purple-205 rounded-3xl p-8 bg-white flex flex-col items-center justify-center gap-2 text-center select-none shadow-sm shadow-purple-50/20">
                                <div className="p-3.5 bg-purple-50 text-purple-600 rounded-full">
                                    <FileText size={24} />
                                </div>
                                <span className="text-sm font-black text-slate-800">Assignment File Submission Portal</span>
                                <span className="text-xs text-slate-400 max-w-sm">Students will upload their files (PDF, DOCX, ZIP, PPTX) here. Limit set in Particulars Settings.</span>
                            </div>
                        )}

                        {/* 10. Activity */}
                        {label === 'Activity' && (
                            <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interactive Activity Config</span>
                                    <span className="px-2 py-0.5 bg-purple-550 text-white rounded text-[9px] font-bold uppercase tracking-wider">Simulation Block</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-505">Activity Simulator Type</span>
                                        <select
                                            value={element.activityType || 'AI Lab'}
                                            onChange={(e) => onUpdateField('activityType', e.target.value)}
                                            className="w-full text-xs bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500"
                                        >
                                            <option value="AI Lab">AI Lab & Coding Sandbox</option>
                                            <option value="Language Dialog">Language Dialog speaking</option>
                                            <option value="Design Canvas">Interactive Design Canvas</option>
                                            <option value="Gamified Quiz">Gamified Quiz Arena</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-550">Activity Scenario / Rules</span>
                                        <input
                                            type="text"
                                            value={element.activityRules || ''}
                                            onChange={(e) => onUpdateField('activityRules', e.target.value)}
                                            placeholder="E.g., Complete writing HTML layout in 5 minutes"
                                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 11. Date / Time */}
                        {label === 'Date/Time' && (
                            <div className="grid grid-cols-2 gap-4 select-none">
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
                                    <input
                                        type="text"
                                        placeholder="YYYY-MM-DD"
                                        disabled
                                        className="w-full bg-white border border-slate-205 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                                <div className="relative">
                                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
                                    <input
                                        type="text"
                                        placeholder="HH:MM"
                                        disabled
                                        className="w-full bg-white border border-slate-205 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 12. Audio Listening */}
                        {label === 'Audio Listening' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Audio File URL</label>
                                    <input
                                        type="text"
                                        value={element.audioUrl || ''}
                                        onChange={(e) => onUpdateField('audioUrl', e.target.value)}
                                        placeholder="https://example.com/listening-exercise.mp3"
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Multiple Choice Options for Audio</label>
                                    <div className="space-y-2">
                                        {options.map((opt, optIdx) => (
                                            <div key={optIdx} className="flex items-center gap-3 bg-white p-2.5 border border-slate-100 rounded-xl hover:border-purple-200 transition-colors">
                                                <div className="w-5 h-5 rounded-full border-2 border-purple-300 flex items-center justify-center"></div>
                                                <input
                                                    type="text"
                                                    value={opt.text}
                                                    onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                                    placeholder={`Option ${optIdx + 1}`}
                                                    className="flex-1 bg-transparent text-sm text-slate-705 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCorrect(optIdx)}
                                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${opt.isCorrect
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                        : 'bg-slate-100 text-slate-450 hover:bg-slate-200 hover:text-slate-605'
                                                        }`}
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(optIdx)}
                                                    className="p-1.5 text-slate-350 hover:text-red-500 rounded-lg hover:bg-red-50"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddOption}
                                        className="text-xs font-bold text-purple-650 hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add Option
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 13. Image element */}
                        {label === 'Image' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Image Source URL</label>
                                    <input
                                        type="text"
                                        value={element.imageUrl || ''}
                                        onChange={(e) => onUpdateField('imageUrl', e.target.value)}
                                        placeholder="https://images.unsplash.com/photo-..."
                                        className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Alt Text</label>
                                        <input
                                            type="text"
                                            value={element.altText || ''}
                                            onChange={(e) => onUpdateField('altText', e.target.value)}
                                            placeholder="Description of image"
                                            className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Alignment</label>
                                        <select
                                            value={element.align || 'center'}
                                            onChange={(e) => onUpdateField('align', e.target.value)}
                                            className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-semibold"
                                        >
                                            <option value="left">Left</option>
                                            <option value="center">Center</option>
                                            <option value="right">Right</option>
                                        </select>
                                    </div>
                                </div>
                                {element.imageUrl && (
                                    <div className="mt-3 flex justify-center border border-slate-105 rounded-xl p-2 bg-slate-50">
                                        <img
                                            src={element.imageUrl}
                                            alt={element.altText || 'Preview'}
                                            className="max-h-40 rounded-lg object-contain shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 14. File Upload */}
                        {label === 'File Upload' && (
                            <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 bg-white flex flex-col items-center justify-center gap-2 text-center shadow-sm select-none">
                                <div className="p-3 bg-purple-55 text-purple-600 rounded-full">
                                    <Upload size={20} />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">Drag files here or click to browse</span>
                                <span className="text-xs text-slate-400">PDF, DOC, PNG, JPG (Max 10MB)</span>
                            </div>
                        )}

                        {/* 15. Rating */}
                        {label === 'Rating' && (
                            <div className="bg-white p-4 border border-slate-150 rounded-2xl flex flex-col gap-2 shadow-sm">
                                <span className="text-xs font-bold text-slate-400 uppercase">Default Rating</span>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            type="button"
                                            key={star}
                                            onClick={() => onUpdateField('defaultValue', star)}
                                            className="text-2xl transition-transform hover:scale-110 active:scale-95 text-slate-200"
                                        >
                                            <Star
                                                size={24}
                                                className={star <= (element.defaultValue || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 16. YouTube player */}
                        {label === 'YouTube' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">YouTube Link or Video ID</label>
                                    <input
                                        type="text"
                                        value={element.youtubeUrl || ''}
                                        onChange={(e) => onUpdateField('youtubeUrl', e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                        className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                                    />
                                </div>
                                {element.youtubeUrl && (
                                    <div className="mt-2 aspect-video rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-semibold text-slate-400 p-2 text-center max-h-40">
                                        <Play size={24} className="text-red-500 fill-red-500 animate-pulse mr-2" />
                                        <span>YouTube Player Placeholder<br />({element.youtubeUrl})</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 17. Video upload / source */}
                        {label === 'Video' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Video Source URL (.mp4)</label>
                                    <input
                                        type="text"
                                        value={element.videoUrl || ''}
                                        onChange={(e) => onUpdateField('videoUrl', e.target.value)}
                                        placeholder="https://www.w3schools.com/html/mov_bbb.mp4"
                                        className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!element.autoplay}
                                            onChange={(e) => onUpdateField('autoplay', e.target.checked)}
                                            className="rounded text-purple-600"
                                        />
                                        Autoplay
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!element.loop}
                                            onChange={(e) => onUpdateField('loop', e.target.checked)}
                                            className="rounded text-purple-600"
                                        />
                                        Loop Video
                                    </label>
                                </div>
                                {element.videoUrl && (
                                    <video src={element.videoUrl} controls className="max-h-40 rounded-lg w-full bg-black mt-2" />
                                )}
                            </div>
                        )}

                        {/* 18. PDF */}
                        {label === 'PDF' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">PDF Document URL</label>
                                    <input
                                        type="text"
                                        value={element.pdfUrl || ''}
                                        onChange={(e) => onUpdateField('pdfUrl', e.target.value)}
                                        placeholder="https://example.com/document.pdf"
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                    <FileText size={20} className="text-red-500" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">{element.pdfUrl || 'Untitled Document.pdf'}</span>
                                        <span className="text-[10px] text-slate-400 font-semibold">PDF Asset</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 19. Voice Rec */}
                        {label === 'Voice Rec' && (
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6 flex flex-col items-center justify-center gap-2 text-center select-none shadow-sm">
                                <Mic size={24} className="text-purple-600 animate-pulse" />
                                <span className="text-sm font-semibold text-slate-700">Voice Response recording block</span>
                                <span className="text-xs text-slate-400">Students will record their voice responses during the exam.</span>
                            </div>
                        )}

                        {/* 20. Video Rec */}
                        {label === 'Video Rec' && (
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6 flex flex-col items-center justify-center gap-2 text-center select-none shadow-sm">
                                <Video size={24} className="text-purple-600 animate-pulse" />
                                <span className="text-sm font-semibold text-slate-700">Video Response capture block</span>
                                <span className="text-xs text-slate-400">Requires camera permissions to record student video.</span>
                            </div>
                        )}

                        {/* 21. Call Rec */}
                        {label === 'Call Rec' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Roleplay Script / Scenario Details</label>
                                    <textarea
                                        value={element.scriptScenario || ''}
                                        onChange={(e) => onUpdateField('scriptScenario', e.target.value)}
                                        placeholder="Describe the dialogue roleplay scenario for this call recording..."
                                        rows={3}
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all font-medium resize-none"
                                    />
                                </div>
                                <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 flex items-center gap-3 text-xs text-slate-500 font-medium">
                                    <Phone size={16} className="text-purple-600 animate-bounce" />
                                    <span>Dialer Roleplay interface.</span>
                                </div>
                            </div>
                        )}

                        {/* 22. Screen Rec */}
                        {label === 'Screen Rec' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Video Quality</label>
                                        <select
                                            value={element.quality || '1080p'}
                                            onChange={(e) => onUpdateField('quality', e.target.value)}
                                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white"
                                        >
                                            <option value="720p">HD (720p)</option>
                                            <option value="1080p">Full HD (1080p)</option>
                                            <option value="4k">4K Ultra</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 flex flex-col justify-end pb-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={!!element.includeMic}
                                                onChange={(e) => onUpdateField('includeMic', e.target.checked)}
                                                className="rounded text-purple-600"
                                            />
                                            Include Microphone Audio
                                        </label>
                                    </div>
                                </div>
                                <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 flex items-center gap-3 text-xs text-slate-500 font-medium">
                                    <Monitor size={16} className="text-purple-600" />
                                    <span>Students will record screen output during the test.</span>
                                </div>
                            </div>
                        )}

                        {/* 23. Screen Shot */}
                        {label === 'Screen Shot' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Screenshot Scope</label>
                                    <select
                                        value={element.screenshotScope || 'Entire Screen'}
                                        onChange={(e) => onUpdateField('screenshotScope', e.target.value)}
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2"
                                    >
                                        <option value="Entire Screen">Entire Desktop Screen</option>
                                        <option value="Active Browser Window">Active Browser Window</option>
                                        <option value="Selected Custom Frame">Selected Custom Frame</option>
                                    </select>
                                </div>
                                <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 flex items-center gap-3 text-xs text-slate-500 font-medium">
                                    <Camera size={16} className="text-purple-600" />
                                    <span>Requires the student to upload a verified screenshot.</span>
                                </div>
                            </div>
                        )}

                        {/* 24. Text Chat AI */}
                        {label === 'Text Chat AI' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Agent Name</label>
                                        <input
                                            type="text"
                                            value={element.agentName || 'AI Assistant'}
                                            onChange={(e) => onUpdateField('agentName', e.target.value)}
                                            placeholder="AI Support Representative"
                                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Greeting Message</label>
                                        <input
                                            type="text"
                                            value={element.greetingMessage || 'Hello! How can I help you today?'}
                                            onChange={(e) => onUpdateField('greetingMessage', e.target.value)}
                                            placeholder="Greeting dialog text"
                                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">AI System Persona / Prompt Instructions</label>
                                    <textarea
                                        value={element.systemPersona || ''}
                                        onChange={(e) => onUpdateField('systemPersona', e.target.value)}
                                        placeholder="E.g., Act as a technical recruiter looking to hire a software engineer. Ask 3 tech questions."
                                        rows={3}
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:bg-white resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 25. Voice Chat AI */}
                        {label === 'Voice Chat AI' && (
                            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Voice Persona</label>
                                        <select
                                            value={element.voicePersona || 'alloy'}
                                            onChange={(e) => onUpdateField('voicePersona', e.target.value)}
                                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none font-semibold"
                                        >
                                            <option value="alloy">Neutral (Alloy)</option>
                                            <option value="echo">Warm Male (Echo)</option>
                                            <option value="shimmer">Clear Female (Shimmer)</option>
                                            <option value="fable">Deep British (Fable)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Agent Name</label>
                                        <input
                                            type="text"
                                            value={element.agentName || 'AI Voice Assistant'}
                                            onChange={(e) => onUpdateField('agentName', e.target.value)}
                                            placeholder="AI Voice Assistant"
                                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">AI Prompt Scenario</label>
                                    <textarea
                                        value={element.systemPersona || ''}
                                        onChange={(e) => onUpdateField('systemPersona', e.target.value)}
                                        placeholder="Describe the verbal communication persona..."
                                        rows={3}
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:bg-white resize-none"
                                    />
                                </div>
                            </div>
                        )}

                                        {/* UNIFIED QUESTION FOOTER SECTIONS */}
                    <div className="border-t border-slate-100 mt-2 bg-white/40 -mx-2.5 -mb-2.5 p-2.5">
                        {/* Collapsible settings bar */}
                        <button
                            type="button"
                            onClick={() => setShowSettings(!showSettings)}
                            className="w-full flex items-center justify-between py-1 px-2.5 bg-slate-50/80 hover:bg-slate-100/50 rounded-lg text-xs font-bold text-slate-600 transition-colors select-none"
                        >
                            <span className="flex items-center gap-1.5">
                                <Cog size={13} className={`text-slate-500 ${showSettings ? 'animate-spin-slow' : ''}`} />
                                <span>⚙ Question Settings</span>
                            </span>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                        </button>

                        {showSettings && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-2">
                                {/* Toggles row */}
                                <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600 pb-1 border-b border-slate-100">
                                    <div className="flex items-center gap-2 select-none">
                                        <span>Required Question</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={required}
                                                onChange={(e) => onUpdateField('required', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-650"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-2 select-none">
                                        <span>Enable Question</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={enabled}
                                                onChange={(e) => onUpdateField('enabled', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-650"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Settings drawers selector buttons */}
                                <div className="flex flex-wrap gap-0.5">
                                    {[
                                        { key: 'assistive', label: 'Assistive Features', color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' },
                                        ...(label === 'Video Rec' ? [{ key: 'videoSettings', label: 'Video Settings', color: 'bg-violet-50 text-violet-750 hover:bg-violet-100 border border-violet-200' }] : []),
                                        { key: 'particulars', label: 'Particular', color: 'bg-amber-50 text-amber-850 hover:bg-amber-100 border border-amber-200' },
                                        { key: 'logic', label: 'Content Logic', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' },
                                        { key: 'textLogic', label: 'Text Logic', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' },
                                        { key: 'validation', label: 'Validation', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' },
                                        { key: 'scoring', label: 'Scoring', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200' },
                                        { key: 'advanced', label: 'Advanced Settings', color: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setActiveFooterTab(activeFooterTab === tab.key ? null : tab.key)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                                activeFooterTab === tab.key
                                                    ? 'bg-[#5A5CD6] text-white'
                                                    : tab.color
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                                               {/* Active Drawer Render */}
                                {activeFooterTab && (
                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-[12px] animate-fade-in text-xs">
                                        
                                        {/* Video Settings Drawer */}
                                        {activeFooterTab === 'videoSettings' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                                    <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest flex items-center gap-1"><Video size={12} /> Redesigned Video element Settings</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3.5 rounded-xl border border-slate-150">
                                                     {/* 1. Recording Modes */}
                                                     <div className="space-y-2">
                                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recording Modes</span>
                                                         <div className="space-y-1.5">
                                                             {[
                                                                 { key: 'allowWebcam', label: 'Webcam Only' },
                                                                 { key: 'allowScreen', label: 'Screen Only' },
                                                                 { key: 'allowScreenWebcam', label: 'Screen + Webcam' },
                                                                 { key: 'allowAudioOnly', label: 'Audio Only' },
                                                                 { key: 'allowUpload', label: 'Upload Existing Video' }
                                                             ].map(mode => (
                                                                 <label key={mode.key} className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer select-none">
                                                                     <input
                                                                         type="checkbox"
                                                                         checked={videoSettings[mode.key] !== false}
                                                                         onChange={(e) => handleUpdateNestedField('videoSettings', mode.key, e.target.checked)}
                                                                         className="rounded text-purple-605 w-3.5 h-3.5"
                                                                     />
                                                                     {mode.label}
                                                                 </label>
                                                             ))}
                                                         </div>
                                                     </div>

                                                     {/* 2. Video Restrictions */}
                                                     <div className="space-y-2">
                                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Video Restrictions</span>
                                                         <div className="space-y-1.5">
                                                             <div className="flex items-center justify-between gap-2">
                                                                 <span className="text-xs text-slate-600">Min Duration (sec)</span>
                                                                 <input
                                                                     type="number"
                                                                     value={videoSettings.minDuration || 30}
                                                                     onChange={(e) => handleUpdateNestedField('videoSettings', 'minDuration', Number(e.target.value))}
                                                                     className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                                                                 />
                                                             </div>
                                                             <div className="flex items-center justify-between gap-2">
                                                                 <span className="text-xs text-slate-600">Max Duration (sec)</span>
                                                                 <input
                                                                     type="number"
                                                                     value={videoSettings.maxDuration || 600}
                                                                     onChange={(e) => handleUpdateNestedField('videoSettings', 'maxDuration', Number(e.target.value))}
                                                                     className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                                                                 />
                                                             </div>
                                                             <div className="flex items-center justify-between gap-2">
                                                                 <span className="text-xs text-slate-600">Max File Size (MB)</span>
                                                                 <input
                                                                     type="number"
                                                                     value={videoSettings.maxFileSize || 100}
                                                                     onChange={(e) => handleUpdateNestedField('videoSettings', 'maxFileSize', Number(e.target.value))}
                                                                     className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                                                                 />
                                                             </div>
                                                             <div className="flex items-center justify-between gap-2">
                                                                 <span className="text-xs text-slate-600">Attempts Limit</span>
                                                                 <input
                                                                     type="number"
                                                                     value={videoSettings.recordingAttemptsLimit || 3}
                                                                     onChange={(e) => handleUpdateNestedField('videoSettings', 'recordingAttemptsLimit', Number(e.target.value))}
                                                                     className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                                                                 />
                                                             </div>
                                                         </div>
                                                     </div>

                                                     {/* 3. Exam Security & AI Options */}
                                                     <div className="space-y-2">
                                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exam Security & AI</span>
                                                         <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                                             {[
                                                                 { key: 'webcamRequired', label: 'Webcam Required' },
                                                                 { key: 'microphoneRequired', label: 'Microphone Required' },
                                                                 { key: 'fullScreenRequired', label: 'Full Screen Required' },
                                                                 { key: 'tabSwitchingDetection', label: 'Tab Switch Detection' },
                                                                 { key: 'multipleFaceDetection', label: 'Multiple Face Alert' },
                                                                 { key: 'faceMissingDetection', label: 'Face Missing Alert' },
                                                                 { key: 'backgroundNoiseDetection', label: 'Noise Alert' },
                                                                 { key: 'aiTranscriptEnabled', label: 'AI Transcript Features' },
                                                                 { key: 'timestampFeedbackEnabled', label: 'Timestamp Feedback' }
                                                             ].map(item => (
                                                                 <label key={item.key} className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer select-none">
                                                                     <input
                                                                         type="checkbox"
                                                                         checked={!!videoSettings[item.key]}
                                                                         onChange={(e) => handleUpdateNestedField('videoSettings', item.key, e.target.checked)}
                                                                         className="rounded text-purple-605 w-3.5 h-3.5"
                                                                     />
                                                                     {item.label}
                                                                 </label>
                                                             ))}
                                                         </div>
                                                     </div>
                                                </div>
                                             </div>
                                         )}

                                         {/* 1. Assistive Features */}
                                         {activeFooterTab === 'assistive' && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest flex items-center gap-1"><HelpCircle size={12} /> Assistive Accessibility Features</span>
                                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black">Future Integration</span>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                                    {Object.keys(assistive).map((key) => {
                                                        const labelMap = {
                                                            aiReader: "AI Reader Assist",
                                                            textToSpeech: "Read Aloud (TTS)",
                                                            speechToText: "Dictate Answers",
                                                            translation: "Multi-Language",
                                                            dyslexiaMode: "Dyslexia Font",
                                                            accessibility: "Aria High Contrast"
                                                        };
                                                        return (
                                                            <label key={key} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-150 text-[10px] font-bold text-slate-655 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={assistive[key]}
                                                                    onChange={(e) => handleUpdateNestedField('assistive', key, e.target.checked)}
                                                                    className="rounded text-purple-650 w-3 h-3"
                                                                />
                                                                <span>{labelMap[key]}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. Particular Settings */}
                                        {activeFooterTab === 'particulars' && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest flex items-center gap-1"><Sliders size={12} /> Element-Specific Settings</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150">
                                                    {/* MCQ Particulars */}
                                                    {(label === 'Multiple Choice' || label === 'Checkboxes' || label === 'Dropdown' || label === 'Matching') && (
                                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={particulars.shuffleOptions}
                                                                onChange={(e) => handleUpdateNestedField('particulars', 'shuffleOptions', e.target.checked)}
                                                                className="rounded text-purple-600 w-4 h-4"
                                                            />
                                                            Shuffle Choices list
                                                        </label>
                                                    )}
                                                    
                                                    {/* Word Limits particulars */}
                                                    {(label === 'Short Answer' || label === 'Paragraph' || label === 'Voice Rec') && (
                                                        <>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-slate-505">Maximum Word Limit</span>
                                                                <input
                                                                    type="number"
                                                                    value={particulars.wordLimit}
                                                                    onChange={(e) => handleUpdateNestedField('particulars', 'wordLimit', e.target.value)}
                                                                    placeholder="No Limit"
                                                                    className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-slate-505">Character Limit</span>
                                                                <input
                                                                    type="number"
                                                                    value={particulars.charLimit}
                                                                    onChange={(e) => handleUpdateNestedField('particulars', 'charLimit', e.target.value)}
                                                                    placeholder="No Limit"
                                                                    className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Upload limit particulars */}
                                                    {label === 'File Upload' && (
                                                        <>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-slate-505">Max File Size (MB)</span>
                                                                <input
                                                                    type="number"
                                                                    value={particulars.fileSizeLimit}
                                                                    onChange={(e) => handleUpdateNestedField('particulars', 'fileSizeLimit', e.target.value)}
                                                                    className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-slate-505">Allowed File Formats</span>
                                                                <select
                                                                    value={particulars.fileTypes}
                                                                    onChange={(e) => handleUpdateNestedField('particulars', 'fileTypes', e.target.value)}
                                                                    className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                                >
                                                                    <option value="All">All Formats</option>
                                                                    <option value="Images">Images only (.png, .jpg)</option>
                                                                    <option value="Documents">PDF & Word only</option>
                                                                    <option value="Media">Audio & Video only</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={particulars.multipleAttempts}
                                                            onChange={(e) => handleUpdateNestedField('particulars', 'multipleAttempts', e.target.checked)}
                                                            className="rounded text-purple-650 w-4 h-4"
                                                        />
                                                        Allow Multiple Retakes
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. Content Logic */}
                                        {activeFooterTab === 'logic' && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest flex items-center gap-1"><GitBranch size={12} /> Conditional Display & Logic Routing</span>
                                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black">Future Integration</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-550">Show this question IF Question:</span>
                                                        <input
                                                            type="text"
                                                            value={logic.dependsOnQuestion}
                                                            onChange={(e) => handleUpdateNestedField('logic', 'dependsOnQuestion', e.target.value)}
                                                            placeholder="E.g., Question 1"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-550">Equals Answer value:</span>
                                                        <input
                                                            type="text"
                                                            value={logic.dependsOnAnswer}
                                                            onChange={(e) => handleUpdateNestedField('logic', 'dependsOnAnswer', e.target.value)}
                                                            placeholder="E.g., Yes"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-550">Section routing trigger:</span>
                                                        <input
                                                            type="text"
                                                            value={logic.scoreTrigger}
                                                            onChange={(e) => handleUpdateNestedField('logic', 'scoreTrigger', e.target.value)}
                                                            placeholder="E.g., Route to Sec 2 if score > 50%"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 4. Text Logic */}
                                        {activeFooterTab === 'textLogic' && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest block">Dynamic Text Placeholder Tokens</span>
                                                <p className="text-[11px] text-slate-500 leading-normal">
                                                    Insert placeholders into Title, Description, or Helper Text. Replaced dynamically on exam attempt:
                                                </p>
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {[
                                                        { token: "{Student Name}", desc: "Student's name" },
                                                        { token: "{Institute Name}", desc: "Institute name" },
                                                        { token: "{Course Name}", desc: "Course name" },
                                                        { token: "{Subject Name}", desc: "Subject name" }
                                                    ].map((t) => (
                                                        <button
                                                            key={t.token}
                                                            type="button"
                                                            onClick={() => {
                                                                const currentText = element.text || '';
                                                                onUpdateText(currentText + (currentText ? ' ' : '') + t.token);
                                                                toast.success(`Inserted ${t.token}!`);
                                                            }}
                                                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] hover:border-purple-300 hover:text-purple-700 transition-all font-mono font-bold flex flex-col items-start"
                                                        >
                                                            <span>{t.token}</span>
                                                            <span className="text-[8px] text-slate-400 font-normal mt-0.5">{t.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 5. Validation panel */}
                                        {activeFooterTab === 'validation' && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest block">Answer Validation Rules</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Min Length</span>
                                                        <input
                                                            type="number"
                                                            value={validation.minLength}
                                                            onChange={(e) => handleUpdateNestedField('validation', 'minLength', e.target.value)}
                                                            placeholder="None"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Max Length</span>
                                                        <input
                                                            type="number"
                                                            value={validation.maxLength}
                                                            onChange={(e) => handleUpdateNestedField('validation', 'maxLength', e.target.value)}
                                                            placeholder="None"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Format Constraints (Regex)</span>
                                                        <input
                                                            type="text"
                                                            value={validation.regex}
                                                            onChange={(e) => handleUpdateNestedField('validation', 'regex', e.target.value)}
                                                            placeholder="E.g., ^[A-Z]{3}\d{3}$"
                                                            className="w-full text-xs font-mono bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-655 pt-1">
                                                    {['numericOnly', 'emailOnly', 'urlOnly'].map((key) => {
                                                        const map = {
                                                            numericOnly: "Numeric Digits only",
                                                            emailOnly: "Valid Email structure",
                                                            urlOnly: "Web Address URL structure"
                                                        };
                                                        return (
                                                            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={validation[key]}
                                                                    onChange={(e) => handleUpdateNestedField('validation', key, e.target.checked)}
                                                                    className="rounded text-purple-600 w-4 h-4"
                                                                />
                                                                <span>{map[key]}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* 6. Scoring panel */}
                                        {activeFooterTab === 'scoring' && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest block">Scoring Profile & Grading Scheme</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-550">Marks / Weight Points</span>
                                                        <input
                                                            type="number"
                                                            value={marks}
                                                            onChange={(e) => onUpdateField('marks', Number(e.target.value))}
                                                            className="w-full text-xs font-bold bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-550">Negative Marking Points</span>
                                                        <input
                                                            type="number"
                                                            value={negativeMarks}
                                                            onChange={(e) => onUpdateField('negativeMarks', Number(e.target.value))}
                                                            className="w-full text-xs font-bold bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1 md:col-span-2 flex flex-col justify-end pb-2">
                                                        <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-655">
                                                            <input
                                                                type="checkbox"
                                                                checked={partialMarks}
                                                                onChange={(e) => onUpdateField('partialMarks', e.target.checked)}
                                                                className="rounded text-purple-600 w-4 h-4"
                                                            />
                                                            <span>Enable Partial Credit scoring</span>
                                                        </label>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-550">Evaluation Mode</span>
                                                        <select
                                                            value={evaluationMode}
                                                            onChange={(e) => onUpdateField('evaluationMode', e.target.value)}
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5 font-bold text-slate-700"
                                                        >
                                                            <option value="auto">Auto Grading</option>
                                                            <option value="manual">Teacher Review</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 7. Advanced panel */}
                                        {activeFooterTab === 'advanced' && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest block">Advanced Taxonomy & Classifications</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Taxonomy tags</span>
                                                        <input
                                                            type="text"
                                                            value={advanced.tags}
                                                            onChange={(e) => handleUpdateNestedField('advanced', 'tags', e.target.value)}
                                                            placeholder="E.g., CSS3, flexbox"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Difficulty Level</span>
                                                        <select
                                                            value={advanced.difficulty}
                                                            onChange={(e) => handleUpdateNestedField('advanced', 'difficulty', e.target.value)}
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        >
                                                            <option value="Easy">Easy</option>
                                                            <option value="Medium">Medium</option>
                                                            <option value="Hard">Hard</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Bloom Taxonomy</span>
                                                        <select
                                                            value={advanced.bloomTaxonomy}
                                                            onChange={(e) => handleUpdateNestedField('advanced', 'bloomTaxonomy', e.target.value)}
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        >
                                                            <option value="Remembering">Remembering (Recall info)</option>
                                                            <option value="Understanding">Understanding (Explain ideas)</option>
                                                            <option value="Applying">Applying (Use information)</option>
                                                            <option value="Analyzing">Analyzing (Draw connections)</option>
                                                            <option value="Evaluating">Evaluating (Justify stance)</option>
                                                            <option value="Creating">Creating (Produce new work)</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Learning Outcome Code</span>
                                                        <input
                                                            type="text"
                                                            value={element.learningOutcome || ''}
                                                            onChange={(e) => onUpdateField('learningOutcome', e.target.value)}
                                                            placeholder="E.g., LO-CS101"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Subject Mapping</span>
                                                        <input
                                                            type="text"
                                                            value={element.subjectMapping || ''}
                                                            onChange={(e) => onUpdateField('subjectMapping', e.target.value)}
                                                            placeholder="E.g., Computer Science"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-505">Topic Mapping</span>
                                                        <input
                                                            type="text"
                                                            value={element.topicMapping || ''}
                                                            onChange={(e) => onUpdateField('topicMapping', e.target.value)}
                                                            placeholder="E.g., React Hooks"
                                                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>
                        )}
                    </div>  </div>
                </div>
            )}
        </div>
    );
};

const TestBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Edit');
    const [sidebarTab, setSidebarTab] = useState('Widgets & Elements');
    const [searchQuery, setSearchQuery] = useState('');
    const [formElements, setFormElements] = useState([]);
    const [isMostCommonExpanded, setIsMostCommonExpanded] = useState(true);
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

    // Sidebar Widgets Configuration
    const sidebarElements = [
        { icon: Type, label: 'Short Answer', category: 'Basic Inputs' },
        { icon: AlignLeft, label: 'Paragraph', category: 'Basic Inputs' },
        { icon: Calendar, label: 'Date/Time', category: 'Basic Inputs' },
        { icon: Headphones, label: 'Audio Listening', category: 'Basic Inputs' },

        { icon: CircleDot, label: 'Multiple Choice', category: 'Choice Fields' },
        { icon: CheckSquare, label: 'Checkboxes', category: 'Choice Fields' },
        { icon: List, label: 'Dropdown', category: 'Choice Fields' },
        { icon: CheckCircle2, label: 'True/False', category: 'Choice Fields' },
        { icon: ArrowRightLeft, label: 'Matching', category: 'Choice Fields' },

        { icon: Upload, label: 'File Upload', category: 'Advanced Fields' },
        { icon: Star, label: 'Rating', category: 'Advanced Fields' },
        { icon: Type, label: 'Fill in the Blanks', category: 'Advanced Fields' },
        { icon: FileText, label: 'Assignment', category: 'Advanced Fields' },
        { icon: Activity, label: 'Activity', category: 'Advanced Fields' },

        { icon: ImageIcon, label: 'Image', category: 'Media Elements' },
        { icon: Video, label: 'Video', category: 'Media Elements' },
        { icon: FileText, label: 'PDF', category: 'Media Elements' },
        { icon: Play, label: 'YouTube', category: 'Media Elements' },
        { icon: Mic, label: 'Voice Rec', category: 'Media Elements' },
        { icon: Video, label: 'Video Rec', category: 'Media Elements' },
        { icon: Phone, label: 'Call Rec', category: 'Media Elements' },
        { icon: Monitor, label: 'Screen Rec', category: 'Media Elements' },
        { icon: Camera, label: 'Screen Shot', category: 'Media Elements' },

        { icon: MessageSquare, label: 'Text Chat AI', category: 'AI Agents' },
        { icon: Bot, label: 'Voice Chat AI', category: 'AI Agents' }
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

                    if (test.publishMode) {
                        setPublishModeSelected(test.publishMode);
                    }
                    if (test.publicSettings) {
                        setPublicSettings(prev => ({
                            ...prev,
                            ...test.publicSettings,
                            startDate: test.publicSettings.startDate ? new Date(test.publicSettings.startDate).toISOString().split('T')[0] : '',
                            endDate: test.publicSettings.endDate ? new Date(test.publicSettings.endDate).toISOString().split('T')[0] : '',
                            expiryDate: test.publicSettings.expiryDate ? new Date(test.publicSettings.expiryDate).toISOString().split('T')[0] : '',
                            emailNotification: {
                                ...prev.emailNotification,
                                ...(test.publicSettings.emailNotification || {})
                            }
                        }));
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
                            mediaUrl: q.mediaUrl || '',
                            writeMode: !!q.writeMode,
                            audioUrl: q.audioUrl || '',
                            imageUrl: q.imageUrl || '',
                            altText: q.altText || '',
                            align: q.align || 'center',
                            pdfUrl: q.pdfUrl || '',
                            youtubeUrl: q.youtubeUrl || '',
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

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
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
        if (['Multiple Choice', 'Checkboxes', 'Dropdown'].includes(element.label)) {
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
            videoSettings: {
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
            agentName: element.label === 'Text Chat AI' ? 'AI Assistant' : element.label === 'Voice Chat AI' ? 'AI Voice Assistant' : '',
            greetingMessage: element.label === 'Text Chat AI' ? 'Hello! How can I help you today?' : '',
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
        setFormElements(prev => prev.map((el, i) => i === index ? { ...el, [field]: value } : el));
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
                    institute: mode === 'connected' ? (connectData?.institute || 'Default Institute') : 'Public Web',
                    course: mode === 'connected' ? (connectData?.course || 'Default Course') : 'Public Access',
                    subject: mode === 'connected' ? (connectData?.subject || 'Default Subject') : 'General',
                    date: connectData?.date || new Date().toISOString().split('T')[0],
                    index: mode === 'connected' ? (connectData?.index || 'Index 1') : 'Public Index',
                    activity: mode === 'connected' ? (connectData?.activity || 'Quiz') : 'Quiz',
                    publishMode: mode,
                    publicSettings: mode === 'public' ? (settingsObj || publicSettings) : {}
                },
                questions: formElements.map((el, index) => ({
                    id: `q${index}`,
                    text: el.text?.trim() || `${el.label} Question ${index + 1}`,
                    type: el.label,
                    marks: el.marks !== undefined ? el.marks : 1,
                    description: el.description || '',
                    helperText: el.helperText || '',
                    instructions: el.instructions || '',
                    required: !!el.required,
                    enabled: el.enabled !== false,
                    negativeMarks: el.negativeMarks || 0,
                    partialMarks: !!el.partialMarks,
                    evaluationMode: el.evaluationMode || 'auto',
                    validation: el.validation || {},
                    assistive: el.assistive || {},
                    particulars: el.particulars || {},
                    logic: el.logic || {},
                    textLogic: el.textLogic || {},
                    advanced: el.advanced || {},
                    options: el.options || [],
                    matchingPairs: el.matchingPairs || [],
                    blankAnswers: el.blankAnswers || [],
                    uploadedFiles: el.uploadedFiles || [],
                    mediaUrl: el.mediaUrl || '',
                    writeMode: !!el.writeMode,
                    audioUrl: el.audioUrl || '',
                    imageUrl: el.imageUrl || '',
                    altText: el.altText || '',
                    align: el.align || 'center',
                    pdfUrl: el.pdfUrl || '',
                    youtubeUrl: el.youtubeUrl || '',
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

    // Group elements by category
    const categories = ['Basic Inputs', 'Choice Fields', 'Advanced Fields', 'Media Elements', 'AI Agents'];

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
                                <h2 className="font-extrabold text-slate-800 text-base">Widgets & Elements</h2>
                            </div>

                            {/* Sidebar Tab Selector */}
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setSidebarTab('Widgets & Elements')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'Widgets & Elements'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    Widgets
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

                        {/* Draggable Widgets List */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                            {sidebarTab === 'Widgets & Elements' ? (
                                <div className="space-y-4">
                                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setIsMostCommonExpanded(!isMostCommonExpanded)}
                                            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 text-purple-700 hover:from-purple-50 hover:to-indigo-50 transition-all font-bold text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-600">🔥</span>
                                                <span>Most Common</span>
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold ml-1">
                                                    {filteredElements.length}
                                                </span>
                                            </div>
                                            <ChevronDown size={16} className={`transition-transform duration-300 ${isMostCommonExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isMostCommonExpanded && (
                                            <div className="p-3 bg-white grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto custom-scrollbar animate-fade-in">
                                                {filteredElements.map((el, idx) => (
                                                    <div
                                                        key={idx}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, el)}
                                                        onClick={() => handleAddElement(el)}
                                                        className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                        title="Drag onto canvas or click to append"
                                                    >
                                                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                            <el.icon size={18} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-purple-600 transition-colors leading-tight">{el.label}</span>
                                                    </div>
                                                ))}
                                                {filteredElements.length === 0 && (
                                                    <div className="col-span-2 text-center py-6 text-xs text-slate-400 font-medium">
                                                        No matching widgets found.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Addons Tab Mockup
                                <div className="space-y-4 text-center py-8 px-4">
                                    <div className="p-4 bg-purple-50 text-purple-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                        <Sparkles size={24} />
                                    </div>
                                    <h4 className="font-bold text-slate-700 text-sm">Addons & Integrations</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Extend your form with elements like signature, map location, live chat support, and calendars.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => toast.success("Browsing addons directory...")}
                                        className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-200 transition-all"
                                    >
                                        Browse Directory
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
                <div className="flex-1 flex flex-col">
                    {/* Secondary Toolbar */}
                    <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">         <div className="flex items-center gap-6">
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
                                                        className="animate-fade-in question-card"
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
                                                            onDragStartCustom={(e) => handleCustomDragStart(e, originalIndex)}
                                                            isDragged={draggedQuestionIndex === originalIndex}
                                                            isDragging={isDragging}
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
                                                No fields added to preview yet. Add some widgets in the editor!
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

                                                        {el.label === 'Paragraph' && (
                                                            <textarea
                                                                placeholder="Your long-form answer..."
                                                                rows={3}
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-sm shadow-sm transition-all resize-none"
                                                            ></textarea>
                                                        )}

                                                        {el.label === 'Multiple Choice' && (
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

                                                        {el.label === 'Checkboxes' && (
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

                                                        {el.label === 'File Upload' && (
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

                                                        {el.label === 'Date/Time' && (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 shadow-sm" />
                                                                <input type="time" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 shadow-sm" />
                                                            </div>
                                                        )}
                                                        {el.label === 'Voice Rec' && (
                                                            <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                                                                <button type="button" className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors">
                                                                    <Mic size={18} />
                                                                </button>
                                                                <span className="text-xs font-semibold text-slate-500">Click to record voice response</span>
                                                            </div>
                                                        )}

                                                        {el.label === 'Video Rec' && (
                                                            <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                                                                <button type="button" className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors">
                                                                    <Video size={18} />
                                                                </button>
                                                                <span className="text-xs font-semibold text-slate-500">Click to capture video response</span>
                                                            </div>
                                                        )}

                                                        {el.label === 'Image' && (
                                                            <div className="mt-2 flex justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                                <img
                                                                    src={el.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                                                                    alt={el.altText || 'Preview'}
                                                                    className={`max-w-full max-h-60 rounded-xl object-contain shadow-sm ${el.align === 'left' ? 'mr-auto' : el.align === 'right' ? 'ml-auto' : 'mx-auto'
                                                                        }`}
                                                                />
                                                            </div>
                                                        )}

                                                        {el.label === 'Video' && (
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

                                                        {el.label === 'PDF' && (
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

                                                        {el.label === 'YouTube' && (
                                                            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 shadow-sm aspect-video bg-black max-h-[300px] flex items-center justify-center">
                                                                {el.youtubeUrl ? (
                                                                    <iframe
                                                                        src={`https://www.youtube.com/embed/${el.youtubeUrl.includes('v=')
                                                                            ? el.youtubeUrl.split('v=')[1].split('&')[0]
                                                                            : el.youtubeUrl.includes('embed/')
                                                                                ? el.youtubeUrl.split('embed/')[1].split('?')[0]
                                                                                : el.youtubeUrl
                                                                            }`}
                                                                        title="YouTube Video"
                                                                        className="w-full h-full border-0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                    ></iframe>
                                                                ) : (
                                                                    <div className="text-center text-slate-400 p-4">
                                                                        <Play size={32} className="mx-auto mb-2 text-red-500" />
                                                                        <p className="text-xs font-semibold">Enter a valid YouTube URL to display it here</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {el.label === 'Screen Rec' && (
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
                                                                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/10 flex items-center gap-2"
                                                                >
                                                                    <Monitor size={14} /> Start Screen Share
                                                                </button>
                                                            </div>
                                                        )}

                                                        {el.label === 'Screen Shot' && (
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
                                                                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10 flex items-center gap-2"
                                                                >
                                                                    <Camera size={14} /> Capture Screenshot
                                                                </button>
                                                            </div>
                                                        )}

                                                        {el.label === 'Call Rec' && (
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

                                                        {el.label === 'Audio Listening' && (
                                                            <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col gap-4">
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

                                                        {el.label === 'Text Chat AI' && (
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

                                                        {el.label === 'Voice Chat AI' && (
                                                            <div className="mt-2 border border-slate-200 rounded-3xl p-6 bg-slate-900 text-white flex flex-col items-center justify-center gap-6 min-h-60 relative overflow-hidden">
                                                                <div className="absolute top-4 right-4 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">Voice Call Sim</div>

                                                                <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full flex items-center justify-center animate-pulse">
                                                                    <Bot size={32} />
                                                                </div>

                                                                <div className="text-center">
                                                                    <span className="font-extrabold text-sm block">{el.agentName || 'AI Voice Assistant'}</span>
                                                                    <span className="text-xs text-slate-400 mt-1 block">Voice Persona: {el.voicePersona || 'Alloy'} (Neutral)</span>
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
                            <div className="h-14 bg-white border-t border-slate-200 flex items-center justify-center gap-2 w-full z-20 shadow-[0_-5px_10px_rgba(0,0,0,0.01)] shrink-0">
                                <button
                                    onClick={() => toast.success("Page added! Page splits let you build multi-page survey forms.")}
                                    className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all"
                                >
                                    <Plus size={16} />
                                    <span>Add Page</span>
                                </button>
                                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                                    <button className="px-3.5 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Settings size={12} className="text-purple-600" />
                                        <span>Page 1</span>
                                    </button>
                                    <button
                                        onClick={() => toast("Conditional Logic: configure rules to jump to pages.")}
                                        className="px-3.5 py-1.5 text-slate-500 text-xs font-bold hover:text-slate-800 flex items-center gap-1.5 rounded-lg transition-all"
                                    >
                                        <Hash size={12} />
                                        <span>Logic Rules</span>
                                    </button>
                                    <button
                                        onClick={() => toast("Pick form widgets template design from database.")}
                                        className="px-3.5 py-1.5 text-slate-500 text-xs font-bold hover:text-slate-800 flex items-center gap-1.5 rounded-lg transition-all"
                                    >
                                        <Layout size={12} />
                                        <span>Templates</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Floating Counter Badge */}
                        <div className="absolute bottom-4 right-4 z-30">
                            <button
                                onClick={() => toast(`Form is composed of ${formElements.length} custom widgets.`)}
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
            </div>
        </div>
    );
};

export default TestBuilder;
