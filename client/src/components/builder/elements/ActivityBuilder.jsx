const ActivityBuilder = ({
    element,
    onUpdateField
}) => {
    return (
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
                        <option value="AI Lab">AI Lab & Coding Sandbox</option>
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
    );
};

export default ActivityBuilder;
