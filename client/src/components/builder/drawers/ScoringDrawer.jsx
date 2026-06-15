import { X } from 'lucide-react';

const ScoringDrawer = ({
    element,
    onUpdateField,
    setActiveFooterTab
}) => {
    const marks = element.marks !== undefined ? element.marks : 1;
    const negativeMarks = element.negativeMarks || 0;
    const partialMarks = !!element.partialMarks;
    const evaluationMode = element.evaluationMode || 'auto';

    return (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 space-y-3 animate-fade-in shadow-inner text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    Scoring Profile & Grading Scheme
                </span>
                <button
                    type="button"
                    onClick={() => setActiveFooterTab(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded transition-all"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="space-y-3 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550">Marks / Weight Points</span>
                        <input
                            type="number"
                            value={marks}
                            onChange={(e) => onUpdateField('marks', Number(e.target.value))}
                            className="w-full text-xs font-bold bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550">Negative Marking Points</span>
                        <input
                            type="number"
                            value={negativeMarks}
                            onChange={(e) => onUpdateField('negativeMarks', Number(e.target.value))}
                            className="w-full text-xs font-bold bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2 flex flex-col justify-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-655">
                            <input
                                type="checkbox"
                                checked={partialMarks}
                                onChange={(e) => onUpdateField('partialMarks', e.target.checked)}
                                className="rounded text-purple-600 w-4 h-4"
                            />
                            <span>Enable Partial Credit scoring</span>
                        </label>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550">Evaluation Mode</span>
                        <select
                            value={evaluationMode}
                            onChange={(e) => onUpdateField('evaluationMode', e.target.value)}
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5 font-bold text-slate-700"
                        >
                            <option value="auto">Auto Grading</option>
                            <option value="manual">Teacher Review</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoringDrawer;
