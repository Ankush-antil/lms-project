import React from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FileSignature, Database } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const ToolCard = ({ icon: Icon, title, description, onClick, color, isComingSoon, disabled, disabledNote }) => (
    <div
        onClick={disabled ? undefined : onClick}
        className={`bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 transition-all duration-300 flex flex-col justify-between h-56 relative overflow-hidden ${
            disabled 
                ? 'opacity-60 cursor-not-allowed border-rose-100 bg-rose-50/5' 
                : 'hover:shadow-xl hover:border-indigo-200 cursor-pointer group hover:-translate-y-1.5'
        }`}
    >
        {isComingSoon && !disabled && (
            <span className="absolute top-4 right-4 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                Coming Soon
            </span>
        )}
        {disabled && (
            <span className="absolute top-4 right-4 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                Disabled
            </span>
        )}
        <div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${disabled ? 'bg-slate-100 text-slate-400' : `${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}`}>
                <Icon size={24} className={disabled ? 'text-slate-400' : color.replace('bg-', 'text-')} />
            </div>
            <div className="mt-5 text-left">
                <h3 className={`font-extrabold text-slate-800 text-base tracking-tight ${!disabled ? 'group-hover:text-indigo-650 transition-colors' : ''}`}>{title}</h3>
                <p className="text-slate-400 font-semibold text-xs mt-1.5 leading-relaxed">
                    {disabled ? disabledNote || 'This tool has been deactivated by your administrator.' : description}
                </p>
            </div>
        </div>
        <div className="flex items-center justify-end pt-3 mt-auto border-t border-slate-50">
            <span className={`text-xs font-bold ${disabled ? 'text-rose-500' : 'text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all'}`}>
                {disabled ? 'Contact Admin' : isComingSoon ? 'Learn More' : 'Open Tool'} →
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

    const getToolsControls = () => {
        if (!user) return {};
        if (user.role === 'Admin' || user.role === 'Institute') {
            return user.institute?.controls?.tools || {};
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

    const toolsList = [
        { 
            title: 'Form Builder Tool', 
            description: 'Create interactive question forms, quizzes, tests, and activities using the builder.',
            icon: FileSignature, 
            color: 'bg-orange-600', 
            disabled: isFormBuilderDisabled,
            disabledNote: formBuilderNote,
            action: () => navigate(getBuilderPath()) 
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
        }
    ].filter(tool => !tool.disabled);

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
                    <div className={`grid grid-cols-1 ${toolsList.length === 1 ? 'max-w-md' : 'md:grid-cols-2 max-w-3xl'} gap-8 mx-auto py-4`}>
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
        </DashboardLayout>
    );
};

export default ToolsPage;
