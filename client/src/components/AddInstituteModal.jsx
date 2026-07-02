import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Copy, Check, Upload, Phone, Mail, Headphones, FileText, Shield, ImageIcon, Building } from 'lucide-react';
import { createPortal } from 'react-dom';

const AddInstituteModal = ({ isOpen, onClose, refreshData }) => {
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
        imageUrl: ''
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [docUploading, setDocUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [copied, setCopied] = useState(false);
    const [activeSection, setActiveSection] = useState('basic'); // 'basic' | 'contact' | 'info'
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
                imageUrl: ''
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
