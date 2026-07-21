import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FileSignature, Database, X, CreditCard, AppWindow, ShoppingCart, Table, GitBranch, FileText, PenTool, Sparkles, Trello, Mic, MonitorPlay, Upload, Camera, Video, Phone } from 'lucide-react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';

const ToolCard = ({ icon: Icon, title, description, onClick, color, isComingSoon, disabled, disabledNote }) => (
    <div
        onClick={disabled ? undefined : onClick}
        className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-305 flex flex-col justify-between h-[175px] relative overflow-hidden ${
            disabled 
                ? 'opacity-60 cursor-not-allowed border-rose-100 bg-rose-50/5' 
                : 'hover:shadow-lg hover:border-indigo-200 cursor-pointer group hover:-translate-y-1'
        }`}
    >
        {isComingSoon && !disabled && (
            <span className="absolute top-3 right-3 bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                Soon
            </span>
        )}
        {disabled && (
            <span className="absolute top-3 right-3 bg-rose-50 text-rose-600 border border-rose-100 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                Disabled
            </span>
        )}
        <div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${disabled ? 'bg-slate-100 text-slate-400' : `${color} bg-opacity-10 group-hover:scale-105 transition-transform duration-300`}`}>
                <Icon size={18} className={disabled ? 'text-slate-400' : color.replace('bg-', 'text-')} />
            </div>
            <div className="mt-3 text-left">
                <h3 className={`font-extrabold text-slate-800 text-xs tracking-tight ${!disabled ? 'group-hover:text-indigo-650 transition-colors' : ''}`}>{title}</h3>
                <p className="text-slate-400 font-semibold text-[10px] mt-1 leading-snug line-clamp-3">
                    {disabled ? disabledNote || 'This tool has been deactivated by your administrator.' : description}
                </p>
            </div>
        </div>
        <div className="flex items-center justify-end pt-2 mt-auto border-t border-slate-50">
            <span className={`text-[10px] font-bold ${disabled ? 'text-rose-500' : 'text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all'}`}>
                {disabled ? 'Contact Admin' : isComingSoon ? 'Learn More' : 'Open Tool'} →
            </span>
        </div>
    </div>
);

const ToolsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Dynamic builder path based on role
    const getBuilderPath = () => {
        if (!user?.role) return '/admin/activities-builder';
        const role = user.role.toLowerCase();
        return `/${role}/activities-builder`;
    };

    const getToolsControls = () => {
        if (!user) return {};
        if (user.role === 'Admin' || user.role === 'Institute') {
            return {};
        }
        const role = user.role;
        if (role === 'Teacher') return user.teacherProfile?.controls?.tools || {};
        if (role === 'Editor') return user.editorProfile?.controls?.tools || {};
        if (role === 'Accountant') return user.accountantProfile?.controls?.tools || {};
        return {};
    };

    const controls = getToolsControls();
    const isFormBuilderDisabled = controls.formBuilderTool === false;
    const isDatabaseCreatorDisabled = controls.databaseCreatorTool === false;
    const formBuilderNote = controls.note || 'This tool has been deactivated by your administrator.';

    const formTemplatesList = [
        {
            name: 'Form Templates',
            description: 'Create interactive question forms, quizzes, and tests.',
            icon: FileSignature,
            color: 'bg-red-500 text-white',
            isActive: true,
            action: () => {
                setIsModalOpen(false);
                navigate(getBuilderPath());
            }
        },
        {
            name: 'Card Form Templates',
            description: 'Step-by-step single question cards.',
            icon: CreditCard,
            color: 'bg-blue-500 text-white',
            isActive: false,
            action: () => toast('Card Form Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'App Templates',
            description: 'Build customized mobile/web view templates.',
            icon: AppWindow,
            color: 'bg-indigo-600 text-white',
            isActive: false,
            action: () => toast('App Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Store Builder Templates',
            description: 'Templates for digital storefronts and sales.',
            icon: ShoppingCart,
            color: 'bg-slate-900 text-white',
            isActive: false,
            action: () => toast('Store Builder Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Table Templates',
            description: 'Organized relational rows and spreadsheet view.',
            icon: Table,
            color: 'bg-emerald-600 text-white',
            isActive: false,
            action: () => toast('Table Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Workflow Templates',
            description: 'Automate forms routing and approvals.',
            icon: GitBranch,
            color: 'bg-teal-700 text-white',
            isActive: false,
            action: () => toast('Workflow Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'PDF Templates',
            description: 'Design exportable PDF documents.',
            icon: FileText,
            color: 'bg-sky-500 text-white',
            isActive: false,
            action: () => toast('PDF Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Sign Templates',
            description: 'Collect digital signatures and consents.',
            icon: PenTool,
            color: 'bg-lime-600 text-white',
            isActive: false,
            action: () => toast('Sign Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'AI Agent Templates',
            description: 'Deploy AI-driven forms and bots.',
            icon: Sparkles,
            color: 'bg-violet-600 text-white',
            isActive: false,
            action: () => toast('AI Agent Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Board Templates',
            description: 'Kanban boards and workflow trackers.',
            icon: Trello,
            color: 'bg-cyan-500 text-white',
            isActive: false,
            action: () => toast('Board Templates is Coming Soon!', { icon: '🚀' })
        }
    ];

    const isAdmin = user?.role === 'Admin';

    const toolsList = [
        { 
            title: 'Form Builder Tool', 
            description: 'Create interactive question forms, quizzes, tests, and activities using the builder.',
            icon: FileSignature, 
            color: 'bg-orange-600', 
            disabled: isFormBuilderDisabled,
            disabledNote: formBuilderNote,
            action: () => setIsModalOpen(true) 
        },
        { 
            title: 'Database Creator Tool', 
            description: 'Design custom tables, data fields, schemas, and relational database records.',
            icon: Database, 
            color: 'bg-blue-600', 
            isComingSoon: true, 
            disabled: isDatabaseCreatorDisabled,
            disabledNote: formBuilderNote,
            action: () => toast('Database Creator Coming Soon', { icon: '🗄️' }) 
        },
        {
            title: 'Voice Recorder',
            description: 'Record audio notes, speech practice, and pronunciation reviews.',
            icon: Mic,
            color: 'bg-blue-600',
            disabled: false,
            action: () => navigate(`/${user?.role?.toLowerCase() || 'admin'}/tools/voice-recorder`)
        },
        {
            title: 'Video Recorder',
            description: 'Capture high-definition video recordings for presentation and feedback.',
            icon: MonitorPlay,
            color: 'bg-purple-600',
            disabled: false,
            action: () => navigate(`/${user?.role?.toLowerCase() || 'admin'}/tools/video-recorder`)
        },
        {
            title: 'File Uploader',
            description: 'Upload assignments, files, documents, and multimedia attachments.',
            icon: Upload,
            color: 'bg-amber-600',
            disabled: false,
            action: () => navigate(`/${user?.role?.toLowerCase() || 'admin'}/tools/file-uploader`)
        },
        {
            title: 'Screenshot Tool',
            description: 'Capture specific areas of your viewport or app layout instantly.',
            icon: Camera,
            color: 'bg-indigo-600',
            disabled: false,
            action: () => navigate(`/${user?.role?.toLowerCase() || 'admin'}/tools/screenshot`)
        },
        {
            title: 'Screen Recorder',
            description: 'Record your screen and browser window activities with voiceover.',
            icon: Video,
            color: 'bg-emerald-600',
            disabled: false,
            action: () => navigate(`/${user?.role?.toLowerCase() || 'admin'}/tools/screen-recorder`)
        },
        {
            title: 'Web-Calling Tool',
            description: 'Initiate web calling and interactive voice sessions.',
            icon: Phone,
            color: 'bg-pink-600',
            disabled: false,
            action: () => navigate(`/${user?.role?.toLowerCase() || 'admin'}/tools/web-calling`)
        }
    ].filter(tool => !tool.disabled && (!isAdmin || tool.title === 'Form Builder Tool' || tool.title === 'Database Creator Tool'));

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="max-w-7xl mx-auto px-4 py-5 font-sans">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left border-b border-slate-100 pb-3 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                            <span>🛠️</span>
                            <span>Tools Portal</span>
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                            Explore and utilize available creator suite utilities
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin/tools-analytics')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all cursor-pointer self-start sm:self-auto shadow-sm"
                        >
                            <BarChart3 size={15} />
                            <span>Tools Analytics</span>
                        </button>
                    )}
                </div>

                {/* Grid layout containing the active tools */}
                {toolsList.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/60 max-w-md mx-auto p-8 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                            🔒
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-lg">Access Deactivated</h3>
                        <p className="text-slate-400 font-semibold text-xs mt-2 leading-relaxed">
                            {formBuilderNote}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mx-auto py-4">
                        {toolsList.map((tool, index) => (
                            <ToolCard
                                key={index}
                                icon={tool.icon}
                                title={tool.title}
                                description={tool.description}
                                color={tool.color}
                                isComingSoon={tool.isComingSoon}
                                disabled={tool.disabled}
                                disabledNote={tool.disabledNote}
                                onClick={tool.action}
                            />
                        ))}
                    </div>
                )}

            </div>

            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col p-8 md:max-h-[85vh]">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-all cursor-pointer border border-slate-200/50 active:scale-95"
                        >
                            <X size={16} />
                        </button>

                        <div className="text-left border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">TEMPLATES SUITE</h3>
                            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Select a template builder to get started</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar text-left flex-1">
                            {formTemplatesList.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={index}
                                        onClick={item.action}
                                        className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative overflow-hidden cursor-pointer group ${
                                            item.isActive 
                                                ? 'bg-white border-slate-200 hover:border-indigo-350 hover:shadow-md hover:-translate-y-0.5' 
                                                : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${item.color}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-extrabold text-slate-800 text-sm tracking-tight leading-tight group-hover:text-indigo-650 transition-colors">
                                                    {item.name}
                                                </h4>
                                                {!item.isActive && (
                                                    <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                        Soon
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 font-semibold text-[11px] mt-0.5 leading-snug truncate">
                                                {item.isActive ? item.description : 'Coming soon to the creators suite.'}
                                            </p>
                                        </div>
                                        {item.isActive && (
                                            <span className="text-xs text-slate-350 group-hover:text-indigo-650 transition-colors">
                                                Open →
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default ToolsPage;
