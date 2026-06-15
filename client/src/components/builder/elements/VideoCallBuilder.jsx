import { Video } from 'lucide-react';

const VideoCallBuilder = ({
    element,
    onUpdateField
}) => {
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
        </div>
    );
};

export default VideoCallBuilder;
