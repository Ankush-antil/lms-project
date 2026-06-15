import { Plus, X } from 'lucide-react';

const MatchingBuilder = ({
    element,
    onUpdateField
}) => {
    const matchingPairs = element.matchingPairs || [
        { key: "React", value: "Frontend Library" },
        { key: "NodeJS", value: "Backend Runtime" }
    ];

    return (
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
    );
};

export default MatchingBuilder;
