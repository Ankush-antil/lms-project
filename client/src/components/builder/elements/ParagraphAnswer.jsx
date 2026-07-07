import { ChevronDown } from 'lucide-react';

const ParagraphBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField,
    isExpanded,
    setIsExpanded
}) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between bg-white px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm">
                <textarea
                    placeholder="Type your Paragraph Answer here"
                    disabled
                    rows={3}
                    className="bg-transparent outline-none flex-1 text-sm text-slate-400 cursor-not-allowed border-none font-bold resize-none"
                />
                <div className="flex items-center gap-3.5 ml-auto select-none border-l border-slate-150 pl-3 pt-1">
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
                    <ChevronDown
                        size={18}
                        className={`text-slate-400 cursor-pointer transition-transform ${isExpanded ? '' : 'rotate-180'}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    />
                </div>
            </div>
        </div>
    );
};

export default ParagraphBuilder;
