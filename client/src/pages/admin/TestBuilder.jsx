import { useState, useEffect } from 'react';
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
    PlaySquare, Box, Globe, Headphones, Brain, Trash2, X, Sparkles, CheckCircle2, AlertCircle, Copy, Info
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ShortAnswerWidget from '../../components/builder/ShortAnswerWidget';
import VoiceWidget from '../../components/builder/VoiceWidget';
import VideoWidget from '../../components/builder/VideoWidget';
import ParagraphWidget from '../../components/builder/ParagraphWidget';
import ConnectItModal from '../../components/builder/ConnectItModal';

// Custom Widget for Multiple Choice, Checkboxes, Dropdown, File Upload, Rating, Date/Time
const CustomFormFieldWidget = ({ element, index, onDelete, onUpdateText, onUpdateOptions, onUpdateField }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const options = element.options || [
        { text: 'Option 1', isCorrect: false },
        { text: 'Option 2', isCorrect: false }
    ];

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
            toast.error("You must have at least one option");
            return;
        }
        const newOptions = options.filter((_, i) => i !== optIdx);
        onUpdateOptions(newOptions);
    };

    const [ratingValue, setRatingValue] = useState(element.defaultValue || 0);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans group hover:shadow-md hover:border-purple-300 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                        {element.icon ? <element.icon size={18} /> : <CircleDot size={18} />}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{element.label}</span>
                </div>

                {/* Drag / Info area */}
                <div className="flex-1 flex justify-center text-xs text-slate-400 font-medium">
                    Drag elements to reorder
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onDelete}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                        title="Delete Element"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-xl transition-all duration-300 ${isExpanded ? '' : 'rotate-180'}`}
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isExpanded && (
                <div className="p-6 space-y-4 animate-fade-in bg-slate-50/20">
                    {/* Question Input */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Label / Title</label>
                        <input
                            type="text"
                            value={element.text || ''}
                            onChange={(e) => onUpdateText(e.target.value)}
                            placeholder={`Type your ${element.label.toLowerCase()} question here...`}
                            className="w-full text-base font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        />
                    </div>

                    {/* Specific widget previews/editors */}
                    {element.label === 'Multiple Choice' && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Options & Answers</label>
                            <div className="space-y-2">
                                {options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-3 bg-white p-2.5 border border-slate-100 rounded-xl hover:border-purple-200 transition-colors">
                                        <div className="w-5 h-5 rounded-full border-2 border-purple-300 flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-purple-600 opacity-0 group-hover:opacity-100"></div>
                                        </div>
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                            placeholder={`Option ${optIdx + 1}`}
                                            className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleToggleCorrect(optIdx)}
                                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${opt.isCorrect
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
                                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline transition-colors mt-2"
                            >
                                <Plus size={14} /> Add Option
                            </button>
                        </div>
                    )}

                    {element.label === 'Checkboxes' && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Options & Answers</label>
                            <div className="space-y-2">
                                {options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-3 bg-white p-2.5 border border-slate-100 rounded-xl hover:border-purple-200 transition-colors">
                                        <div className="w-5 h-5 rounded border-2 border-purple-300 flex items-center justify-center"></div>
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                            placeholder={`Option ${optIdx + 1}`}
                                            className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleToggleCorrect(optIdx)}
                                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${opt.isCorrect
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
                                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline transition-colors mt-2"
                            >
                                <Plus size={14} /> Add Option
                            </button>
                        </div>
                    )}

                    {element.label === 'Dropdown' && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Dropdown Options</label>
                            <div className="space-y-2">
                                {options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-3 bg-white p-2.5 border border-slate-100 rounded-xl hover:border-purple-200 transition-colors">
                                        <span className="text-xs font-bold text-slate-400">{optIdx + 1}.</span>
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                            placeholder={`Option ${optIdx + 1}`}
                                            className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(optIdx)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline transition-colors mt-2"
                            >
                                <Plus size={14} /> Add Option
                            </button>
                        </div>
                    )}

                    {element.label === 'File Upload' && (
                        <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 bg-white flex flex-col items-center justify-center gap-2 text-center">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                                <Upload size={20} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Drag files here or click to browse</span>
                            <span className="text-xs text-slate-400">PDF, DOC, PNG, JPG (Max 10MB)</span>
                        </div>
                    )}

                    {element.label === 'Rating' && (
                        <div className="bg-white p-4 border border-slate-100 rounded-2xl flex flex-col gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Default Rating</span>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        onClick={() => {
                                            setRatingValue(star);
                                            onUpdateField && onUpdateField('defaultValue', star);
                                        }}
                                        className="text-2xl transition-transform hover:scale-110 active:scale-95 text-slate-300 hover:text-amber-400"
                                    >
                                        <Star
                                            size={24}
                                            className={star <= ratingValue ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {element.label === 'Date/Time' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    disabled
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                                />
                            </div>
                            <div className="relative">
                                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="HH:MM"
                                    disabled
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    )}
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

    // Sidebar Widgets Configuration
    const sidebarElements = [
        { icon: Type, label: 'Short Answer', category: 'Basic Inputs' },
        { icon: AlignLeft, label: 'Paragraph', category: 'Basic Inputs' },
        { icon: Calendar, label: 'Date/Time', category: 'Basic Inputs' },

        { icon: CircleDot, label: 'Multiple Choice', category: 'Choice Fields' },
        { icon: CheckSquare, label: 'Checkboxes', category: 'Choice Fields' },
        { icon: List, label: 'Dropdown', category: 'Choice Fields' },

        { icon: Upload, label: 'File Upload', category: 'Advanced Fields' },
        { icon: Star, label: 'Rating', category: 'Advanced Fields' },

        { icon: Mic, label: 'Voice Rec', category: 'Media Elements' },
        { icon: Video, label: 'Video Rec', category: 'Media Elements' }
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

                    // Map backend questions to front-end form elements
                    const loadedElements = (test.questions || []).map(q => {
                        const matched = sidebarElements.find(el => el.label === q.type) || { icon: FileText };
                        return {
                            label: q.type || 'Short Answer',
                            icon: matched.icon,
                            text: q.text || '',
                            options: q.options || []
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
    };

    const handleAddElement = (element) => {
        const defaultOptions = ['Multiple Choice', 'Checkboxes', 'Dropdown'].includes(element.label)
            ? [{ text: 'Option 1', isCorrect: false }, { text: 'Option 2', isCorrect: false }]
            : [];

        setFormElements(prev => [...prev, {
            label: element.label,
            text: '',
            options: defaultOptions,
            icon: sidebarElements.find(s => s.label === element.label)?.icon || FileText
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

    const handlePublish = async () => {
        if (!isConnected || !connectData) {
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

            const testData = {
                testDetails: {
                    title: connectData.name || 'Untitled Form',
                    institute: connectData.institute || 'Default Institute',
                    course: connectData.course || 'Default Course',
                    subject: connectData.subject || 'Default Subject',
                    date: connectData.date || new Date().toISOString().split('T')[0],
                    index: connectData.index || 'Index 1',
                    activity: connectData.activity || 'Quiz'
                },
                questions: formElements.map((el, index) => ({
                    id: `q${index}`,
                    text: el.text?.trim() || `${el.label} Question ${index + 1}`,
                    type: el.label,
                    marks: 1,
                    options: el.options || []
                })),
                settings: {
                    duration: 60,
                    passingMarks: 40
                }
            };

            if (id) {
                await axios.put(`/api/tests/${id}`, testData);
                toast.success('Form updated successfully!');
            } else {
                await axios.post('/api/tests', testData);
                toast.success('Form published successfully!');
            }

            setPublishing(false);
            navigate('/admin/tools');
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
    const categories = ['Basic Inputs', 'Choice Fields', 'Advanced Fields', 'Media Elements'];

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
                        onClick={handlePublish}
                        disabled={publishing}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Send size={16} />
                        <span>{publishing ? 'Publishing...' : 'Publish'}</span>
                    </button>
                </div>
            </header>

            {/* Secondary Toolbar */}
            <div className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-40">
                <div className="flex items-center gap-6">
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

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar (Only visible when in Edit tab) */}
                {activeTab === 'Edit' && (
                    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-sm">
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
                                categories.map((cat, catIdx) => {
                                    const catElements = filteredElements.filter(el => el.category === cat);
                                    if (catElements.length === 0) return null;

                                    return (
                                        <div key={catIdx} className="space-y-3">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">{cat}</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {catElements.map((el, idx) => (
                                                    <div
                                                        key={idx}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, el)}
                                                        onClick={() => handleAddElement(el)}
                                                        className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 transition-all group cursor-grab active:cursor-grabbing text-center"
                                                        title="Drag onto canvas or click to append"
                                                    >
                                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mb-2 group-hover:scale-110 transition-transform duration-300">
                                                            <el.icon size={20} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-purple-600 transition-colors leading-tight">{el.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
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

                {/* Main Content Area */}
                <main className="flex-1 bg-slate-50 relative flex flex-col overflow-hidden">

                    {/* Dotted Grid Canvas for Edit tab */}
                    {activeTab === 'Edit' && (
                        <div
                            className="flex-1 overflow-y-auto relative p-8 bg-slate-50 transition-colors pb-24"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            style={{
                                backgroundImage: 'radial-gradient(#d8b4fe 1.5px, transparent 1.5px)',
                                backgroundSize: '24px 24px'
                            }}
                        >
                            <div className="max-w-3xl mx-auto min-h-[600px] pb-12">
                                {formElements.length === 0 ? (
                                    <div className="mt-20 flex items-center justify-center">
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
                                        {formElements.map((el, index) => (
                                            <div key={index} className="animate-fade-in">
                                                {el.label === 'Short Answer' ? (
                                                    <ShortAnswerWidget
                                                        initialText={el.text || ''}
                                                        onUpdate={(text) => updateElementText(index, text)}
                                                        onDelete={() => {
                                                            const newElements = [...formElements];
                                                            newElements.splice(index, 1);
                                                            setFormElements(newElements);
                                                        }}
                                                    />
                                                ) : el.label === 'Paragraph' ? (
                                                    <ParagraphWidget
                                                        initialText={el.text || ''}
                                                        onUpdate={(text) => updateElementText(index, text)}
                                                        onDelete={() => {
                                                            const newElements = [...formElements];
                                                            newElements.splice(index, 1);
                                                            setFormElements(newElements);
                                                        }}
                                                    />
                                                ) : el.label === 'Voice Rec' ? (
                                                    <VoiceWidget
                                                        initialText={el.text || ''}
                                                        onUpdate={(text) => updateElementText(index, text)}
                                                        onDelete={() => {
                                                            const newElements = [...formElements];
                                                            newElements.splice(index, 1);
                                                            setFormElements(newElements);
                                                        }}
                                                    />
                                                ) : el.label === 'Video Rec' ? (
                                                    <VideoWidget
                                                        initialText={el.text || ''}
                                                        onUpdate={(text) => updateElementText(index, text)}
                                                        onDelete={() => {
                                                            const newElements = [...formElements];
                                                            newElements.splice(index, 1);
                                                            setFormElements(newElements);
                                                        }}
                                                    />
                                                ) : (
                                                    <CustomFormFieldWidget
                                                        element={el}
                                                        index={index}
                                                        onDelete={() => {
                                                            const newElements = [...formElements];
                                                            newElements.splice(index, 1);
                                                            setFormElements(newElements);
                                                        }}
                                                        onUpdateText={(text) => updateElementText(index, text)}
                                                        onUpdateOptions={(options) => updateElementOptions(index, options)}
                                                        onUpdateField={(field, val) => updateElementField(index, field, val)}
                                                    />
                                                )}
                                            </div>
                                        ))}
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
                            <div className="max-w-4xl mx-auto space-y-6">
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
                        <div className="h-14 bg-white border-t border-slate-200 flex items-center justify-center gap-2 absolute bottom-0 w-full z-20 shadow-[0_-5px_10px_rgba(0,0,0,0.01)]">
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
        </div>
    );
};

export default TestBuilder;
