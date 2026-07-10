import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Copy, Check, Upload, Phone, Mail, Headphones, FileText, Shield, ImageIcon, Building } from 'lucide-react';
import { createPortal } from 'react-dom';

const AddInstituteModal = ({ isOpen, onClose, refreshData }) => {
    const defaultControls = {
        dashboard: { show: true, application: true, staffRequest: true },
        student: { show: true, admissionOpen: true, addStudent: true, editStudent: true },
        teacher: { show: true, hiring: true, addTeacher: true, editTeacher: true },
        editor: { show: true, hiring: true, addEditor: true, editEditor: true },
        course: { show: true, addCourse: true, editCourse: true },
        tools: {
            show: true,
            elementsControl: true,
            inputElements: true,
            displayingElements: true,
            recordingElements: true,
            advanceElements: true,
            addons: true,
            theme: true,
            createWithAi: true,
            integrate: true,
            import: true,
            saveAsTemplate: true,
            decideActivity: true,
            templates: true,
            locationLocked: true,
            logicRules: true,
            monitoring: true,
            connectIt: true,
            profileUnderSettings: true,
            moreSettings: true,
            responses: true,
            collaborate: true,
            manageAccess: true,
            publicToWeb: true
        },
        chat: { show: true }
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
    const [createdUser, setCreatedUser] = useState(null);
    const [copied, setCopied] = useState(false);
    const [activeSection, setActiveSection] = useState('basic'); // 'basic' | 'contact' | 'info' | 'controls'
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const randomPass = Math.random().toString(36).slice(-8);
            setFormData({
                name: '',
                code: '',
                address: '',
                contactEmail: '',
                password: randomPass,
                phone: '',
                helplineNumber: '',
                description: '',
                termsAndPolicies: '',
                imageUrl: '',
                controls: defaultControls
            });
            setImagePreview(null);
            setCreatedUser(null);
            setActiveSection('basic');
        }
    }, [isOpen]);

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
        e.preventDefault();
        if (!formData.name || !formData.code || !formData.contactEmail) {
            toast.error('Institute Name, Code, and Email are required');
            return;
        }
        setLoading(true);
        try {
            const { data } = await axios.post('/api/setup/institutes', formData);
            setCreatedUser({
                name: formData.name,
                email: formData.contactEmail,
                password: data.user?.password || formData.password
            });
            if (refreshData) refreshData();
            toast.success('Institute Registered & Account Created!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating institute');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const text = `LMS Institute Login Credentials:\nInstitute: ${createdUser.name}\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    const sections = [
        { id: 'basic', label: 'Basic Info', icon: Building },
        { id: 'contact', label: 'Contact', icon: Phone },
        { id: 'info', label: 'About & Terms', icon: FileText },
        { id: 'controls', label: 'Controls', icon: Shield },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl md:max-h-[92vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                
                {/* Header Banner */}
                <div className="bg-[#0b1329] relative flex-shrink-0 px-8 pt-7 pb-0">
                    <div className="flex items-center gap-3 mb-5">
                        {/* Image preview circle */}
                        <div
                            onClick={() => !createdUser && fileInputRef.current?.click()}
                            className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-white/20 ${!createdUser ? 'cursor-pointer hover:border-indigo-400 transition-all' : ''} bg-white/10`}
                            title={!createdUser ? 'Click to upload logo' : ''}
                        >
                            {imageUploading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : imagePreview ? (
                                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon size={22} className="text-white/40" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">
                                {createdUser ? 'Institute Created!' : 'Add New Institute'}
                            </h3>
                            {!createdUser && (
                                <p className="text-white/40 text-xs mt-0.5">Click the icon to upload institute logo</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Section Tabs */}
                    {!createdUser && (
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
                    )}
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
                    {!createdUser ? (
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
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Temporary Password</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl py-3 px-4 text-sm font-mono font-bold text-indigo-600 outline-none cursor-not-allowed"
                                            value={formData.password}
                                            readOnly
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
                                                    id="add-policy-doc-input"
                                                    className="hidden"
                                                    onChange={handleDocUpload}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById('add-policy-doc-input').click()}
                                                    className="flex items-center gap-1 px-3 py-1.5 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-650 font-bold rounded-xl text-xs transition-all active:scale-95 flex-shrink-0"
                                                >
                                                    <Upload size={12} /> Upload Doc (PDF/Word)
                                                </button>
                                                {docUploading && <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
                                                {formData.termsAndPolicies && (formData.termsAndPolicies.startsWith('http') || formData.termsAndPolicies.startsWith('/uploads')) && (
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
                                        {/* Dashboard Controls */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-extrabold text-slate-800">1. Dashboard Page</span>
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.controls?.dashboard?.show !== false}
                                                    onChange={(e) => handleNestedControlChange('dashboard', 'show', e.target.checked)}
                                                    className="rounded text-indigo-650"
                                                />
                                            </div>
                                            {(formData.controls?.dashboard?.show !== false) && (
                                                <div className="pl-2 space-y-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.dashboard?.application !== false}
                                                            onChange={(e) => handleNestedControlChange('dashboard', 'application', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Applications Tab
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.dashboard?.staffRequest !== false}
                                                            onChange={(e) => handleNestedControlChange('dashboard', 'staffRequest', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Staff Requests Tab
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* Student Controls */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-extrabold text-slate-800">2. Student Page</span>
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.controls?.student?.show !== false}
                                                    onChange={(e) => handleNestedControlChange('student', 'show', e.target.checked)}
                                                    className="rounded text-indigo-650"
                                                />
                                            </div>
                                            {(formData.controls?.student?.show !== false) && (
                                                <div className="pl-2 space-y-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.student?.admissionOpen !== false}
                                                            onChange={(e) => handleNestedControlChange('student', 'admissionOpen', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Admissions Toggle
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.student?.addStudent !== false}
                                                            onChange={(e) => handleNestedControlChange('student', 'addStudent', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Add Student Button
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.student?.editStudent !== false}
                                                            onChange={(e) => handleNestedControlChange('student', 'editStudent', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Edit Student Button
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* Teacher Controls */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-extrabold text-slate-800">3. Teacher Page</span>
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.controls?.teacher?.show !== false}
                                                    onChange={(e) => handleNestedControlChange('teacher', 'show', e.target.checked)}
                                                    className="rounded text-indigo-650"
                                                />
                                            </div>
                                            {(formData.controls?.teacher?.show !== false) && (
                                                <div className="pl-2 space-y-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.teacher?.hiring !== false}
                                                            onChange={(e) => handleNestedControlChange('teacher', 'hiring', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Hiring Status Toggle
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.teacher?.addTeacher !== false}
                                                            onChange={(e) => handleNestedControlChange('teacher', 'addTeacher', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Add Teacher Button
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.teacher?.editTeacher !== false}
                                                            onChange={(e) => handleNestedControlChange('teacher', 'editTeacher', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Edit Teacher Button
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* Editor Controls */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-extrabold text-slate-800">4. Editor Page</span>
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.controls?.editor?.show !== false}
                                                    onChange={(e) => handleNestedControlChange('editor', 'show', e.target.checked)}
                                                    className="rounded text-indigo-650"
                                                />
                                            </div>
                                            {(formData.controls?.editor?.show !== false) && (
                                                <div className="pl-2 space-y-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.editor?.hiring !== false}
                                                            onChange={(e) => handleNestedControlChange('editor', 'hiring', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Hiring Status Toggle
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.editor?.addEditor !== false}
                                                            onChange={(e) => handleNestedControlChange('editor', 'addEditor', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Add Editor Button
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.editor?.editEditor !== false}
                                                            onChange={(e) => handleNestedControlChange('editor', 'editEditor', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Edit Editor Button
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* Course Controls */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-extrabold text-slate-800">5. Course Page</span>
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.controls?.course?.show !== false}
                                                    onChange={(e) => handleNestedControlChange('course', 'show', e.target.checked)}
                                                    className="rounded text-indigo-650"
                                                />
                                            </div>
                                            {(formData.controls?.course?.show !== false) && (
                                                <div className="pl-2 space-y-2">
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.course?.addCourse !== false}
                                                            onChange={(e) => handleNestedControlChange('course', 'addCourse', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Add Course Button
                                                    </label>
                                                    <label className="flex items-center gap-2.5 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.course?.editCourse !== false}
                                                            onChange={(e) => handleNestedControlChange('course', 'editCourse', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        Show Edit Course Button
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* Activities */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="text-sm font-extrabold text-slate-800">6. Tools Page</span>
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.controls?.tools?.show !== false}
                                                    onChange={(e) => handleNestedControlChange('tools', 'show', e.target.checked)}
                                                    className="rounded text-indigo-650"
                                                />
                                            </div>
                                            {formData.controls?.tools?.show !== false && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1 pt-1">
                                                    <label className="flex items-center gap-2 text-xs text-slate-800 font-black cursor-pointer select-none col-span-1 border border-slate-100 p-2 rounded-xl bg-white hover:bg-slate-50 transition-all">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.tools?.formBuilderTool !== false}
                                                            onChange={(e) => handleNestedControlChange('tools', 'formBuilderTool', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        📝 Form Builder Tool
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs text-slate-800 font-black cursor-pointer select-none col-span-1 border border-slate-100 p-2 rounded-xl bg-white hover:bg-slate-50 transition-all">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formData.controls?.tools?.databaseCreatorTool !== false}
                                                            onChange={(e) => handleNestedControlChange('tools', 'databaseCreatorTool', e.target.checked)}
                                                            className="rounded text-indigo-650"
                                                        />
                                                        🗄️ Database Creator Tool
                                                    </label>

                                                    {formData.controls?.tools?.formBuilderTool !== false && (
                                                        <div className="col-span-1 md:col-span-2 mt-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-150/60 space-y-3">
                                                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">Form Builder Sub-features</span>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-1 pt-1">
                                                                <label className="flex items-center gap-2 text-xs text-slate-650 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.elementsControl !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'elementsControl', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Elements Control
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.inputElements !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'inputElements', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Input Elements
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.displayingElements !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'displayingElements', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Displaying Elements
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.recordingElements !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'recordingElements', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Recording Elements
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.advanceElements !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'advanceElements', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Advance Elements
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.addons !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'addons', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Addons
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.theme !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'theme', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Theme
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.createWithAi !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'createWithAi', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Create With AI
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.integrate !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'integrate', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Integrate
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.import !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'import', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Import
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.saveAsTemplate !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'saveAsTemplate', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Save As Template
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.decideActivity !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'decideActivity', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Decide Activity
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.templates !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'templates', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Templates
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.locationLocked !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'locationLocked', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Location Locked
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.logicRules !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'logicRules', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Logic Rules
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.monitoring !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'monitoring', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Monitoring
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.connectIt !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'connectIt', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Connect It
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.profileUnderSettings !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'profileUnderSettings', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Profile Under Settings
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.moreSettings !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'moreSettings', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    More Settings
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.responses !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'responses', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Responses
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.collaborate !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'collaborate', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Collaborate
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.manageAccess !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'manageAccess', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Manage Access
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-slate-655 font-bold cursor-pointer select-none">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={formData.controls?.tools?.publicToWeb !== false}
                                                                        onChange={(e) => handleNestedControlChange('tools', 'publicToWeb', e.target.checked)}
                                                                        className="rounded text-indigo-650"
                                                                    />
                                                                    Public To Web
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Chat */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-extrabold text-slate-800">7. Chat Page</span>
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.controls?.chat?.show !== false}
                                                    onChange={(e) => handleNestedControlChange('chat', 'show', e.target.checked)}
                                                    className="rounded text-indigo-650"
                                                />
                                            </div>
                                        </div>
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
                                            {loading ? 'Creating...' : '✓ Create Institute'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    ) : (
                        /* ── SUCCESS SCREEN ── */
                        <div className="space-y-6 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] flex items-center justify-center mx-auto rotate-12 hover:rotate-0 transition-transform duration-500">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight">Institute Registered!</h4>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    Institute and its Admin account have been successfully created.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4 relative overflow-hidden">
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute top-4 right-4 p-2 bg-white text-slate-400 hover:text-[#0b1329] rounded-xl shadow-sm border border-slate-100 transition-all active:scale-90"
                                    title="Copy to Clipboard"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Login Email</span>
                                    <p className="font-mono text-slate-800 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100">{createdUser.email}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Temporary Password</span>
                                    <p className="font-mono text-indigo-600 font-bold bg-white px-3 py-2 rounded-lg border border-slate-100">{createdUser.password}</p>
                                </div>
                            </div>

                            <button onClick={onClose} className="w-full py-4 bg-[#0b1329] text-white font-bold rounded-2xl shadow-xl hover:bg-[#152244] transition-all active:scale-95">
                                Done
                            </button>
                        </div>
                    )}
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

export default AddInstituteModal;
