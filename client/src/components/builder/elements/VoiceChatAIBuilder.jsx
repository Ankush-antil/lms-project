const VoiceChatAIBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Voice Persona</label>
                    <select
                        value={element.voicePersona || 'alloy'}
                        onChange={(e) => onUpdateField('voicePersona', e.target.value)}
                        className="w-full text-sm bg-slate-55 border border-slate-200 rounded-xl px-3.5 py-2 outline-none font-semibold"
                    >
                        <option value="alloy">Neutral (Alloy)</option>
                        <option value="echo">Warm Male (Echo)</option>
                        <option value="shimmer">Clear Female (Shimmer)</option>
                        <option value="fable">Deep British (Fable)</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Agent Name</label>
                    <input
                        type="text"
                        value={element.agentName || 'AI Voice Assistant'}
                        onChange={(e) => onUpdateField('agentName', e.target.value)}
                        placeholder="AI Voice Assistant"
                        className="w-full text-sm bg-slate-55 border border-slate-200 rounded-xl px-3.5 py-2 outline-none"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">AI Prompt Scenario</label>
                <textarea
                    value={element.systemPersona || ''}
                    onChange={(e) => onUpdateField('systemPersona', e.target.value)}
                    placeholder="Describe the verbal communication persona..."
                    rows={3}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:bg-white resize-none"
                />
            </div>
        </div>
    );
};

export default VoiceChatAIBuilder;
