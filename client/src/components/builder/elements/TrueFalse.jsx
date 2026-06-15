const TrueFalseBuilder = ({
    element,
    onUpdateOptions
}) => {
    const options = element.options || [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false }
    ];

    return (
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
    );
};

export default TrueFalseBuilder;
