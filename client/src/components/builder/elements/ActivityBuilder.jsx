const ActivityBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interactive Activity Config</span>
                    <span className="px-2 py-0.5 bg-purple-550 text-white rounded text-[9px] font-bold uppercase tracking-wider">Simulation Block</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-505">Activity Simulator Type</span>
                        <select
                            value={element.activityType || 'AI Lab'}
                            onChange={(e) => onUpdateField('activityType', e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500"
                        >
                            <option value="AI Lab">AI Lab &amp; Coding Sandbox</option>
                            <option value="Language Dialog">Language Dialog speaking</option>
                            <option value="Design Canvas">Interactive Design Canvas</option>
                            <option value="Gamified Quiz">Gamified Quiz Arena</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550">Activity Scenario / Rules</span>
                        <input
                            type="text"
                            value={element.activityRules || ''}
                            onChange={(e) => onUpdateField('activityRules', e.target.value)}
                            placeholder="E.g., Complete writing HTML layout in 5 minutes"
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500"
                        />
                    </div>
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

export default ActivityBuilder;
