import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    Camera, Video, Mic, MonitorPlay, Phone, 
    FileSignature, Database, Sparkles, ArrowLeft,
    Sliders, Code, Laptop
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const CategoryCard = ({ icon: Icon, title, description, count, onClick, gradient }) => (
    <div
        onClick={onClick}
        className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-72 hover:-translate-y-1.5 relative overflow-hidden"
    >
        {/* Background glow effect */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${gradient}`}></div>
        
        <div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={26} />
            </div>
            <div className="mt-6 text-left">
                <h3 className="font-extrabold text-slate-800 text-lg tracking-tight group-hover:text-indigo-650 transition-colors">{title}</h3>
                <p className="text-slate-400 font-semibold text-xs mt-2 leading-relaxed">{description}</p>
            </div>
        </div>
        
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {count} {count === 1 ? 'Tool' : 'Tools'}
            </span>
            <span className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1.5 transition-all text-sm font-bold">
                Explore →
            </span>
        </div>
    </div>
);

const ToolCard = ({ icon: Icon, title, onClick, color, isComingSoon }) => (
    <div
        onClick={onClick}
        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-150 hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center gap-4 h-48 hover:-translate-y-1 relative"
    >
        {isComingSoon && (
            <span className="absolute top-3 right-3 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                Coming Soon
            </span>
        )}
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={30} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="font-extrabold text-slate-700 group-hover:text-indigo-750 transition-colors text-center text-xs tracking-tight">{title}</h3>
    </div>
);

const ToolsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeView, setActiveView] = useState('main'); // 'main' | 'editor' | 'creator'

    const rolePath = user?.role ? `/${user.role.toLowerCase()}` : '/admin';

    // Dynamic builder path based on role
    const getBuilderPath = () => {
        if (!user?.role) return '/admin/activities-builder';
        const role = user.role.toLowerCase();
        return `/${role}/activities-builder`;
    };

    const editorToolsList = [
        { title: 'Screenshot Tool', icon: Camera, color: 'bg-indigo-600', action: () => toast('Screenshot Tool Coming Soon', { icon: '📸' }) },
        { title: 'Screen Recorder', icon: Video, color: 'bg-emerald-600', action: () => toast('Screen Recorder Coming Soon', { icon: '📹' }) },
        { title: 'Voice Recorder', icon: Mic, color: 'bg-blue-600', action: () => toast('Voice Recorder Coming Soon', { icon: '🎙️' }) },
        { title: 'Video Recorder', icon: MonitorPlay, color: 'bg-purple-600', action: () => toast('Video Recorder Coming Soon', { icon: '🎥' }) },
        { title: 'Web-Calling Tool', icon: Phone, color: 'bg-pink-600', action: () => toast('Web-Calling Tool Coming Soon', { icon: '📞' }) }
    ];

    const creatorToolsList = [
        { title: 'Form Builder Tool', icon: FileSignature, color: 'bg-orange-600', action: () => navigate(getBuilderPath()) },
        { title: 'Database Creator Tool', icon: Database, color: 'bg-blue-600', isComingSoon: true, action: () => toast('Database Creator Coming Soon', { icon: '🗄️' }) }
    ];

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="max-w-6xl mx-auto px-4 py-6 font-sans">
                
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-10 text-left border-b border-slate-100 pb-5">
                    {activeView !== 'main' && (
                        <button
                            onClick={() => setActiveView('main')}
                            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 bg-white rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                            title="Back to Categories"
                        >
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                            <span>🛠️</span>
                            <span>
                                {activeView === 'main' && 'Tools Portal'}
                                {activeView === 'editor' && 'Editor Tools'}
                                {activeView === 'creator' && 'Creator Tools'}
                            </span>
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                            {activeView === 'main' && 'Select a category to explore available system tools'}
                            {activeView === 'editor' && 'Capture, record, and calling tools for media management'}
                            {activeView === 'creator' && 'Design structures, tests, and data models'}
                        </p>
                    </div>
                </div>

                {/* Main View: Categories List */}
                {activeView === 'main' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-4">
                        <CategoryCard
                            icon={Laptop}
                            title="Editor Tools"
                            description="Capture screenshots, record audio or video content, run screen captures, and trigger live web calls for students and staff."
                            count={editorToolsList.length}
                            onClick={() => setActiveView('editor')}
                            gradient="from-indigo-550 to-purple-600"
                        />
                        <CategoryCard
                            icon={Sliders}
                            title="Creator Tools"
                            description="Build and design interactive online activities, create custom question forms, or initialize data models using the database wizard."
                            count={creatorToolsList.length}
                            onClick={() => setActiveView('creator')}
                            gradient="from-orange-500 to-amber-600"
                        />
                    </div>
                )}

                {/* Editor View */}
                {activeView === 'editor' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 animate-fade-in">
                        {editorToolsList.map((tool, index) => (
                            <ToolCard
                                key={index}
                                icon={tool.icon}
                                title={tool.title}
                                color={tool.color}
                                onClick={tool.action}
                            />
                        ))}
                    </div>
                )}

                {/* Creator View */}
                {activeView === 'creator' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
                        {creatorToolsList.map((tool, index) => (
                            <ToolCard
                                key={index}
                                icon={tool.icon}
                                title={tool.title}
                                color={tool.color}
                                isComingSoon={tool.isComingSoon}
                                onClick={tool.action}
                            />
                        ))}
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
};

export default ToolsPage;
