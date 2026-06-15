import { Check, X, Plus } from 'lucide-react';

const MCQBuilder = ({
    element,
    handleUpdateOptionText,
    handleToggleCorrect,
    handleRemoveOption,
    handleAddOption
}) => {
    const options = element.options || [
        { text: 'Option 1', isCorrect: false },
        { text: 'Option 2', isCorrect: false }
    ];

    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">MCQ Options & Answers</label>
            <div className="space-y-1.5">
                {options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-3 bg-white p-1.5 border border-slate-150 rounded-xl hover:border-purple-200 transition-colors">
                        <div className="w-5 h-5 rounded-full border-2 border-purple-300 flex items-center justify-center">
                            {opt.isCorrect && <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>}
                        </div>
                        <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 bg-transparent text-sm text-slate-750 font-bold outline-none"
                        />

                        <button
                            type="button"
                            onClick={() => handleToggleCorrect(optIdx)}
                            className={`p-1.5 rounded-xl text-xs font-bold transition-all ${opt.isCorrect
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                }`}
                            title={opt.isCorrect ? "Correct answer" : "Mark as correct answer"}
                        >
                            <Check size={14} strokeWidth={3} />
                        </button>

                        <button
                            type="button"
                            onClick={() => handleRemoveOption(optIdx)}
                            className="p-1.5 text-slate-350 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-750 transition-colors mt-1.5"
            >
                <Plus size={14} /> Add Option
            </button>
        </div>
    );
};

export default MCQBuilder;
