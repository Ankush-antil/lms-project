import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Video, Mic, MonitorPlay, Phone } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const ToolCard = ({ icon: Icon, title, onClick, color }) => (
    <div
        onClick={onClick}
        className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer group flex flex-col items-center justify-center gap-5 h-56 hover:-translate-y-1.5 duration-300"
    >
        <div className={`p-5 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={36} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="font-extrabold text-slate-700 group-hover:text-indigo-700 transition-colors text-center text-sm md:text-base leading-snug">
            {title}
        </h3>
    </div>
);

const PracticeToolsPage = () => {
    const navigate = useNavigate();

    const tools = [
        {
            title: 'Screenshot Tool',
            icon: Camera,
            color: 'bg-indigo-600',
            path: '/student/practice-tools/screenshot'
        },
        {
            title: 'Screen Recorder',
            icon: Video,
            color: 'bg-emerald-600',
            path: '/student/practice-tools/screen-recorder'
        },
        {
            title: 'Voice Recorder',
            icon: Mic,
            color: 'bg-blue-600',
            path: '/student/practice-tools/voice-recorder'
        },
        {
            title: 'Video Recorder',
            icon: MonitorPlay,
            color: 'bg-purple-600',
            path: '/student/practice-tools/video-recorder'
        },
        {
            title: 'Web-Calling Tool',
            icon: Phone,
            color: 'bg-pink-600',
            path: '/student/practice-tools/web-calling'
        }
    ];

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Practice Tools</h2>
                    <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto">
                        Sharpen your skills using our built-in interactive recording and calling tools. Select a tool below to get started.
                    </p>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto rounded-full mt-4 opacity-40"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-8">
                    {tools.map((tool, index) => (
                        <ToolCard
                            key={index}
                            icon={tool.icon}
                            title={tool.title}
                            color={tool.color}
                            onClick={() => navigate(tool.path)}
                        />
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default PracticeToolsPage;
