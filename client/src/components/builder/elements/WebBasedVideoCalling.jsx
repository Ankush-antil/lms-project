import { Video, Shield, ChevronDown, X, Check } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const VideoCallBuilder = ({
    element,
    onUpdateField,
    handleUpdateNestedField
}) => {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const particulars = element.particulars || {};
    const allowedTeachers = particulars.allowedTeachers || [];

    useEffect(() => { loadTeachers(); }, []);

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

    // Set default allowed teacher to the creator
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
        const updated = allowedTeachers.includes(teacherId)
            ? allowedTeachers.filter(id => id !== teacherId)
            : [...allowedTeachers, teacherId];
        handleUpdateNestedField('particulars', 'allowedTeachers', updated);
    };

    const selectedTeachers = teachers.filter(t => allowedTeachers.includes(t._id));

    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">

            {/* Row 1: 3 columns — Duration | AI Role | Teacher Select */}
            <div className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Call Duration (min)</label>
                    <input
                        type="number"
                        min={1}
                        max={60}
                        value={element.videoCallDuration || 5}
                        onChange={(e) => onUpdateField('videoCallDuration', parseInt(e.target.value) || 5)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">AI Participant Role</label>
                    <select
                        value={element.videoCallRole || 'interviewer'}
                        onChange={(e) => onUpdateField('videoCallRole', e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
                    >
                        <option value="interviewer">Interviewer</option>
                        <option value="customer">Angry Customer</option>
                        <option value="client">Business Client</option>
                        <option value="support">Tech Support</option>
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Selected Teachers</label>
                    <div className="relative" ref={dropdownRef}>
                        {/* Trigger */}
                        <button
                            type="button"
                            onClick={() => setDropdownOpen(prev => !prev)}
                            className="w-full flex items-center justify-between gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white hover:border-purple-400 transition-all outline-none"
                        >
                            <span className="truncate text-left">
                                {loading ? 'Loading...' :
                                    selectedTeachers.length === 0 ? 'Select teachers...' :
                                        selectedTeachers.length === 1 ? selectedTeachers[0].name :
                                            `${selectedTeachers.length} selected`}
                            </span>
                            <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown list */}
                        {dropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                {loading ? (
                                    <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500 font-semibold">
                                        <span className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                                        Loading...
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
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${isSelected ? 'bg-purple-50/60' : ''}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        {t.name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs font-bold text-slate-800 truncate">{t.name}</span>
                                                            {isCreator && (
                                                                <span className="px-1 py-0.5 bg-purple-50 text-purple-700 text-[8px] font-black rounded uppercase tracking-wider border border-purple-100 shrink-0">You</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium truncate block">{t.email}</span>
                                                    </div>
                                                    {isSelected && <Check size={13} className="text-purple-600 shrink-0" strokeWidth={3} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selected teacher chips */}
            {selectedTeachers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedTeachers.map(t => (
                        <span
                            key={t._id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-lg"
                        >
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center font-black shrink-0">{t.name[0]}</span>
                            {t.name}
                            {user?._id !== t._id && (
                                <button type="button" onClick={() => handleToggleTeacher(t._id)} className="ml-0.5 text-purple-400 hover:text-purple-700 transition-colors">
                                    <X size={11} />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Scenario textarea */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Video Call Scenario Details</label>
                <textarea
                    value={element.videoCallScenario || ''}
                    onChange={(e) => onUpdateField('videoCallScenario', e.target.value)}
                    placeholder="Describe the scenario, context or instructions for this roleplay video call..."
                    rows={3}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:bg-white resize-none font-medium"
                />
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

export default VideoCallBuilder;