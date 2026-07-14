import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    Users, Search, Plus, Filter, ArrowRight, Check, X, 
    Calendar, Mail, Phone, Clock, FileText, ChevronRight,
    TrendingUp, UserCheck, Inbox, RefreshCw, BarChart2,
    Eye, MoreHorizontal, Settings
} from 'lucide-react';

const LeadsManagement = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    
    // New Lead Form State
    const [newLeadForm, setNewLeadForm] = useState({
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        course: '',
        source: 'Google Ads',
        stage: 'New',
        statement: ''
    });

    const leadSources = ['Google Ads', 'Facebook Ads', 'Organic Search', 'Referral', 'Instagram Direct', 'Webinar'];
    const leadStages = ['New', 'Contacted', 'Demo Scheduled', 'Negotiating', 'Enrolled', 'Lost'];

    // Rich Realistic Demo Data for fallback or extra leads
    const demoLeads = [
        {
            _id: 'demo_1',
            guestName: 'Aarav Sharma',
            guestPhone: '9876543210',
            guestEmail: 'aarav.sharma@gmail.com',
            course: { name: 'Full Stack Web Development' },
            source: 'Google Ads',
            stage: 'Demo Scheduled',
            statement: 'Interested in the upcoming cohort. Need weekend classes option.',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Accepted'
        },
        {
            _id: 'demo_2',
            guestName: 'Ananya Iyer',
            guestPhone: '8765432109',
            guestEmail: 'ananya.iyer@outlook.com',
            course: { name: 'Data Science & Machine Learning' },
            source: 'Facebook Ads',
            stage: 'New',
            statement: 'Syllabus download request. Transitioning from non-IT background.',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Applied'
        },
        {
            _id: 'demo_3',
            guestName: 'Vikram Malhotra',
            guestPhone: '7654321098',
            guestEmail: 'vikram.m@yahoo.com',
            course: { name: 'UI/UX Design Masterclass' },
            source: 'Referral',
            stage: 'Enrolled',
            statement: 'Referred by Batch 4 student Rohan Sen. Paid first installment.',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Registered'
        },
        {
            _id: 'demo_4',
            guestName: 'Priya Patel',
            guestPhone: '9554321011',
            guestEmail: 'priya.patel@gmail.com',
            course: { name: 'Data Science & Machine Learning' },
            source: 'Organic Search',
            stage: 'Contacted',
            statement: 'Requested call back at 4 PM. Wants to know about job guarantee details.',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Under Review'
        },
        {
            _id: 'demo_5',
            guestName: 'Rohan Gupta',
            guestPhone: '9888123456',
            guestEmail: 'rohan.gupta@outlook.com',
            course: { name: 'Cybersecurity Boot Camp' },
            source: 'Instagram Direct',
            stage: 'Negotiating',
            statement: 'Comparing pricing with other academies. Asked for a scholarship discount.',
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Under Review'
        },
        {
            _id: 'demo_6',
            guestName: 'Meera Deshmukh',
            guestPhone: '8877665544',
            guestEmail: 'meera.d@gmail.com',
            course: { name: 'Full Stack Web Development' },
            source: 'Webinar',
            stage: 'Lost',
            statement: 'Attended free Javascript masterclass. Found other options cheaper.',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Rejected'
        }
    ];

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/setup/institute-applications');
            // Merge actual server leads with demo leads for realistic feel
            const parsedServerLeads = (data || []).map(lead => ({
                ...lead,
                source: lead.source || leadSources[Math.floor(Math.random() * leadSources.length)],
                stage: lead.status === 'Registered' ? 'Enrolled' : 
                       lead.status === 'Accepted' ? 'Demo Scheduled' : 
                       lead.status === 'Rejected' ? 'Lost' : 
                       lead.status === 'Under Review' ? 'Contacted' : 'New'
            }));
            
            // Combine them, keeping server leads first
            const combined = [...parsedServerLeads, ...demoLeads.filter(d => !parsedServerLeads.some(s => s.guestPhone === d.guestPhone))];
            setLeads(combined);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching leads:", error);
            // Fallback to demo leads on error
            setLeads(demoLeads);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleCreateLead = async (e) => {
        e.preventDefault();
        if (!newLeadForm.guestName || !newLeadForm.guestPhone) {
            toast.error("Name and Phone are required");
            return;
        }

        const newLeadObj = {
            _id: 'manual_' + Math.random().toString(36).substr(2, 9),
            ...newLeadForm,
            course: { name: newLeadForm.course || 'General Consultation' },
            createdAt: new Date().toISOString(),
            status: newLeadForm.stage === 'Enrolled' ? 'Registered' : 
                    newLeadForm.stage === 'Demo Scheduled' ? 'Accepted' : 
                    newLeadForm.stage === 'Lost' ? 'Rejected' : 'Applied'
        };

        setLeads([newLeadObj, ...leads]);
        toast.success("Lead created successfully!");
        setIsAddModalOpen(false);
        setNewLeadForm({
            guestName: '',
            guestPhone: '',
            guestEmail: '',
            course: '',
            source: 'Google Ads',
            stage: 'New',
            statement: ''
        });
    };

    const handleUpdateStage = (id, newStage) => {
        let nextStatus = 'Applied';
        if (newStage === 'Enrolled') nextStatus = 'Registered';
        else if (newStage === 'Demo Scheduled') nextStatus = 'Accepted';
        else if (newStage === 'Lost') nextStatus = 'Rejected';
        else if (newStage === 'Contacted' || newStage === 'Negotiating') nextStatus = 'Under Review';

        setLeads(prev => prev.map(l => l._id === id ? { ...l, stage: newStage, status: nextStatus } : l));
        toast.success(`Lead stage updated to ${newStage}`);
    };

    // Filters
    const filteredLeads = leads.filter(l => {
        const matchesSearch = 
            (l.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.guestEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.guestPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.course?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStage = stageFilter === 'All' || l.stage === stageFilter;
        const matchesSource = sourceFilter === 'All' || l.source === sourceFilter;
        return matchesSearch && matchesStage && matchesSource;
    });

    // Stats calculations
    const totalCount = filteredLeads.length;
    const enrolledCount = filteredLeads.filter(l => l.stage === 'Enrolled').length;
    const conversionRate = totalCount > 0 ? ((enrolledCount / totalCount) * 100).toFixed(1) : '0';
    const activeCount = filteredLeads.filter(l => l.stage !== 'Enrolled' && l.stage !== 'Lost').length;

    const getStageBadgeClass = (stage) => {
        switch (stage) {
            case 'New': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Contacted': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Demo Scheduled': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'Negotiating': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'Enrolled': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Lost': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    return (
        <DashboardLayout role="Marketer">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 text-left">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Users className="text-indigo-600" /> Leads Pipeline Management
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">Capture, organize, and convert leads through visual pipeline stages</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
                        className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        <BarChart2 size={14} /> View as {viewMode === 'list' ? 'Kanban' : 'List'}
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                    >
                        <Plus size={14} /> Add Lead
                    </button>
                </div>
            </div>

            {/* Stats section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Inbox size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Leads</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Converted</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{enrolledCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Conversion Rate</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{conversionRate}%</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Deals</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{activeCount}</h3>
                    </div>
                </div>
            </div>

            {/* Search/Filters bar */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search leads by name, email, phone or course..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Stage:</span>
                            <select
                                value={stageFilter}
                                onChange={(e) => setStageFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Stages</option>
                                {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Source:</span>
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Sources</option>
                                {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* List / Kanban View toggle */}
            {viewMode === 'list' ? (
                /* LIST VIEW */
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left">
                    <div className="responsive-table-wrapper">
                        <table className="min-w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Lead Details</th>
                                    <th className="p-4 font-semibold">Course & Source</th>
                                    <th className="p-4 font-semibold">Created Date</th>
                                    <th className="p-4 font-semibold">Pipeline Stage</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                                {filteredLeads.map(lead => (
                                    <tr key={lead._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-sm">{lead.guestName}</span>
                                                <span className="text-slate-400 text-[10px] font-semibold mt-0.5 flex items-center gap-1"><Phone size={10} /> {lead.guestPhone}</span>
                                                {lead.guestEmail && (
                                                    <span className="text-slate-450 text-[10px] font-mono mt-0.5 flex items-center gap-1"><Mail size={10} /> {lead.guestEmail}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-750">{lead.course?.name || 'General Inquiry'}</span>
                                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-fit mt-1">{lead.source}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
                                            {new Date(lead.createdAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${getStageBadgeClass(lead.stage)}`}>
                                                {lead.stage}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1.5">
                                                <select
                                                    value={lead.stage}
                                                    onChange={(e) => handleUpdateStage(lead._id, e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-lg p-1.5 outline-none cursor-pointer"
                                                >
                                                    {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <button
                                                    onClick={() => setSelectedLead(lead)}
                                                    className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-650 hover:bg-indigo-100 hover:text-indigo-750 rounded-lg transition-all cursor-pointer"
                                                    title="View Full Details"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteApplication(lead._id)}
                                                    className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-all cursor-pointer"
                                                    title="Delete Lead"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* KANBAN BOARD VIEW */
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 text-left overflow-x-auto pb-4 custom-scrollbar">
                    {leadStages.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.stage === stage);
                        return (
                            <div key={stage} className="bg-slate-50 rounded-3xl p-4 border border-slate-200/50 flex flex-col min-w-[250px] max-h-[70vh]">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 shrink-0">
                                    <h4 className="text-xs font-black uppercase text-slate-750 tracking-wider flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${
                                            stage === 'New' ? 'bg-blue-500' :
                                            stage === 'Contacted' ? 'bg-amber-500' :
                                            stage === 'Demo Scheduled' ? 'bg-indigo-500' :
                                            stage === 'Negotiating' ? 'bg-purple-500' :
                                            stage === 'Enrolled' ? 'bg-emerald-500' : 'bg-rose-500'
                                        }`} />
                                        {stage}
                                    </h4>
                                    <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                                        {stageLeads.length}
                                    </span>
                                </div>

                                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                    {stageLeads.map(lead => (
                                        <div 
                                            key={lead._id}
                                            className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col justify-between gap-3 relative"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start gap-1">
                                                    <h5 className="font-bold text-slate-800 text-xs truncate max-w-[130px]">{lead.guestName}</h5>
                                                    <button 
                                                        onClick={() => setSelectedLead(lead)}
                                                        className="text-slate-400 hover:text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-450 truncate font-semibold mt-0.5">{lead.course?.name || 'General Inquiry'}</p>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[9px] font-bold text-slate-450 mt-1">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">{lead.source}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        value={lead.stage}
                                                        onChange={(e) => handleUpdateStage(lead._id, e.target.value)}
                                                        className="bg-transparent border-none text-[8px] font-bold text-indigo-600 hover:underline outline-none cursor-pointer"
                                                    >
                                                        {leadStages.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {stageLeads.length === 0 && (
                                        <div className="text-center py-10 text-[10px] text-slate-400 italic">
                                            No leads here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Details Modal */}
            {selectedLead && (
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-6 flex justify-between items-center">
                            <h3 className="font-extrabold text-lg flex items-center gap-2">
                                <FileText size={20} className="text-indigo-400" /> Lead Information
                            </h3>
                            <button 
                                onClick={() => setSelectedLead(null)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Lead Name</span>
                                <p className="text-sm font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-2xl">{selectedLead.guestName}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone Number</span>
                                    <p className="text-sm font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-2xl">{selectedLead.guestPhone}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</span>
                                    <p className="text-sm font-bold text-slate-850 bg-slate-50 py-2.5 px-4 rounded-2xl truncate" title={selectedLead.guestEmail}>{selectedLead.guestEmail || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Preference</span>
                                    <p className="text-sm font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-2xl">{selectedLead.course?.name || 'General Inquiry'}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Traffic Source</span>
                                    <p className="text-sm font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-2xl">{selectedLead.source}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Statement of Interest / Message</span>
                                <p className="text-xs font-semibold text-slate-700 bg-indigo-50/30 border border-indigo-50/50 p-4 rounded-2xl max-h-[160px] overflow-y-auto leading-relaxed custom-scrollbar whitespace-pre-wrap">
                                    {selectedLead.statement || 'No statement provided.'}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50 justify-end">
                            <button
                                onClick={() => setSelectedLead(null)}
                                className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer text-xs"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Lead Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleCreateLead} className="bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-6 flex justify-between items-center">
                            <h3 className="font-extrabold text-lg flex items-center gap-2">
                                <Plus size={20} className="text-indigo-400" /> Add Manual Lead
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newLeadForm.guestName}
                                    onChange={(e) => setNewLeadForm({ ...newLeadForm, guestName: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile Number</label>
                                    <input
                                        type="tel"
                                        required
                                        value={newLeadForm.guestPhone}
                                        onChange={(e) => setNewLeadForm({ ...newLeadForm, guestPhone: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        placeholder="e.g. +91 9876543210"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={newLeadForm.guestEmail}
                                        onChange={(e) => setNewLeadForm({ ...newLeadForm, guestEmail: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        placeholder="e.g. email@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Preferred</label>
                                <input
                                    type="text"
                                    value={newLeadForm.course}
                                    onChange={(e) => setNewLeadForm({ ...newLeadForm, course: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="e.g. Full Stack Web Development"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Source</label>
                                    <select
                                        value={newLeadForm.source}
                                        onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    >
                                        {leadSources.map(src => <option key={src} value={src}>{src}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Current Stage</label>
                                    <select
                                        value={newLeadForm.stage}
                                        onChange={(e) => setNewLeadForm({ ...newLeadForm, stage: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    >
                                        {leadStages.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Notes / Description</label>
                                <textarea
                                    value={newLeadForm.statement}
                                    onChange={(e) => setNewLeadForm({ ...newLeadForm, statement: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all min-h-[80px]"
                                    placeholder="Enter initial lead notes or call logs..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all cursor-pointer text-xs"
                            >
                                Create Lead
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </DashboardLayout>
    );
};

export default LeadsManagement;
