import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Link2, Info, Lock, Clock, Calendar, ShieldCheck, Mail, CheckCircle2, RefreshCw, Folder, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const PublishOptionsModal = ({ isOpen, onClose, onPublish, initialSettings, isConnected, onOpenConnect, initialMode }) => {
    const [publishMode, setPublishMode] = useState('connected'); // 'connected' | 'public'
    const [settings, setSettings] = useState({
        allowMultiple: false,
        startDate: '',
        endDate: '',
        expiryDate: '',
        maxResponses: '',
        timeLimit: 60,
        randomizeQuestions: false,
        showScoreAfterSubmission: true,
        showCorrectAnswers: false,
        allowRetake: false,
        password: '',
        antiSpam: false,
        emailNotification: {
            sendSubmissionNotification: true,
            sendScoreEmail: true,
            sendConfirmationEmail: true
        }
    });

    const [selectedFolder, setSelectedFolder] = useState(null);
    const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
    const [treeData, setTreeData] = useState([]);
    const [loadingTree, setLoadingTree] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const count = parseInt(document.body.dataset.modalCount || '0', 10) + 1;
            document.body.dataset.modalCount = count.toString();
            document.body.style.overflow = 'hidden';
            return () => {
                const newCount = Math.max(0, parseInt(document.body.dataset.modalCount || '1', 10) - 1);
                document.body.dataset.modalCount = newCount.toString();
                if (newCount === 0) {
                    document.body.style.overflow = '';
                }
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const fetchTreeData = async () => {
                try {
                    setLoadingTree(true);
                    const res = await axios.get('/api/public-tests/admin/dashboard');
                    const publicTestsList = res.data || [];
                    
                    const treeMap = {};
                    publicTestsList.forEach(t => {
                        const inst = (t.institute || 'Public Web').trim();
                        const crs = (t.course || (inst === 'Public Web' ? 'Public Access' : 'Unassigned Course')).trim();
                        const subj = (t.subject || (inst === 'Public Web' ? 'General' : 'Unassigned Subject')).trim();
                        
                        if (!treeMap[inst]) {
                            treeMap[inst] = {};
                        }
                        if (!treeMap[inst][crs]) {
                            treeMap[inst][crs] = new Set();
                        }
                        treeMap[inst][crs].add(subj);
                    });
                    
                    const formattedTree = Object.keys(treeMap).map(instName => {
                        return {
                            name: instName,
                            type: 'institute',
                            isPersisted: true,
                            children: Object.keys(treeMap[instName]).map(courseName => {
                                return {
                                    name: courseName,
                                    type: 'course',
                                    isPersisted: true,
                                    children: Array.from(treeMap[instName][courseName]).map(subjectName => {
                                        return {
                                            name: subjectName,
                                            type: 'subject',
                                            isPersisted: true,
                                            children: []
                                        };
                                    })
                                };
                            })
                        };
                    });
                    
                    setTreeData(formattedTree);
                    setLoadingTree(false);
                } catch (err) {
                    console.error("Error loading folder tree:", err);
                    setLoadingTree(false);
                }
            };
            fetchTreeData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialSettings) {
            setSettings(prev => ({
                ...prev,
                ...initialSettings,
                emailNotification: {
                    ...prev.emailNotification,
                    ...(initialSettings.emailNotification || {})
                }
            }));
            if (initialSettings.selectedFolder) {
                setSelectedFolder(initialSettings.selectedFolder);
            } else {
                setSelectedFolder(null);
            }
        }
    }, [initialSettings]);

    useEffect(() => {
        if (initialMode) {
            setPublishMode(initialMode);
        }
    }, [initialMode, isOpen]);

    if (!isOpen) return null;

    const handleEmailNotificationChange = (field, checked) => {
        setSettings(prev => ({
            ...prev,
            emailNotification: {
                ...prev.emailNotification,
                [field]: checked
            }
        }));
    };

    const handleConfirm = () => {
        if (publishMode === 'connected') {
            if (!isConnected) {
                toast.error('LMS configuration not completed. Please connect metadata first.');
                onOpenConnect();
                return;
            }
            onPublish('connected', null);
        } else {
            // Verify public options
            onPublish('public', {
                ...settings,
                selectedFolder
            });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0b1329] flex items-center justify-center text-white shadow-lg">
                            <Globe size={16} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Publish Options</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                    
                    {/* Publishing Modes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Option 1: Connect It */}
                        <div
                            onClick={() => setPublishMode('connected')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden group ${
                                publishMode === 'connected'
                                    ? 'border-[#0b1329] bg-slate-100/50 shadow-md ring-2 ring-slate-200/10'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                            }`}
                        >
                            <div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all mb-4 ${
                                    publishMode === 'connected'
                                        ? 'bg-[#0b1329] border-[#152244] text-white'
                                        : 'bg-slate-100 border-slate-200 text-[#0b1329] group-hover:scale-105'
                                }`}>
                                    <Link2 size={20} />
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-base">Connect It</h3>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    Assign the test only to LMS students. Requires LMS login and course assignment details.
                                </p>
                            </div>
                            
                            {publishMode === 'connected' && (
                                <div className="absolute top-4 right-4 text-[#0b1329]">
                                    <CheckCircle2 size={20} fill="currentColor" className="text-white fill-[#0b1329]" />
                                </div>
                            )}
                        </div>

                        {/* Option 2: Publish to Web */}
                        <div
                            onClick={() => setPublishMode('public')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden group ${
                                publishMode === 'public'
                                    ? 'border-emerald-600 bg-emerald-50/10 shadow-md ring-2 ring-emerald-500/10'
                                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                            }`}
                        >
                            <div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all mb-4 ${
                                    publishMode === 'public'
                                        ? 'bg-emerald-600 border-emerald-700 text-white'
                                        : 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:scale-105'
                                }`}>
                                    <Globe size={20} />
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-base">Publish to Web</h3>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    Generate a unique public link that anyone can attempt without requiring an LMS account.
                                </p>
                            </div>

                            {publishMode === 'public' && (
                                <div className="absolute top-4 right-4 text-emerald-600">
                                    <CheckCircle2 size={20} fill="currentColor" className="text-white fill-emerald-600" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mode-Specific Detailed Settings */}
                    {publishMode === 'connected' ? (
                        <div className="bg-slate-100/20 border border-slate-200 rounded-2xl p-5 space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Info size={16} className="text-[#0b1329]" /> LMS Assignment Details
                            </h4>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                In Connected mode, this test will only show up inside student dashboards who are enrolled in the configured course, institute, and subject.
                            </p>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-xs text-slate-400 font-semibold">
                                    Current Status: {isConnected ? <span className="text-emerald-600 font-bold">● Metadata Connected</span> : <span className="text-amber-500 font-bold">● Connection Required</span>}
                                </span>
                                <button
                                    onClick={onOpenConnect}
                                    className="px-4 py-2 bg-[#0b1329] text-white font-bold rounded-xl text-xs hover:bg-[#152244] transition-colors shadow-sm"
                                >
                                    Configure Connection
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in border-t border-slate-100 pt-6">
                            <h4 className="font-black text-slate-800 text-sm tracking-wider uppercase">Public Link Configuration</h4>
                            
                            {/* Directory Folder Selector Card */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                <h5 className="text-xs font-bold text-slate-550 uppercase tracking-widest flex items-center gap-1.5">
                                    <Folder size={15} className="text-emerald-600" /> Assign Directory Folder (Optional)
                                </h5>
                                <div className="flex items-center justify-between bg-white p-3.5 border border-slate-200 rounded-xl">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Folder Path</span>
                                        <span className="text-xs font-bold text-slate-750 block mt-0.5">
                                            {selectedFolder ? (
                                                [selectedFolder.institute, selectedFolder.course, selectedFolder.subject]
                                                    .filter(Boolean)
                                                    .join(' / ')
                                            ) : 'Public Web / Public Access / General (Default)'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsFolderPickerOpen(true)}
                                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-105 border border-emerald-200 text-emerald-700 font-bold rounded-xl text-xs transition-colors shadow-sm animate-fade-in"
                                    >
                                        Browse for Folder...
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                
                                {/* Access & Security Card */}
                                <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Lock size={14} className="text-emerald-500" /> Access & Security</h5>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Access Password</label>
                                        <input
                                            type="text"
                                            value={settings.password}
                                            onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Leave empty for public access"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-emerald-500 transition-all font-semibold"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!settings.allowMultiple}
                                            onChange={(e) => setSettings(prev => ({ ...prev, allowMultiple: !e.target.checked }))}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        One Response Per Email
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={settings.antiSpam}
                                            onChange={(e) => setSettings(prev => ({ ...prev, antiSpam: e.target.checked }))}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Enable Spam Protection (reCAPTCHA)
                                    </label>
                                </div>

                                {/* Scheduling Card */}
                                <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={14} className="text-emerald-500" /> Test Scheduling</h5>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                                            <input
                                                type="date"
                                                value={settings.startDate}
                                                onChange={(e) => setSettings(prev => ({ ...prev, startDate: e.target.value }))}
                                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                                            <input
                                                type="date"
                                                value={settings.endDate}
                                                onChange={(e) => setSettings(prev => ({ ...prev, endDate: e.target.value }))}
                                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={settings.expiryDate}
                                            onChange={(e) => setSettings(prev => ({ ...prev, expiryDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Maximum Responses Allowed</label>
                                        <input
                                            type="number"
                                            value={settings.maxResponses}
                                            onChange={(e) => setSettings(prev => ({ ...prev, maxResponses: e.target.value }))}
                                            placeholder="E.g. 500 (Leave empty for infinite)"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Flow & Notification Card */}
                                <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={14} className="text-emerald-500" /> Flow & Limits</h5>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Time Limit (Minutes)</label>
                                        <input
                                            type="number"
                                            value={settings.timeLimit}
                                            onChange={(e) => setSettings(prev => ({ ...prev, timeLimit: e.target.value }))}
                                            placeholder="E.g. 60 (Minutes)"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 transition-all"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flow Settings</span>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={settings.randomizeQuestions}
                                                onChange={(e) => setSettings(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                            />
                                            Randomize Question Order
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={settings.showScoreAfterSubmission}
                                                onChange={(e) => setSettings(prev => ({ ...prev, showScoreAfterSubmission: e.target.checked }))}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                            />
                                            Show Score After Submission
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={settings.showCorrectAnswers}
                                                onChange={(e) => setSettings(prev => ({ ...prev, showCorrectAnswers: e.target.checked }))}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                            />
                                            Show Correct Answers
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Email notification preferences card */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                <h5 className="text-xs font-bold text-slate-550 uppercase tracking-widest flex items-center gap-1.5"><Mail size={15} className="text-emerald-600" /> Simulated Email Notifications</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white p-3 border border-slate-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotification.sendConfirmationEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendConfirmationEmail', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Send Confirmation Email
                                    </label>
                                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white p-3 border border-slate-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotification.sendScoreEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendScoreEmail', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Send Score Report Email
                                    </label>
                                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white p-3 border border-slate-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotification.sendSubmissionNotification}
                                            onChange={(e) => handleEmailNotificationChange('sendSubmissionNotification', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Send Admin Alert Notification
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-600 font-bold border border-slate-200 rounded-2xl hover:bg-white hover:shadow-sm transition-all active:scale-95 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-8 py-3 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 text-sm ${
                            publishMode === 'connected'
                                ? 'bg-[#0b1329] hover:bg-[#152244] shadow-[#0b1329]/15'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                        }`}
                    >
                        {publishMode === 'connected' ? 'Save & Assign to LMS' : 'Save & Publish to Web'}
                    </button>
                </div>
            </div>
            
            {/* Windows Browse For Folder Modal */}
            <BrowseFolderDialog
                isOpen={isFolderPickerOpen}
                onClose={() => setIsFolderPickerOpen(false)}
                treeData={treeData}
                onSelect={(folder) => setSelectedFolder(folder)}
                onUpdateTree={(updated) => setTreeData(updated)}
            />
        </div>,
        document.body
    );
};

const BrowseFolderDialog = ({ isOpen, onClose, treeData, onSelect, onUpdateTree }) => {
    const [expandedNodes, setExpandedNodes] = useState({});
    const [selectedPath, setSelectedPath] = useState(null);
    const [editingNode, setEditingNode] = useState(null); // { parentPath: [...], tempName: "New folder", type: "institute"|"course"|"subject" }

    const isFolderEmpty = (path) => {
        if (!path) return false;
        
        if (path.type === 'institute') {
            const inst = treeData.find(i => i.name === path.institute);
            return inst && (!inst.children || inst.children.length === 0);
        }
        
        if (path.type === 'course') {
            const inst = treeData.find(i => i.name === path.institute);
            if (!inst) return false;
            const course = (inst.children || []).find(c => c.name === path.course);
            return course && (!course.children || course.children.length === 0);
        }
        
        if (path.type === 'subject') {
            const inst = treeData.find(i => i.name === path.institute);
            if (!inst) return false;
            const course = (inst.children || []).find(c => c.name === path.course);
            if (!course) return false;
            const subject = (course.children || []).find(s => s.name === path.subject);
            // Empty if it is not marked as persisted (i.e. newly created in front-end)
            return subject && !subject.isPersisted;
        }
        
        return false;
    };

    const handleDeleteFolder = () => {
        if (!selectedPath) return;
        
        const type = selectedPath.type;
        const instName = selectedPath.institute;
        const courseName = selectedPath.course;
        const subjectName = selectedPath.subject;

        let updated = [...treeData];

        if (type === 'institute') {
            updated = updated.filter(i => i.name !== instName);
            onUpdateTree(updated);
            setSelectedPath(null);
            toast.success(`Institute "${instName}" deleted.`);
        } else if (type === 'course') {
            updated = updated.map(inst => {
                if (inst.name === instName) {
                    return {
                        ...inst,
                        children: (inst.children || []).filter(c => c.name !== courseName)
                    };
                }
                return inst;
            });
            onUpdateTree(updated);
            setSelectedPath({
                type: 'institute',
                institute: instName,
                course: null,
                subject: null
            });
            toast.success(`Course "${courseName}" deleted.`);
        } else if (type === 'subject') {
            updated = updated.map(inst => {
                if (inst.name === instName) {
                    return {
                        ...inst,
                        children: (inst.children || []).map(crs => {
                            if (crs.name === courseName) {
                                return {
                                    ...crs,
                                    children: (crs.children || []).filter(s => s.name !== subjectName)
                                };
                            }
                            return crs;
                        })
                    };
                }
                return inst;
            });
            onUpdateTree(updated);
            setSelectedPath({
                type: 'course',
                institute: instName,
                course: courseName,
                subject: null
            });
            toast.success(`Subject "${subjectName}" deleted.`);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const count = parseInt(document.body.dataset.modalCount || '0', 10) + 1;
            document.body.dataset.modalCount = count.toString();
            document.body.style.overflow = 'hidden';
            return () => {
                const newCount = Math.max(0, parseInt(document.body.dataset.modalCount || '1', 10) - 1);
                document.body.dataset.modalCount = newCount.toString();
                if (newCount === 0) {
                    document.body.style.overflow = '';
                }
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleNode = (nodePath) => {
        setExpandedNodes(prev => ({ ...prev, [nodePath]: !prev[nodePath] }));
    };

    const handleSelectNode = (nodePath, type, instName, courseName, subjectName) => {
        setSelectedPath({
            type,
            institute: instName,
            course: courseName,
            subject: subjectName
        });
    };

    const handleCreateNewFolder = () => {
        if (!selectedPath) {
            setEditingNode({
                parentPath: [],
                tempName: 'New Institute',
                type: 'institute'
            });
        } else if (selectedPath.type === 'institute') {
            setEditingNode({
                parentPath: [selectedPath.institute],
                tempName: 'New Course',
                type: 'course'
            });
        } else if (selectedPath.type === 'course') {
            setEditingNode({
                parentPath: [selectedPath.institute, selectedPath.course],
                tempName: 'New Subject',
                type: 'subject'
            });
        } else {
            toast.error("Cannot create subfolder inside a Subject. Please select an Institute or Course node.");
        }
    };

    const handleCommitNewFolder = (value) => {
        if (!editingNode) return;
        const val = value.trim();
        if (!val) {
            setEditingNode(null);
            return;
        }

        const type = editingNode.type;
        const parentPath = editingNode.parentPath;

        if (type === 'institute') {
            if (treeData.some(inst => inst.name.toLowerCase() === val.toLowerCase())) {
                toast.error("An Institute with this name already exists.");
                setEditingNode(null);
                return;
            }
            const newInst = { name: val, type: 'institute', children: [] };
            onUpdateTree([...treeData, newInst]);
            setSelectedPath({
                type: 'institute',
                institute: val,
                course: null,
                subject: null
            });
        } else if (type === 'course') {
            const parentInstName = parentPath[0];
            const updated = treeData.map(inst => {
                if (inst.name === parentInstName) {
                    if ((inst.children || []).some(c => c.name.toLowerCase() === val.toLowerCase())) {
                        toast.error("A Course with this name already exists under this Institute.");
                        return inst;
                    }
                    return {
                        ...inst,
                        children: [...(inst.children || []), { name: val, type: 'course', children: [] }]
                    };
                }
                return inst;
            });
            onUpdateTree(updated);
            setSelectedPath({
                type: 'course',
                institute: parentInstName,
                course: val,
                subject: null
            });
            setExpandedNodes(prev => ({ ...prev, [parentInstName]: true }));
        } else if (type === 'subject') {
            const parentInstName = parentPath[0];
            const parentCourseName = parentPath[1];
            const updated = treeData.map(inst => {
                if (inst.name === parentInstName) {
                    return {
                        ...inst,
                        children: (inst.children || []).map(crs => {
                            if (crs.name === parentCourseName) {
                                if ((crs.children || []).some(s => s.name.toLowerCase() === val.toLowerCase())) {
                                    toast.error("A Subject with this name already exists under this Course.");
                                    return crs;
                                }
                                return {
                                    ...crs,
                                    children: [...(crs.children || []), { name: val, type: 'subject', children: [] }]
                                };
                            }
                            return crs;
                        })
                    };
                }
                return inst;
            });
            onUpdateTree(updated);
            setSelectedPath({
                type: 'subject',
                institute: parentInstName,
                course: parentCourseName,
                subject: val
            });
            setExpandedNodes(prev => ({ ...prev, [`${parentInstName} > ${parentCourseName}`]: true }));
        }

        setEditingNode(null);
    };

    const handleConfirm = () => {
        if (!selectedPath || !selectedPath.institute) {
            toast.error("Please select or create a folder.");
            return;
        }
        onSelect(selectedPath);
        onClose();
    };

    const renderEditingInputRow = (depth) => {
        return (
            <div 
                className="flex items-center gap-1 py-1.5 px-2 bg-slate-100/50 border border-dashed border-slate-300 rounded"
                style={{ paddingLeft: `${Math.max(8, depth * 16)}px` }}
            >
                <span className="w-4 h-4 shrink-0" />
                
                {/* Classic Yellow Folder Icon */}
                <div className="relative w-[18px] h-[14px] flex-shrink-0 select-none mr-1.5">
                    <div className="absolute inset-0 bg-[#eab308] rounded-[1px] shadow-sm">
                        <div className="absolute -top-[1.5px] left-[1.5px] w-[7px] h-[1.5px] bg-[#eab308] rounded-t-[0.5px]" />
                    </div>
                    <div className="absolute left-0 right-0 bottom-0 top-[4px] bg-gradient-to-b from-[#fef08a] to-[#ca8a04] rounded-b-[1px] rounded-t-[0.5px] shadow" />
                </div>

                <input
                    type="text"
                    defaultValue={editingNode.tempName}
                    autoFocus
                    className="px-1.5 py-0.5 border border-slate-350 outline-none text-xs rounded-sm w-36 bg-white font-normal text-slate-800"
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleCommitNewFolder(e.target.value);
                        } else if (e.key === 'Escape') {
                            setEditingNode(null);
                        }
                    }}
                    onBlur={(e) => handleCommitNewFolder(e.target.value)}
                />
            </div>
        );
    };

    const renderNode = (node, pathArr, depth = 0) => {
        const nodePath = pathArr.join(' > ');
        const isExpanded = !!expandedNodes[nodePath];
        const isSelected = selectedPath && 
            (selectedPath.type === node.type) && 
            (selectedPath.institute === pathArr[0]) && 
            (selectedPath.course === pathArr[1]) && 
            (selectedPath.subject === pathArr[2]);

        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={nodePath} className="select-none text-xs">
                <div 
                    className={`flex items-center gap-1 py-1.5 px-2 cursor-pointer rounded transition-all hover:bg-slate-100 ${
                        isSelected ? 'bg-slate-100 border border-dashed border-slate-350 font-bold text-[#0b1329]' : 'text-slate-700'
                    }`}
                    style={{ paddingLeft: `${Math.max(8, depth * 16)}px` }}
                    onClick={() => handleSelectNode(nodePath, node.type, pathArr[0], pathArr[1], pathArr[2])}
                >
                    <span 
                        className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-[10px] shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleNode(nodePath);
                        }}
                    >
                        {node.type !== 'subject' ? (hasChildren ? (isExpanded ? '▼' : '▶') : '▶') : ''}
                    </span>

                    {/* Classic Yellow Folder Icon */}
                    <div className="relative w-[18px] h-[14px] flex-shrink-0 select-none mr-1.5">
                        <div className="absolute inset-0 bg-[#eab308] rounded-[1px] shadow-sm">
                            <div className="absolute -top-[1.5px] left-[1.5px] w-[7px] h-[1.5px] bg-[#eab308] rounded-t-[0.5px]" />
                        </div>
                        <div className="absolute left-0 right-0 bottom-0 top-[4px] bg-gradient-to-b from-[#fef08a] to-[#ca8a04] rounded-b-[1px] rounded-t-[0.5px] shadow" />
                    </div>

                    <span className="truncate">{node.name}</span>
                </div>

                {isExpanded && (
                    <>
                        {node.children && node.children.map(child => {
                            const nextPath = [...pathArr, child.name];
                            return renderNode(child, nextPath, depth + 1);
                        })}
                        {editingNode && editingNode.parentPath.join(' > ') === nodePath && (
                            renderEditingInputRow(depth + 1)
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-100 w-80 rounded-[12px] shadow-2xl border border-slate-350 flex flex-col font-sans text-slate-800 overflow-hidden animate-slide-up select-none">
                {/* Title Bar */}
                <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Browse For Folder</span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* Dialog Body (Tree View Area) */}
                <div className="p-3 flex-1 flex flex-col min-h-0 bg-slate-50">
                    <p className="text-[10px] font-medium text-slate-500 mb-2 leading-tight">
                        Select a folder structure (Institute &rarr; Course &rarr; Subject) to publish the web test under:
                    </p>

                    {/* Tree View Box */}
                    <div className="flex-1 bg-white border border-slate-300 overflow-y-auto p-2 h-60 custom-scrollbar rounded shadow-inner">
                        {treeData.length === 0 && !editingNode ? (
                            <div className="text-center text-slate-405 text-xs py-10">No directories found. Click "Make New Folder" to start.</div>
                        ) : (
                            <>
                                {treeData.map(inst => renderNode(inst, [inst.name], 0))}
                                {editingNode && editingNode.parentPath.length === 0 && (
                                    renderEditingInputRow(0)
                                )}
                            </>
                        )}
                    </div>

                    {/* Selected path display */}
                    <div className="mt-2.5 bg-white border border-slate-200 p-2 rounded text-[10px] font-semibold text-slate-705 min-h-[36px] flex items-center shadow-sm">
                        {selectedPath ? (
                            <div className="flex justify-between items-center w-full min-w-0">
                                <div className="truncate flex-1 min-w-0 pr-1">
                                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Selected Folder</span>
                                    <span className="truncate block mt-0.5 text-[#0b1329] font-bold">
                                        {selectedPath.institute} 
                                        {selectedPath.course && ` > ${selectedPath.course}`}
                                        {selectedPath.subject && ` > ${selectedPath.subject}`}
                                    </span>
                                </div>
                                {isFolderEmpty(selectedPath) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder();
                                        }}
                                        className="text-red-500 hover:text-red-705 hover:bg-red-50 p-1.5 rounded-lg transition-all shrink-0 active:scale-90 border border-slate-200 hover:border-red-200 shadow-sm"
                                        title="Delete empty folder"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <span className="text-slate-400 font-normal">No folder selected</span>
                        )}
                    </div>
                </div>

                {/* Dialog Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-3 py-3 flex justify-between items-center">
                    <button
                        onClick={handleCreateNewFolder}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                    >
                        Make New Folder
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handleConfirm}
                            className="px-4 py-1.5 bg-[#0b1329] text-white hover:bg-[#152244] rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                        >
                            OK
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublishOptionsModal;
