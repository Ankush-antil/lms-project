import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

const AddInstituteModal = ({ isOpen, onClose, refreshData }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [address, setAddress] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Auto-generate a password on open
            const randomPass = Math.random().toString(36).slice(-8);
            setPassword(randomPass);
            setCreatedUser(null);
            setName('');
            setCode('');
            setAddress('');
            setContactEmail('');
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post('/api/setup/institutes', { 
                name, 
                code, 
                address, 
                contactEmail,
                password 
            });

            setCreatedUser({
                name,
                email: contactEmail,
                password: data.user?.password || password
            });

            setLoading(false);
            if (refreshData) refreshData();
            toast.success('Institute Registered & Account Created!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating institute');
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

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-24 bg-[#0b1329] relative flex-shrink-0">
                    <div className="absolute inset-0 flex items-center px-8">
                        <h3 className="text-xl font-black text-white tracking-tight">
                            {createdUser ? 'Success!' : 'Add New Institute'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {!createdUser ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Global Tech University"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute Code</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all"
                                            required
                                            value={code}
                                            onChange={e => setCode(e.target.value)}
                                            placeholder="e.g. GTU-01"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Contact Email (Gmail)</label>
                                        <input
                                            type="email"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all"
                                            required
                                            value={contactEmail}
                                            onChange={e => setContactEmail(e.target.value)}
                                            placeholder="e.g. contact@institute.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Campus Address</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 transition-all min-h-[100px] resize-none"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        placeholder="Enter full address..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Temporary Password</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl py-3 px-4 text-sm font-mono font-bold text-indigo-600 outline-none"
                                        value={password}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#0b1329] text-white font-bold rounded-2xl shadow-xl shadow-[#0b1329]/10 hover:bg-[#152244] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                {loading ? 'Creating Institute...' : 'Create Institute'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] flex items-center justify-center mx-auto rotate-12 group hover:rotate-0 transition-transform duration-500">
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
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
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
