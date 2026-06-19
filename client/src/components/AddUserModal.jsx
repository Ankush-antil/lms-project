import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

const AddUserModal = ({ isOpen, onClose, role, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        course: '',
        institute: '',
        subjects: '',
        subject: '',
        mobileNumber: ''
    });
    const [institutes, setInstitutes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [copied, setCopied] = useState(false);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Auto-generate a password on open
            const randomPass = Math.random().toString(36).slice(-8);
            setFormData(prev => ({ ...prev, password: randomPass }));
            setCreatedUser(null);
            setSubjectDropdownOpen(false);

            // Fetch Setup Data
            const fetchData = async () => {
                try {
                    const instRes = await axios.get('/api/setup/institutes');
                    setInstitutes(instRes.data);

                    const courseRes = await axios.get('/api/setup/courses');
                    setCourses(courseRes.data);
                } catch (error) {
                    console.error("Error fetching setup data:", error);
                    // Optionally, show an error message to the user
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {

            

            const payload = { ...formData, role: role };
            await axios.post('/api/users', payload);

            setCreatedUser({ ...payload }); // Store to show success screen
            if (onSuccess) onSuccess(); // Refresh stats on dashboard
            setLoading(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating user');
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
    const { user } = useAuth();
    const userInfo = user;
        const text = `LMS Login Credentials:\nRole: ${role}\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Filter courses if institute selected
    const filteredCourses = formData.institute
        ? courses.filter(c => c.institute?._id === formData.institute || c.institute === formData.institute)
        : courses;

    const selectedCourseObj = courses.find(c => c._id === formData.course);
    const availableSubjects = selectedCourseObj?.subjects || [];

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                {/* Header Banner */}
                <div className="h-20 bg-blue-500 relative">
                    <div className="absolute inset-0 flex items-center px-5">
                        <h3 className="text-xl font-medium font-black text-white tracking-tight">
                            {createdUser ? 'Success!' : `Add New ${role}`}
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Full Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Institute</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                            required
                                            value={formData.institute}
                                            onChange={e => setFormData({ ...formData, institute: e.target.value, course: '' })}
                                        >
                                            <option value="">Select Institute</option>
                                            {institutes.map(inst => (
                                                <option key={inst._id} value={inst._id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Mobile Number</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            value={formData.mobileNumber}
                                            onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                                            placeholder="+91 98765"
                                        />
                                    </div>
                                </div>



                                {role === 'Student' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Course</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                                    required
                                                    value={formData.course}
                                                    onChange={e => setFormData({ ...formData, course: e.target.value, subject: '' })}
                                                    disabled={!formData.institute}
                                                >
                                                    <option value="">Select</option>
                                                    {filteredCourses.map(course => (
                                                        <option key={course._id} value={course._id}>{course.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Subject</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                                    required={role === 'Student'}
                                                    value={formData.subject}
                                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                    disabled={!formData.course}
                                                >
                                                    <option value="">Select Subject</option>
                                                    {availableSubjects.map(sub => (
                                                        <option key={sub} value={sub}>{sub}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {role === 'Teacher' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Assigned Course</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                                    value={formData.course}
                                                    onChange={e => setFormData({ ...formData, course: e.target.value, subjects: '' })}
                                                    disabled={!formData.institute}
                                                >
                                                    <option value="">Select Course</option>
                                                    {filteredCourses.map(course => (
                                                        <option key={course._id} value={course._id}>{course.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="relative">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Teaching Subjects</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (availableSubjects.length > 0) {
                                                            setSubjectDropdownOpen(!subjectDropdownOpen);
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-750 flex justify-between items-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-left disabled:opacity-50"
                                                    disabled={availableSubjects.length === 0}
                                                >
                                                    <span className="truncate">
                                                        {formData.subjects 
                                                            ? (formData.subjects.split(',').map(s => s.trim()).filter(Boolean).join(', '))
                                                            : "Select Subjects"
                                                        }
                                                    </span>
                                                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${subjectDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                {subjectDropdownOpen && availableSubjects.length > 0 && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setSubjectDropdownOpen(false)} />
                                                        <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 max-h-[180px] overflow-y-auto custom-scrollbar p-2">
                                                            {availableSubjects.map(sub => {
                                                                const currentSubjects = formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                                const isChecked = currentSubjects.includes(sub);
                                                                return (
                                                                    <label key={sub} className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 transition-all select-none">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => {
                                                                                let newSubjects;
                                                                                if (isChecked) {
                                                                                    newSubjects = currentSubjects.filter(s => s !== sub);
                                                                                } else {
                                                                                    newSubjects = [...currentSubjects, sub];
                                                                                }
                                                                                setFormData({ ...formData, subjects: newSubjects.join(', ') });
                                                                            }}
                                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 accent-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                                                            {sub}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                                {availableSubjects.length === 0 && (
                                                    <p className="mt-1.5 text-[10px] text-slate-400 italic">Select a course to view available subjects.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2 block">Temporary Password</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl py-3 px-4 text-sm font-mono font-bold text-indigo-600 outline-none"
                                        value={formData.password}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                {loading ? 'Creating Account...' : `Create ${role}`}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] flex items-center justify-center mx-auto rotate-12 group hover:rotate-0 transition-transform duration-500">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight">User Created!</h4>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    Account for <span className="text-slate-800 font-bold">{createdUser.name}</span> is ready.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4 relative overflow-hidden">
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute top-4 right-4 p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 transition-all active:scale-90"
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

                            <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95">
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

export default AddUserModal;
