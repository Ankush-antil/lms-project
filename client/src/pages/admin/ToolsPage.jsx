import React from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Camera, Video, Mic, MonitorPlay, Phone, FileSignature } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const ToolCard = ({ icon: Icon, title, onClick, color }) => (
    <div
        onClick={onClick}
        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer group flex flex-col items-center justify-center gap-4 h-48 hover:-translate-y-1"
    >
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
            {/* The icon itself, using the text color from the color prop */}
            <Icon size={32} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors text-center text-sm">{title}</h3>
    </div>
);

const ToolsPage = () => {
    const navigate = useNavigate();

    const tools = [
        { title: 'Screenshot Tool', icon: Camera, color: 'bg-indigo-600', action: () => toast('Screenshot Tool Coming Soon', { icon: '📸' }) },
        { title: 'Screen Recorder', icon: Video, color: 'bg-emerald-600', action: () => toast('Screen Recorder Coming Soon', { icon: '📹' }) },
        { title: 'Voice Recorder', icon: Mic, color: 'bg-blue-600', action: () => toast('Voice Recorder Coming Soon', { icon: '🎙️' }) },
        { title: 'Video Recorder', icon: MonitorPlay, color: 'bg-purple-600', action: () => toast('Video Recorder Coming Soon', { icon: '🎥' }) },
        { title: 'Web-Recording 1 Tool', icon: Phone, color: 'bg-pink-600', action: () => toast('Web-Recording 1 Tool Coming Soon', { icon: '📞' }) },
        { title: 'Form Builder Tool', icon: FileSignature, color: 'bg-orange-600', action: () => navigate('/admin/tests/builder') },
    ];

    return (
        <DashboardLayout role="Admin">
            <div className="max-w-7xl mx-auto px-4">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Editor Tools</h2>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto rounded-full opacity-30"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    {tools.map((tool, index) => (
                        <ToolCard
                            key={index}
                            icon={tool.icon}
                            title={tool.title}
                            color={tool.color}
                            onClick={tool.action}
                        />
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ToolsPage;
