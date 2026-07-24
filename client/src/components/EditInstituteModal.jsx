import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Phone, Mail, Headphones, FileText, Shield, ImageIcon, Building, Upload, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { createPortal } from 'react-dom';

const EditInstituteModal = ({ isOpen, onClose, refreshData, institute }) => {
    const defaultControls = {
        dashboard: { show: true, mode: 'hide', note: '', application: true, staffRequest: true },
        student: { show: true, mode: 'hide', note: '', admissionOpen: true, addStudent: true, editStudent: true, dailyAttendanceLog: true, feeManagement: true, studentDirectory: true },
        teacher: { show: true, mode: 'hide', note: '', hiring: true, addTeacher: true, editTeacher: true, teacherDirectory: true, dailyAttendanceLog: true },
        editor: { show: true, mode: 'hide', note: '', hiring: true, addEditor: true, editEditor: true },
        accountant: { show: true, mode: 'hide', note: '', addAccountant: true, editAccountant: true },
        staff: { show: true, mode: 'hide', note: '', addStaff: true, staffDirectory: true, attendanceManagement: true, salaryPayouts: true, taskAssignment: true },
        parent: { show: true, mode: 'hide', note: '', addParent: true, editParent: true },
        course: { show: true, mode: 'hide', note: '', addCourse: true, addNewCourse: true, addNewDemoCourse: true, editCourse: true },
        subject: { show: true, mode: 'hide', note: '', addSubject: true, editSubject: true },
        activities: { show: true, mode: 'hide', note: '', createAssignment: true, editAssignment: true, lmsConnectedTests: true, publicWebTest: true, draftTests: true, openFolderExplorer: true },
        drive: { show: true, mode: 'hide', note: '', newDrive: true, integrateDrive: true, viewDrive: true },
        notes: { show: true, mode: 'hide', note: '', newNote: true, saveDraft: true, saveNotes: true },
        tools: { show: true, mode: 'hide', note: '', formBuilderTool: true, databaseCreatorTool: true, elementsControl: true, inputElements: true, displayingElements: true, recordingElements: true, advanceElements: true, addons: true, theme: true, createWithAi: true, integrate: true, import: true, saveAsTemplate: true, decideActivity: true, templates: true, locationLocked: true, logicRules: true, monitoring: true, connectIt: true, profileUnderSettings: true, moreSettings: true, responses: true, collaborate: true, manageAccess: true, publicToWeb: true },
        chat: { show: true, mode: 'hide', note: '' }
    };

const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        contactEmail: '',
        password: '',
        phone: '',
        helplineNumber: '',
        description: '',
        termsAndPolicies: '',
        imageUrl: '',
        controls: defaultControls
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [docUploading, setDocUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState('basic'); // 'basic' | 'contact' | 'info' | 'controls'
    const fileInputRef = useRef(null);
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderInstituteControlSection = ({ id, label, hasSubControls = false, subControls = null }) => {
        const ctrl = formData.controls?.[id] || { show: true, mode: 'hide', note: '' };
        const isExpanded = !!expandedSections[id];

        return (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 space-y-3 shadow-sm hover:shadow-md/5 transition-all text-left">
                <div 
                    className="flex items-center justify-between border-b border-slate-100 pb-2 cursor-pointer select-none" 
                    onClick={() => hasSubControls && toggleSection(id)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-800">{label}</span>
                        {hasSubControls && (
                            isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />
                        )}
                    </div>
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <select
                            value={ctrl.mode || 'hide'}
                            onChange={e => handleNestedControlChange(id, 'mode', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2 py-0.5 text-[10px] font-bold text-slate-600 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            <option value="hide">Hide</option>
                            <option value="disable">Disable</option>
                        </select>
                        <input 
                            type="checkbox" 
                            checked={ctrl.show !== false} 
                            onChange={e => handleNestedControlChange(id, 'show', e.target.checked)} 
                            className="w-4 h-4 accent-indigo-650 cursor-pointer" 
                        />
                    </div>
                </div>

                {ctrl.show !== false && hasSubControls && isExpanded && (
                    <div className="pl-1 pt-1 space-y-2 animate-fade-in">
                        {subControls}
                    </div>
                )}

                {ctrl.show === false && (
                    <div className="w-full animate-fade-in pt-1">
                        <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest block mb-1">Deactivation Reason / Note</label>
                        <input
                            type="text"
                            value={ctrl.note || ''}
                            onChange={e => handleNestedControlChange(id, 'note', e.target.value)}
                            placeholder={`Reason for deactivating ${label}`}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                        />
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        if (institute && isOpen) {
            setFormData({
                name: institute.name || '',
                code: institute.code || '',
                address: institute.address || '',
                contactEmail: institute.contactEmail || '',
                password: '', // Leave blank unless they want to change it
                phone: institute.phone || '',
                helplineNumber: institute.helplineNumber || '',
                description: institute.description || '',
                termsAndPolicies: institute.termsAndPolicies || '',
                imageUrl: institute.imageUrl || '',
                controls: institute.controls ? {
                    dashboard: { ...defaultControls.dashboard, ...institute.controls.dashboard },
                    student: { ...defaultControls.student, ...institute.controls.student },
                    teacher: { ...defaultControls.teacher, ...institute.controls.teacher },
                    editor: { ...defaultControls.editor, ...institute.controls.editor },
                    course: { ...defaultControls.course, ...institute.controls.course },
                    tools: { ...defaultControls.tools, ...institute.controls.tools },
                    chat: { ...defaultControls.chat, ...institute.controls.chat }
                } : defaultControls
            });
            setImagePreview(institute.imageUrl || null);
            setActiveSection('basic');
        }
    }, [institute, isOpen]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);

        // Upload
        setImageUploading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('image', file);
            const { data } = await axios.post('/api/setup/institutes/upload-image', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
            toast.success('Image uploaded!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Image upload failed');
            setImagePreview(null);
        } finally {
            setImageUploading(false);
        }
    };

    const handleDocUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setDocUploading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('document', file);
            const { data } = await axios.post('/api/setup/institutes/upload-document', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            handleChange('termsAndPolicies', data.documentUrl);
            toast.success('Document uploaded successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Document upload failed');
        } finally {
            setDocUploading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedControlChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            controls: {
                ...prev.controls,
                [section]: {
                    ...prev.controls[section],
                    [field]: value
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        if (!formData.name || !formData.code || !formData.contactEmail) {
            toast.error('Institute Name, Code, and Email are required');
            return;
        }
        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.password) {
                delete payload.password; // Do not update password if it's empty
            }
            
            await axios.put(`/api/setup/institutes/${institute._id}`, payload);

            setLoading(false);
            onClose();
            if (refreshData) refreshData();
            toast.success('Institute Details Updated!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating institute');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const sections = [
        { id: 'basic', label: 'Basic Info', icon: Building },
        { id: 'contact', label: 'Contact', icon: Phone },
        { id: 'info', label: 'About & Terms', icon: FileText },
        { id: 'controls', label: 'Controls', icon: Shield },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md animate-fade-in flex items-center justify-center sm:p-4">
            <div className="bg-white w-full h-full sm:h-auto max-w-2xl sm:max-h-[92vh] rounded-none sm:rounded-[32px] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                
                {/* Header Banner */}
                <div className="bg-[#0b1329] relative flex-shrink-0 px-8 pt-4 pb-0">
                    <div className="flex items-center justify-between gap-4 mb-3 pr-10">
                        <div className="flex items-center gap-3">
                            {/* Image preview circle */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/20 cursor-pointer hover:border-indigo-400 transition-all bg-white/10"
                                title="Click to upload logo"
                            >
                                {imageUploading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : imagePreview ? (
                                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={18} className="text-white/40" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight leading-none">Edit Institute</h3>
                                <span className="text-white/40 text-[10px] mt-1 block">Click logo to change</span>
                            </div>
                        </div>

                        {/* Top Save Button */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                        >
                            {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            Save
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4.5 right-6 p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={16} />
                    </button>

                    {/* Section Tabs */}
                    <div className="flex gap-1">
                        {sections.map(sec => {
                            const IconC = sec.icon;
                            return (
                                <button
                                    key={sec.id}
                                    type="button"
                                    onClick={() => setActiveSection(sec.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
                                        activeSection === sec.id
                                            ? 'bg-white text-[#0b1329]'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <IconC size={13} />
                                    {sec.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                />

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* ── SECTION: Basic Info ── */}
                        {activeSection === 'basic' && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute Name *</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                        required
                                        value={formData.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        placeholder="e.g. Global Tech University"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute Code *</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                            required
                                            value={formData.code}
                                            onChange={e => handleChange('code', e.target.value)}
                                            placeholder="GTU-01"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Contact Email *</label>
                                        <input
                                            type="email"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                            required
                                            value={formData.contactEmail}
                                            onChange={e => handleChange('contactEmail', e.target.value)}
                                            placeholder="admin@institute.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Campus Address</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all min-h-[90px] resize-none"
                                        value={formData.address}
                                        onChange={e => handleChange('address', e.target.value)}
                                        placeholder="Enter full campus address..."
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none block">Change Password</label>
                                        <span className="text-[10px] text-slate-400 font-medium font-mono">Optional</span>
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                        value={formData.password}
                                        onChange={e => handleChange('password', e.target.value)}
                                        placeholder="Leave blank to keep password unchanged"
                                    />
                                </div>

                                {/* Next button */}
                                <button
                                    type="button"
                                    onClick={() => setActiveSection('contact')}
                                    className="w-full py-3.5 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] transition-all text-sm"
                                >
                                    Next: Contact Info →
                                </button>
                            </div>
                        )}

                        {/* ── SECTION: Contact Info ── */}
                        {activeSection === 'contact' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-700 font-semibold flex items-center gap-2">
                                    <Phone size={14} />
                                    Contact info will be shown to students on the public landing page.
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block flex items-center gap-1">
                                        <Mail size={12} /> Primary Contact Number
                                    </label>
                                    <input
                                        type="tel"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                                        value={formData.phone}
                                        onChange={e => handleChange('phone', e.target.value)}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">
                                        Helpline Number
                                        <span className="ml-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest">24/7 Active</span>
                                    </label>
                                    <div className="relative">
                                        <Headphones size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                                        <input
                                            type="tel"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-300 transition-all"
                                            value={formData.helplineNumber}
                                            onChange={e => handleChange('helplineNumber', e.target.value)}
                                            placeholder="1800-XXX-XXXX (Toll Free)"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">This number will be shown as 24/7 available helpline.</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection('basic')}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection('info')}
                                        className="flex-1 py-3.5 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] transition-all text-sm"
                                    >
                                        Next: About & Terms →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SECTION: About & Terms ── */}
                        {activeSection === 'info' && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute Description</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all min-h-[120px] resize-none"
                                        value={formData.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                        placeholder="Write a brief description about the institute — its vision, programs, achievements, etc."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 flex items-center gap-1">
                                        <Shield size={12} className="text-indigo-500" />
                                        Terms & Admission Policies
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all min-h-[70px] resize-none"
                                        value={formData.termsAndPolicies}
                                        onChange={e => handleChange('termsAndPolicies', e.target.value)}
                                        placeholder="Admission eligibility criteria, fee policies, refund policies, code of conduct, etc."
                                    />
                                    
                                    {/* Merged Document Upload Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 px-1">
                                        <p className="text-[10px] text-slate-400">This will be shown as T&C on course application forms.</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                id="edit-policy-doc-input"
                                                className="hidden"
                                                onChange={handleDocUpload}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => document.getElementById('edit-policy-doc-input').click()}
                                                className="flex items-center gap-1 px-3 py-1.5 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-650 font-bold rounded-xl text-xs transition-all active:scale-95 flex-shrink-0"
                                            >
                                                <Upload size={12} /> Upload Doc (PDF/Word)
                                            </button>
                                            {docUploading && <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
                                            {formData.termsAndPolicies && (formData.termsAndPolicies.startsWith('http') || formData.termsAndPolicies.startsWith('/uploads') || formData.termsAndPolicies.startsWith('/api/uploads')) && (
                                                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold flex-shrink-0">
                                                    <Check size={12} />
                                                    <a href={formData.termsAndPolicies} target="_blank" rel="noreferrer" className="underline hover:text-emerald-700 truncate max-w-[120px]">
                                                        View Doc
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection('contact')}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection('controls')}
                                        className="flex-1 py-3.5 bg-[#0b1329] text-white font-bold rounded-2xl hover:bg-[#152244] transition-all text-sm"
                                    >
                                        Next: Controls →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SECTION: Controls ── */}
                        {activeSection === 'controls' && (
                            <div className="space-y-5 animate-fade-in text-left">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-700 font-semibold flex items-center gap-2">
                                    <Shield size={14} className="text-indigo-600 shrink-0" />
                                    Configure which pages and action buttons this institute has access to.
                                </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInstituteControlSection({
                                            id: 'dashboard',
                                            label: 'Dashboard Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.dashboard?.application !== false} onChange={e => handleNestedControlChange('dashboard', 'application', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Applications Tab</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.dashboard?.staffRequest !== false} onChange={e => handleNestedControlChange('dashboard', 'staffRequest', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Staff Requests Tab</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'student',
                                            label: 'Student Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.student?.admissionOpen !== false} onChange={e => handleNestedControlChange('student', 'admissionOpen', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Admission Toggle</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.student?.addStudent !== false} onChange={e => handleNestedControlChange('student', 'addStudent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Student Button</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.student?.editStudent !== false} onChange={e => handleNestedControlChange('student', 'editStudent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Student Button</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.student?.dailyAttendanceLog !== false} onChange={e => handleNestedControlChange('student', 'dailyAttendanceLog', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Daily Attendance Log</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.student?.feeManagement !== false} onChange={e => handleNestedControlChange('student', 'feeManagement', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Fee Management</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.student?.studentDirectory !== false} onChange={e => handleNestedControlChange('student', 'studentDirectory', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Student Directory</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'teacher',
                                            label: 'Teacher Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.teacher?.hiring !== false} onChange={e => handleNestedControlChange('teacher', 'hiring', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Hiring Toggle</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.teacher?.addTeacher !== false} onChange={e => handleNestedControlChange('teacher', 'addTeacher', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Teacher Button</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.teacher?.editTeacher !== false} onChange={e => handleNestedControlChange('teacher', 'editTeacher', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Teacher Button</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.teacher?.teacherDirectory !== false} onChange={e => handleNestedControlChange('teacher', 'teacherDirectory', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Teacher Directory</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.teacher?.dailyAttendanceLog !== false} onChange={e => handleNestedControlChange('teacher', 'dailyAttendanceLog', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Daily Attendance Log</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'editor',
                                            label: 'Editor Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.editor?.hiring !== false} onChange={e => handleNestedControlChange('editor', 'hiring', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Hiring Toggle</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.editor?.addEditor !== false} onChange={e => handleNestedControlChange('editor', 'addEditor', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Editor Button</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.editor?.editEditor !== false} onChange={e => handleNestedControlChange('editor', 'editEditor', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Editor Button</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'accountant',
                                            label: 'Accountant Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.accountant?.addAccountant !== false} onChange={e => handleNestedControlChange('accountant', 'addAccountant', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add New Accountants</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.accountant?.editAccountant !== false} onChange={e => handleNestedControlChange('accountant', 'editAccountant', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'staff',
                                            label: 'My Staff Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.staff?.addStaff !== false} onChange={e => handleNestedControlChange('staff', 'addStaff', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Staff</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.staff?.staffDirectory !== false} onChange={e => handleNestedControlChange('staff', 'staffDirectory', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Staff Directory</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.staff?.attendanceManagement !== false} onChange={e => handleNestedControlChange('staff', 'attendanceManagement', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Attendance Managements</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.staff?.salaryPayouts !== false} onChange={e => handleNestedControlChange('staff', 'salaryPayouts', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Salary &amp; Payouts</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.staff?.taskAssignment !== false} onChange={e => handleNestedControlChange('staff', 'taskAssignment', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Task Assignments</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'parent',
                                            label: 'Parents Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.parent?.addParent !== false} onChange={e => handleNestedControlChange('parent', 'addParent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Parent</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.parent?.editParent !== false} onChange={e => handleNestedControlChange('parent', 'editParent', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'course',
                                            label: 'Course Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.course?.addNewCourse !== false} onChange={e => handleNestedControlChange('course', 'addNewCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add New Course</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.course?.addNewDemoCourse !== false} onChange={e => handleNestedControlChange('course', 'addNewDemoCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add New Demo Course</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.course?.editCourse !== false} onChange={e => handleNestedControlChange('course', 'editCourse', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit Button</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'subject',
                                            label: 'Subject Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.subject?.addSubject !== false} onChange={e => handleNestedControlChange('subject', 'addSubject', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Add Subject</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.subject?.editSubject !== false} onChange={e => handleNestedControlChange('subject', 'editSubject', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({
                                            id: 'activities',
                                            label: 'Activities Page',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.activities?.createAssignment !== false} onChange={e => handleNestedControlChange('activities', 'createAssignment', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Create New Assignment</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.activities?.editAssignment !== false} onChange={e => handleNestedControlChange('activities', 'editAssignment', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Edit</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.activities?.lmsConnectedTests !== false} onChange={e => handleNestedControlChange('activities', 'lmsConnectedTests', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />LMS Connected Tests</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.activities?.publicWebTest !== false} onChange={e => handleNestedControlChange('activities', 'publicWebTest', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Public Web Test</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.activities?.draftTests !== false} onChange={e => handleNestedControlChange('activities', 'draftTests', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Draft Tests</label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.activities?.openFolderExplorer !== false} onChange={e => handleNestedControlChange('activities', 'openFolderExplorer', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Open Folder Explorer</label>
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({ id: 'drive', label: 'Drive Page', hasSubControls: true, subControls: (
                                            <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.drive?.newDrive !== false} onChange={e => handleNestedControlChange('drive', 'newDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />New</label>
                                                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.drive?.integrateDrive !== false} onChange={e => handleNestedControlChange('drive', 'integrateDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Integrate</label>
                                                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.drive?.viewDrive !== false} onChange={e => handleNestedControlChange('drive', 'viewDrive', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />View</label>
                                            </div>
                                        ) })}
                                        
                                        {renderInstituteControlSection({ id: 'notes', label: 'Notes Page', hasSubControls: true, subControls: (
                                            <div className="pl-1 space-y-2 animate-fade-in flex flex-col gap-2">
                                                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.notes?.newNote !== false} onChange={e => handleNestedControlChange('notes', 'newNote', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />New Note</label>
                                                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.notes?.saveDraft !== false} onChange={e => handleNestedControlChange('notes', 'saveDraft', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Save Draft</label>
                                                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.notes?.saveNotes !== false} onChange={e => handleNestedControlChange('notes', 'saveNotes', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />Save Notes</label>
                                            </div>
                                        ) })}

                                        {renderInstituteControlSection({
                                            id: 'tools',
                                            label: 'Form & Database Creator Tools',
                                            hasSubControls: true,
                                            subControls: (
                                                <div className="pl-1 space-y-2 animate-fade-in grid grid-cols-2 gap-2.5 text-left">
                                                    {[
                                                        { id: 'formBuilderTool', label: 'Form Builder' },
                                                        { id: 'databaseCreatorTool', label: 'Database Creator' },
                                                        { id: 'elementsControl', label: 'Elements Control' },
                                                        { id: 'inputElements', label: 'Input Elements' },
                                                        { id: 'displayingElements', label: 'Displaying Elements' },
                                                        { id: 'recordingElements', label: 'Recording Elements' },
                                                        { id: 'advanceElements', label: 'Advance Elements' },
                                                        { id: 'addons', label: 'Add-ons' },
                                                        { id: 'theme', label: 'Theme Styling' },
                                                        { id: 'createWithAi', label: 'Create with AI' },
                                                        { id: 'integrate', label: 'Integrate' },
                                                        { id: 'import', label: 'Import' },
                                                        { id: 'saveAsTemplate', label: 'Save As Template' },
                                                        { id: 'decideActivity', label: 'Decide Activity' },
                                                        { id: 'templates', label: 'Browse Templates' },
                                                        { id: 'locationLocked', label: 'Location Locked' },
                                                        { id: 'logicRules', label: 'Logic Rules' },
                                                        { id: 'monitoring', label: 'Monitoring' },
                                                        { id: 'connectIt', label: 'Connect It' },
                                                        { id: 'profileUnderSettings', label: 'Profile Under Settings' },
                                                        { id: 'moreSettings', label: 'More Settings' },
                                                        { id: 'responses', label: 'Responses' },
                                                        { id: 'collaborate', label: 'Collaborate' },
                                                        { id: 'manageAccess', label: 'Manage Access' },
                                                        { id: 'publicToWeb', label: 'Public to Web' }
                                                    ].map(item => (
                                                        <label key={item.id} className="flex items-center gap-2.5 text-xs text-slate-655 font-bold cursor-pointer"><input type="checkbox" checked={formData.controls?.tools?.[item.id] !== false} onChange={e => handleNestedControlChange('tools', item.id, e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />{item.label}</label>
                                                    ))}
                                                </div>
                                            )
                                        })}

                                        {renderInstituteControlSection({ id: 'chat', label: 'Chat Page' })}
                                    </div>
<div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection('info')}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3.5 bg-[#0b1329] text-white font-bold rounded-2xl shadow-xl shadow-[#0b1329]/10 hover:bg-[#152244] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                    >
                                        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        {loading ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
            <style>{`
                .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>,
        document.body
    );
};

export default EditInstituteModal;
