import React from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FileSignature, Database } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const ToolCard = ({ icon: Icon, title, description, onClick, color, isComingSoon }) => (
    <div
        onClick={onClick}
        className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-56 hover:-translate-y-1.5 relative overflow-hidden"
    >
        {isComingSoon && (
            <span className="absolute top-4 right-4 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                Coming Soon
            </span>
        )}
        <div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            <div className="mt-5 text-left">
                <h3 className="font-extrabold text-slate-800 text-base tracking-tight group-hover:text-indigo-650 transition-colors">{title}</h3>
                <p className="text-slate-400 font-semibold text-xs mt-1.5 leading-relaxed">{description}</p>
            </div>
        </div>
        <div className="flex items-center justify-end pt-3 mt-auto border-t border-slate-50">
            <span className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all text-xs font-bold">
                {isComingSoon ? 'Learn More' : 'Open Tool'} →
            </span>
        </div>
    </div>
);

const ToolsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Dynamic builder path based on role
    const getBuilderPath = () => {
        if (!user?.role) return '/admin/activities-builder';
        const role = user.role.toLowerCase();
        return `/${role}/activities-builder`;
    };

    const toolsList = [
        { 
            title: 'Form Builder Tool', 
            description: 'Create interactive question forms, quizzes, tests, and activities using the builder.',
            icon: FileSignature, 
            color: 'bg-orange-600', 
            action: () => navigate(getBuilderPath()) 
        },
        { 
            title: 'Database Creator Tool', 
            description: 'Design custom tables, data fields, schemas, and relational database records.',
            icon: Database, 
            color: 'bg-blue-600', 
            isComingSoon: true, 
            action: () => toast('Database Creator Coming Soon', { icon: '🗄️' }) 
        }
    ];

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
                
                {/* Header Section */}
                <div className="text-left border-b border-slate-100 pb-5 mb-10">
                    <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                        <span>🛠️</span>
                        <span>Tools Portal</span>
                    </h2>
                    <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                        Explore and utilize available creator suite utilities
                    </p>
                </div>

                {/* Grid layout containing only the two tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-4">
                    {toolsList.map((tool, index) => (
                        <ToolCard
                            key={index}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            color={tool.color}
                            isComingSoon={tool.isComingSoon}
                            onClick={tool.action}
                        />
                    ))}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default ToolsPage;
