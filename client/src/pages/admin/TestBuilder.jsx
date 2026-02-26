import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Home, Settings, Eye, Send, BarChart2, PieChart, Clock, Users,
    ChevronLeft, Search, Type, AlignLeft, CheckSquare, List,
    ChevronDown, Upload, Star, Calendar, Image as ImageIcon,
    MoreVertical, Plus, Wand2, ArrowLeft,
    FileText, Zap, Layout, Share2, History, MessageSquare,
    Play, PanelLeft, Bot, Palette, Link, Save, Hash, Check,
    FolderUp, CircleDot, File, Mic, Video, Monitor, Camera, Phone, PlaySquare, Box, Globe, Headphones, Brain
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ShortAnswerWidget from '../../components/builder/ShortAnswerWidget';
import VoiceWidget from '../../components/builder/VoiceWidget';
import VideoWidget from '../../components/builder/VideoWidget';
import ParagraphWidget from '../../components/builder/ParagraphWidget';
import ConnectItModal from '../../components/builder/ConnectItModal';

const TestBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Edit');
    const [formElements, setFormElements] = useState([]);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectData, setConnectData] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [loading, setLoading] = useState(!!id);

    useEffect(() => {
        if (id) {
            const fetchTest = async () => {
                try {
                    const res = await axios.get(`/api/tests/${id}`);
                    const test = res.data;

                    setConnectData({
                        name: test.title,
                        institute: test.institute,
                        course: test.course,
                        subject: test.subject,
                        date: test.date,
                        index: test.index,
                        activity: test.activity
                    });
                    setIsConnected(true);

                    // Map backend data back to form elements
                    const loadedElements = (test.questions || []).map(q => ({
                        label: q.type, // Map type back to label
                        // In a more complex app, we'd map all widget properties
                    }));
                    setFormElements(loadedElements);
                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching test for edit:", error);
                    toast.error("Error loading test data");
                    navigate('/admin/tests');
                }
            };
            fetchTest();
        }
    }, [id, navigate]);

    const sidebarElements = [
        { icon: Type, label: 'Short Answer' },
        { icon: AlignLeft, label: 'Paragraph' },
        { icon: Mic, label: 'Voice Rec' },
        { icon: Video, label: 'Video Rec' },
    ];

    const handleDragStart = (e, element) => {
        e.dataTransfer.setData('elementType', JSON.stringify(element));
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const elementData = e.dataTransfer.getData('elementType');
        if (elementData) {
            const element = JSON.parse(elementData);
            // Add text field to track question text
            setFormElements(prev => [...prev, { ...element, text: '' }]);
        }
    };

    // Update a specific element's question text
    const updateElementText = (index, text) => {
        setFormElements(prev => prev.map((el, i) => i === index ? { ...el, text } : el));
    };

    const handleConnectSave = (data) => {
        console.log("Connected with data:", data);
        setConnectData(data);
        setIsConnected(true);
        setIsConnectModalOpen(false);
        toast.success('Test details connected! Don\'t forget to Publish your changes.');
    };

    const handlePublish = async () => {
        if (!isConnected || !connectData) {
            toast.error('Please "Connect it" first using the button in the top bar!');
            setIsConnectModalOpen(true);
            return;
        }

        if (formElements.length === 0) {
            toast.error('Please add at least one element to your test!');
            return;
        }

        try {
            setPublishing(true);

            const testData = {
                testDetails: {
                    title: connectData.name || 'Untitled Test',
                    institute: connectData.institute,
                    course: connectData.course,
                    subject: connectData.subject,
                    date: connectData.date,
                    index: connectData.index,
                    activity: connectData.activity
                },
                questions: formElements.map((el, index) => ({
                    id: `q${index}`,
                    text: el.text?.trim() || `${el.label} Question ${index + 1}`,
                    type: el.label,
                    marks: 1
                })),
                settings: {
                    duration: 60,
                    passingMarks: 40
                }
            };

            if (id) {
                await axios.put(`/api/tests/${id}`, testData);
                toast.success('Test updated successfully!');
            } else {
                await axios.post('/api/tests', testData);
                toast.success('Test published successfully! It will now be visible to students in ' + connectData.course);
            }

            setPublishing(false);
            navigate('/admin/tests');
        } catch (error) {
            console.error("Error publishing test:", error);
            toast.error(error.response?.data?.message || 'Error publishing test');
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-slate-500 font-medium">Loading test data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">

                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/tools')} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-medium text-sm">
                        <Home size={16} /> Home
                    </button>

                    <button
                        onClick={() => setIsConnectModalOpen(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-slate-50 transition-colors ${isConnected ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                    >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isConnected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>i</div>
                        Connect it
                        <div className={`w-4 h-4 border rounded sm:ml-1 flex items-center justify-center ${isConnected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {isConnected && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                    </button>
                </div>



                {/* Right Actions */}
                <div className="flex items-center gap-3">


                    <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="flex items-center gap-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                        <Send size={16} /> {publishing ? 'Publishing...' : 'Publish'}
                    </button>

                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-sm">
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-slate-800">Widgets & Elements</h2>
                            <button className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                <PanelLeft size={18} />
                            </button>
                        </div>

                        <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-lg">
                            <button className="flex-1 py-1.5 text-xs font-semibold text-indigo-600 bg-white shadow-sm rounded-md">Elements</button>
                            <button className="flex-1 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">Addons</button>
                            <button className="flex-1 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">Feathers</button>
                        </div>

                        <button className="w-full py-2 mb-3 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                            <Upload size={16} /> Upload Elements
                        </button>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                            />
                        </div>
                    </div>

                    {/* Elements Grid */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-indigo-100 rounded text-indigo-600">
                                    <Zap size={12} fill="currentColor" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Most Common</span>
                                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">23</span>
                            </div>
                            <ChevronDown size={14} className="text-slate-400" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {sidebarElements.map((el, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, el)}
                                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-500/10 transition-all group cursor-grab active:cursor-grabbing"
                                    onClick={() => setFormElements([...formElements, el])} // Keep click functionality too
                                >
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg mb-2 group-hover:scale-110 transition-transform pointer-events-none">
                                        <el.icon size={20} />
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight pointer-events-none">{el.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Canvas Area */}
                <main className="flex-1 bg-slate-50 relative flex flex-col">
                    {/* Canvas Toolbar */}
                    <div className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-center gap-6 z-10">
                    </div>

                    {/* Canvas Background with Dots - DROP ZONE */}
                    <div
                        className="flex-1 overflow-y-auto relative p-8 bg-slate-50 transition-colors"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        style={{
                            backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
                            backgroundSize: '24px 24px'
                        }}>

                        <div className="max-w-3xl mx-auto relative z-10 min-h-[600px] pb-20 pointer-events-none">
                            {/* Make children pointer-events-auto so they can be interacted with */}
                            <div className="pointer-events-auto">
                                {formElements.length === 0 ? (
                                    <div className="mt-20">
                                        <div className="w-[450px] mx-auto bg-white rounded-2xl p-10 text-center shadow-sm border-2 border-dashed border-slate-200 relative">
                                            {/* Purple Arrow */}
                                            <div className="absolute -left-16 top-10 animate-bounce-x">
                                                <ArrowLeft size={48} className="text-indigo-600" strokeWidth={3} />
                                            </div>

                                            <h3 className="text-2xl font-bold text-slate-800 mb-3">Drag Elements Here</h3>
                                            <p className="text-slate-500 text-sm leading-relaxed mb-8 px-4">
                                                Start building your form by dragging items from the sidebar.
                                                Your form will appear here where you can edit and customize each element.
                                            </p>

                                            <button className="absolute bottom-6 left-6 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all">
                                                <Bot size={16} /> Generate Form with AI
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Form Elements List */}
                                        {formElements.map((el, index) => (
                                            <div key={index} className="mb-4 animate-fade-in">
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
                                                    // Generic fallback for other types for now
                                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:ring-2 hover:ring-indigo-500/20 transition-all relative">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                                <el.icon size={20} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <input
                                                                    type="text"
                                                                    className="w-full font-medium text-slate-700 text-lg border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors bg-transparent py-1"
                                                                    placeholder={`Untitled ${el.label}`}
                                                                />
                                                            </div>
                                                            <button className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors" onClick={() => {
                                                                const newElements = [...formElements];
                                                                newElements.splice(index, 1);
                                                                setFormElements(newElements);
                                                            }}>
                                                                <MoreVertical size={20} />
                                                            </button>
                                                        </div>
                                                        <div className="pl-12">
                                                            <div className="h-12 bg-slate-50 border border-slate-200 border-dashed rounded-lg flex items-center px-4 text-slate-400 text-sm">
                                                                {el.label} placeholder...
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Navigation */}
                    <div className="h-14 bg-white border-t border-slate-200 flex items-center justify-center gap-2 absolute bottom-0 w-full z-20 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
                        <button className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium">
                            <Plus size={16} /> add page
                        </button>
                        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                            <button className="px-3 py-1.5 bg-white shadow-sm rounded-md text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Settings size={14} /> Page
                            </button>
                            <button className="px-3 py-1.5 text-slate-500 text-sm font-medium hover:text-slate-700 flex items-center gap-2">
                                <FileText size={14} /> Ending
                            </button>
                            <button className="px-3 py-1.5 text-slate-500 text-sm font-medium hover:text-slate-700 flex items-center gap-2">
                                <Hash size={14} /> Logic
                            </button>
                            <button className="px-3 py-1.5 text-slate-500 text-sm font-medium hover:text-slate-700 flex items-center gap-2">
                                <Layout size={14} /> Templates
                            </button>
                        </div>
                    </div>

                    {/* Floating Badge */}
                    <div className="absolute bottom-4 right-4 z-30">
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 font-bold text-sm flex items-center gap-2">
                            <Zap size={16} fill="currentColor" /> 55 UI Elements
                        </button>
                    </div>

                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e2e8f0;
                    border-radius: 4px;
                }
                @keyframes bounce-x {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(-5px); }
                }
                .animate-bounce-x {
                    animation: bounce-x 1s infinite;
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
