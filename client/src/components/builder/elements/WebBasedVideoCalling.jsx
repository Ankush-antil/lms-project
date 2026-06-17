import { Video, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
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

    const particulars = element.particulars || {};
    const allowedTeachers = particulars.allowedTeachers || [];

    useEffect(() => {
        loadTeachers();
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

    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Call Duration (min)</label>
                    <input
                        type="number"
                        min={1}
                        max={60}
                        value={element.videoCallDuration || 5}
                        onChange={(e) => onUpdateField('videoCallDuration', parseInt(e.target.value) || 5)}
                        className="w-full text-sm bg-slate-55 border border-slate-200 rounded-xl px-3.5 py-2 outline-none font-semibold"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">AI Participant Role</label>
                    <select
                        value={element.videoCallRole || 'interviewer'}
                        onChange={(e) => onUpdateField('videoCallRole', e.target.value)}
                        className="w-full text-sm bg-slate-55 border border-slate-200 rounded-xl px-3.5 py-2 outline-none font-semibold"
                    >
                        <option value="interviewer">Interviewer</option>
                        <option value="customer">Angry Customer</option>
                        <option value="client">Business Client</option>
                        <option value="support">Technical Support Agent</option>
                    </select>
                </div>
            </div>

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

            <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 flex items-center gap-3 text-xs text-slate-505 font-medium">
                <Video size={16} className="text-purple-600 animate-pulse" />
                <span>Student will participate in an interactive video call meeting simulation based on the scenario above.</span>
            </div>

            {/* Allowed Teachers Selection - same pattern as audio call builder */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                        <Video size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">Configure Allowed Teachers for Video Calling</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select who students can video call from this element</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-xs font-semibold text-slate-500 flex items-center justify-center py-4">
                        <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                        Loading available teachers...
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                        No active teachers found in the system.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {teachers.map((t) => {
                            const isEnabled = allowedTeachers.includes(t._id);
                            const isCreator = user?._id === t._id;
                            return (
                                <div
                                    key={t._id}
                                    onClick={() => handleToggleTeacher(t._id)}
                                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                                        isEnabled
                                            ? 'bg-white border-purple-200 text-slate-800'
                                            : 'bg-white/60 border-slate-150 text-slate-500 hover:bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                            isEnabled ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {t.name[0]}
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold">{t.name}</span>
                                                {isCreator && (
                                                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[8px] font-black rounded uppercase tracking-wider border border-purple-100">
                                                        Creator
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">{t.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={() => handleToggleTeacher(t._id)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="border border-purple-50 bg-purple-50/30 rounded-xl p-3 flex items-start gap-2.5 text-[10px] text-purple-700/80 font-bold leading-relaxed">
                    <Shield size={14} className="shrink-0 mt-0.5" />
                    <span>By default, only you (the form builder) are enabled to receive video calls. You can enable other teachers to allow students to choose whom they wish to call.</span>
                </div>
            </div>
        </div>
    );
};

export default VideoCallBuilder;