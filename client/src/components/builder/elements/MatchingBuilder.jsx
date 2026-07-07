import { Plus, X } from 'lucide-react';

const MatchingBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const matchingPairs = element.matchingPairs || [
        { key: "React", value: "Frontend Library" },
        { key: "NodeJS", value: "Backend Runtime" }
    ];
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Matching Items Pair Builder</label>
                <div className="space-y-1.5">
                    {matchingPairs.map((pair, pIdx) => (
                        <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-150 relative">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400">Match Item {pIdx + 1}</span>
                                <input
                                    type="text"
                                    value={pair.key || ''}
                                    onChange={(e) => {
                                        const copy = [...matchingPairs];
                                        copy[pIdx] = { ...copy[pIdx], key: e.target.value };
                                        onUpdateField('matchingPairs', copy);
                                    }}
                                    placeholder="Match Item (e.g. React)"
                                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 outline-none focus:bg-white focus:border-purple-500"
                                />
                            </div>
                            <div className="space-y-1 relative">
                                <span className="text-[9px] font-bold text-slate-400">Target Answer {pIdx + 1}</span>
                                <input
                                    type="text"
                                    value={pair.value || ''}
                                    onChange={(e) => {
                                        const copy = [...matchingPairs];
                                        copy[pIdx] = { ...copy[pIdx], value: e.target.value };
                                        onUpdateField('matchingPairs', copy);
                                    }}
                                    placeholder="Corresponding Match (e.g. Frontend)"
                                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 pr-8 outline-none focus:bg-white focus:border-purple-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const copy = matchingPairs.filter((_, i) => i !== pIdx);
                                        onUpdateField('matchingPairs', copy);
                                    }}
                                    className="absolute right-2 top-5 text-slate-350 hover:text-red-500"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            onUpdateField('matchingPairs', [...matchingPairs, { key: '', value: '' }]);
                        }}
                        className="text-xs font-bold text-purple-650 hover:underline flex items-center gap-1"
                    >
                        <Plus size={13} /> Add Matching Pair
                    </button>
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

export default MatchingBuilder;
