import { Phone, Shield, ChevronDown, X, Check } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const CallRecBuilder = ({
    element,
    handleUpdateNestedField
}) => {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const particulars = element.particulars || {};
    const allowedTeachers = particulars.allowedTeachers || [];

    useEffect(() => {
        loadTeachers();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Set default allowed teacher to the creator (current logged in user)
    useEffect(() => {
        if (user && user._id && !particulars.allowedTeachers) {
            handleUpdateNestedField('particulars', 'allowedTeachers', [user._id]);
        }
    }, [user, particulars.allowedTeachers]);

    const loadTeachers = async () => {
        try {
            const res = await axios.get('/api/calls/teachers');
            setTeachers(res.data);
        } catch (error) {
            console.error('Teacher fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTeacher = (teacherId) => {
        let updated;
        if (allowedTeachers.includes(teacherId)) {
            updated = allowedTeachers.filter(id => id !== teacherId);
        } else {
            updated = [...allowedTeachers, teacherId];
        }
        handleUpdateNestedField('particulars', 'allowedTeachers', updated);
    };

    const selectedTeachers = teachers.filter(t => allowedTeachers.includes(t._id));

    return (
        <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Phone size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">Configure Allowed Teachers for Voice Calling</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select who students can call from this element</p>
                </div>
            </div>

            {/* Dropdown Multi-Select */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Selected Teachers</label>

                <div className="relative" ref={dropdownRef}>
                    {/* Trigger button */}
                    <button
                        type="button"
                        onClick={() => setDropdownOpen(prev => !prev)}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-indigo-400 transition-all outline-none"
                    >
                        <span className="truncate text-left">
                            {loading ? 'Loading teachers...' :
                                selectedTeachers.length === 0 ? 'Select teachers...' :
                                    selectedTeachers.length === 1 ? selectedTeachers[0].name :
                                        `${selectedTeachers.length} teachers selected`}
                        </span>
                        <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Selected teacher chips */}
                    {selectedTeachers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedTeachers.map(t => (
                                <span
                                    key={t._id}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg"
                                >
                                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black shrink-0">{t.name[0]}</span>
                                    {t.name}
                                    {user?._id !== t._id && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleTeacher(t._id)}
                                            className="ml-0.5 text-indigo-400 hover:text-indigo-700 transition-colors"
                                        >
                                            <X size={11} />
                                        </button>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Dropdown list */}
                    {dropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                            {loading ? (
                                <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500 font-semibold">
                                    <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                                    Loading teachers...
                                </div>
                            ) : teachers.length === 0 ? (
                                <div className="px-4 py-3 text-xs font-bold text-red-500">No teachers found.</div>
                            ) : (
                                <div className="max-h-52 overflow-y-auto">
                                    {teachers.map((t) => {
                                        const isSelected = allowedTeachers.includes(t._id);
                                        const isCreator = user?._id === t._id;
                                        return (
                                            <button
                                                key={t._id}
                                                type="button"
                                                onClick={() => handleToggleTeacher(t._id)}
                                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/60' : ''}`}
                                            >
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {t.name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-slate-800 truncate">{t.name}</span>
                                                        {isCreator && (
                                                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black rounded uppercase tracking-wider border border-indigo-100 shrink-0">You</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium truncate block">{t.email}</span>
                                                </div>
                                                {isSelected && <Check size={14} className="text-indigo-600 shrink-0" strokeWidth={3} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Student Answer Box & Enable It Switch */}
            <div className="flex items-center justify-between bg-white px-3.5 py-3.5 border border-slate-200 rounded-xl shadow-sm">
                {particulars.enableAnswerBox !== false ? (
                    <input
                        type="text"
                        placeholder="Type your Answer here"
                        readOnly
                        tabIndex={-1}
                        className="bg-transparent outline-none flex-1 text-sm border-none font-sans pointer-events-none select-none cursor-default text-slate-400"
                    />
                ) : (
                    <div className="text-slate-400 text-sm italic font-semibold">Student Answer Box Disabled</div>
                )}
                <div className="flex items-center gap-3.5 ml-auto select-none border-l border-slate-150 pl-3.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Enable it</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={particulars.enableAnswerBox !== false}
                            onChange={(e) => handleUpdateNestedField('particulars', 'enableAnswerBox', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default CallRecBuilder;