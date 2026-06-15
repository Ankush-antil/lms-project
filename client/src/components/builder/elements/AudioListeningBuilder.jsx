import { Check, X, Plus } from 'lucide-react';

const AudioListeningBuilder = ({
    element,
    onUpdateField,
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
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Audio File URL</label>
                <input
                    type="text"
                    value={element.audioUrl || ''}
                    onChange={(e) => onUpdateField('audioUrl', e.target.value)}
                    placeholder="https://example.com/listening-exercise.mp3"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                />
            </div>
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Multiple Choice Options for Audio</label>
                <div className="space-y-2">
                    {options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3 bg-white p-2.5 border border-slate-100 rounded-xl hover:border-purple-200 transition-colors">
                            <div className="w-5 h-5 rounded-full border-2 border-purple-300 flex items-center justify-center"></div>
                            <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className="flex-1 bg-transparent text-sm text-slate-755 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => handleToggleCorrect(optIdx)}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${opt.isCorrect
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-455 hover:bg-slate-200 hover:text-slate-605'
                                    }`}
                            >
                                <Check size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRemoveOption(optIdx)}
                                className="p-1.5 text-slate-355 hover:text-red-500 rounded-lg hover:bg-red-50"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs font-bold text-purple-650 hover:underline flex items-center gap-1"
                >
                    <Plus size={14} /> Add Option
                </button>
            </div>
        </div>
    );
};

export default AudioListeningBuilder;
