const VoiceChatAIBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
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

export default VoiceChatAIBuilder;
