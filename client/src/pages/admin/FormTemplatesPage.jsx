import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    FileSignature, CreditCard, AppWindow, ShoppingCart, Table,
    GitBranch, FileText, PenTool, Sparkles, Trello
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const FormTemplatesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const getBuilderPath = () => {
        if (!user?.role) return '/admin/activities-builder';
        const role = user.role.toLowerCase();
        return `/${role}/activities-builder`;
    };

    const templates = [
        {
            name: 'Form Builder',
            description: 'Create interactive question forms, quizzes, and tests.',
            icon: FileSignature,
            color: 'bg-red-500 text-white',
            isActive: true,
            action: () => navigate(getBuilderPath())
        },
        {
            name: 'Card Form Templates',
            description: 'Coming soon to the creators suite.',
            icon: CreditCard,
            color: 'bg-blue-500 text-white',
            isActive: false,
            action: () => toast('Card Form Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'App Templates',
            description: 'Coming soon to the creators suite.',
            icon: AppWindow,
            color: 'bg-indigo-600 text-white',
            isActive: false,
            action: () => toast('App Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Store Builder Templates',
            description: 'Coming soon to the creators suite.',
            icon: ShoppingCart,
            color: 'bg-slate-900 text-white',
            isActive: false,
            action: () => toast('Store Builder Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Table Templates',
            description: 'Coming soon to the creators suite.',
            icon: Table,
            color: 'bg-emerald-600 text-white',
            isActive: false,
            action: () => toast('Table Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Workflow Templates',
            description: 'Coming soon to the creators suite.',
            icon: GitBranch,
            color: 'bg-teal-700 text-white',
            isActive: false,
            action: () => toast('Workflow Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'PDF Templates',
            description: 'Coming soon to the creators suite.',
            icon: FileText,
            color: 'bg-sky-500 text-white',
            isActive: false,
            action: () => toast('PDF Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Sign Templates',
            description: 'Coming soon to the creators suite.',
            icon: PenTool,
            color: 'bg-lime-600 text-white',
            isActive: false,
            action: () => toast('Sign Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'AI Agent Templates',
            description: 'Coming soon to the creators suite.',
            icon: Sparkles,
            color: 'bg-violet-600 text-white',
            isActive: false,
            action: () => toast('AI Agent Templates is Coming Soon!', { icon: '🚀' })
        },
        {
            name: 'Board Templates',
            description: 'Coming soon to the creators suite.',
            icon: Trello,
            color: 'bg-cyan-500 text-white',
            isActive: false,
            action: () => toast('Board Templates is Coming Soon!', { icon: '🚀' })
        }
    ];

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="max-w-7xl mx-auto px-4 py-4 font-sans">
                {/* Header */}
                <div className="text-left border-b border-slate-100 pb-3 mb-5">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span>📝</span>
                        <span>Form Builder Templates</span>
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                        Select a template builder to get started
                    </p>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                    {templates.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={index}
                                onClick={item.action}
                                className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3 relative overflow-hidden cursor-pointer group bg-white ${item.isActive
                                    ? 'border-slate-150 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5'
                                    : 'border-slate-100 hover:bg-slate-50/50'
                                    }`}
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${item.color}`}>
                                    <Icon size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-extrabold text-slate-800 text-xs tracking-tight leading-tight group-hover:text-indigo-650 transition-colors">
                                            {item.name}
                                        </h4>
                                        {!item.isActive && (
                                            <span className="bg-slate-100 text-slate-600 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                Soon
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-400 font-semibold text-[10px] mt-0.5 leading-snug">
                                        {item.description}
                                    </p>
                                </div>
                                {item.isActive && (
                                    <span className="text-[11px] font-bold text-slate-450 group-hover:text-indigo-650 transition-colors shrink-0">
                                        →
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FormTemplatesPage;
