import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Folder, GitBranch, Star, Share2, Plug, Settings,
    Plus, LayoutTemplate, FileText, Zap, BarChart3, Users, Send, CheckCircle
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const FormBuilderLanding = () => {
    const navigate = useNavigate();

    return (
        <DashboardLayout role="Admin">
            <div className="flex h-[calc(100vh-8rem)] gap-6">
                {/* Inner Sidebar for Form Tool */}
                <div className="w-64 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2">
                    <button className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium">
                        <Folder size={20} /> My Workspaces
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                        <GitBranch size={20} /> My Workflows
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                        <Star size={20} /> My Favorites
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                        <Share2 size={20} /> Shared with me
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                        <Plug size={20} /> Integration
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                        <Settings size={20} /> Settings
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Top Bar inside content */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-800">Digital Study Form tool landing page</h1>
                        <div className="relative flex-1 max-w-md mx-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search forms, templates, or workflows..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="text-sm font-semibold text-slate-600">Change User</button>
                            <Settings size={20} className="text-slate-400" />
                            <div className="w-8 h-8 bg-blue-600 rounded-full text-white flex items-center justify-center font-bold">M</div>
                        </div>
                    </div>

                    {/* Filter Tags */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm">Recent</button>
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50">Contact Information</button>
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50">Party Invite</button>
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50">RSVP</button>
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50">T-Shirt Sign Up</button>
                    </div>

                    {/* Dashboard Widgets */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Create New Form */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                            <h3 className="font-bold text-slate-800 mb-2">Create New Form</h3>
                            <button
                                onClick={() => navigate('/admin/form-builder/create')}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Plus size={18} /> Start from scratch
                            </button>
                            <button className="w-full py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                                <LayoutTemplate size={18} /> Choose a template
                            </button>
                            <button className="w-full py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                                <Plug size={18} /> Integrate form
                            </button>
                            <button className="w-full py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                                <Zap size={18} /> Generate with AI
                            </button>
                        </div>

                        {/* Form Statistics */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-6">Form Statistics</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Total Forms</span>
                                    <span className="font-bold text-blue-600">142</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Users</span>
                                    <span className="font-bold text-blue-600">3.2K</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Responses</span>
                                    <span className="font-bold text-blue-600">4.7K</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Published</span>
                                    <span className="font-bold text-blue-600">89</span>
                                </div>
                            </div>
                        </div>

                        {/* My Workspace */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-6">My Workspace</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="text-slate-400"><Folder size={18} /></div>
                                    <span className="text-slate-600">Academic Research</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-slate-400"><BarChart3 size={18} /></div>
                                    <span className="text-slate-600">Market Surveys</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-slate-400"><Users size={18} /></div>
                                    <span className="text-slate-600">Team Feedback</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-slate-400"><FileText size={18} /></div>
                                    <span className="text-slate-600">Lab Experiments</span>
                                </div>
                            </div>
                        </div>

                        {/* Response Status */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-6">Response Status</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Without Response</span>
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">53</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Scheduled</span>
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">24</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Drafted</span>
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">18</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FormBuilderLanding;
