const TrueFalseBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateOptions
}) => {
    const options = element.options || [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false }
    ];
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">True / False Answer Selection</label>
                <div className="grid grid-cols-2 gap-2">
                    {['True', 'False'].map((tfValue) => {
                        const optIdx = tfValue === 'True' ? 0 : 1;
                        const isCorrect = options[optIdx]?.isCorrect || false;
                        return (
                            <button
                                key={tfValue}
                                type="button"
                                onClick={() => {
                                    const newOpts = [
                                        { text: 'True', isCorrect: tfValue === 'True' },
                                        { text: 'False', isCorrect: tfValue === 'False' }
                                    ];
                                    onUpdateOptions(newOpts);
                                }}
                                className={`p-2 rounded-xl border text-center text-sm font-bold transition-all ${isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm shadow-emerald-50'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                                    }`}
                            >
                                {tfValue} {isCorrect ? '✓ (Correct)' : ''}
                            </button>
                        );
                    })}
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

export default TrueFalseBuilder;
