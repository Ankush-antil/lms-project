import { Info, Plus, X } from 'lucide-react';

const FillBlanksBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const blankAnswers = element.blankAnswers || ["frontend"];
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
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

export default FillBlanksBuilder;
