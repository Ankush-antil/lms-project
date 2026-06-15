import { Info, Plus, X } from 'lucide-react';

const FillBlanksBuilder = ({
    element,
    onUpdateField
}) => {
    const blankAnswers = element.blankAnswers || ["frontend"];

    return (
        <div className="space-y-1.5">
            <div className="p-2 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1"><Info size={13} /> Writing blanks format:</p>
                <p>Insert the token <span className="font-mono bg-white px-1.5 py-0.5 rounded font-black border border-amber-205">[blank]</span> inside your question prompt (e.g., "React is a [blank] library developed by [blank]."). Then provide the correct answers below.</p>
            </div>
            <div className="bg-white p-2 border border-slate-150 rounded-xl space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Blank Answers list</span>
                {blankAnswers.map((ans, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-16">Blank #{bIdx + 1}:</span>
                        <input
                            type="text"
                            value={ans || ''}
                            onChange={(e) => {
                                const copy = [...blankAnswers];
                                copy[bIdx] = e.target.value;
                                onUpdateField('blankAnswers', copy);
                            }}
                            placeholder={`Correct answer for blank ${bIdx + 1}`}
                            className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-purple-500"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const copy = blankAnswers.filter((_, i) => i !== bIdx);
                                onUpdateField('blankAnswers', copy);
                            }}
                            className="text-slate-350 hover:text-red-500 p-1"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => {
                        onUpdateField('blankAnswers', [...blankAnswers, '']);
                    }}
                    className="text-xs font-bold text-purple-655 hover:underline flex items-center gap-1 mt-1"
                >
                    <Plus size={13} /> Add Blank Answer
                </button>
            </div>
        </div>
    );
};

export default FillBlanksBuilder;
