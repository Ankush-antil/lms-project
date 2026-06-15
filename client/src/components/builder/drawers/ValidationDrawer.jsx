import { X } from 'lucide-react';

const ValidationDrawer = ({
    element,
    handleUpdateNestedField,
    setActiveFooterTab
}) => {
    const validation = element.validation || {
        minLength: '',
        maxLength: '',
        regex: '',
        numericOnly: false,
        emailOnly: false,
        urlOnly: false
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 space-y-3 animate-fade-in shadow-inner text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    Answer Validation Rules
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-505">Min Length</span>
                        <input
                            type="number"
                            value={validation.minLength || ''}
                            onChange={(e) => handleUpdateNestedField('validation', 'minLength', e.target.value)}
                            placeholder="None"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-505">Max Length</span>
                        <input
                            type="number"
                            value={validation.maxLength || ''}
                            onChange={(e) => handleUpdateNestedField('validation', 'maxLength', e.target.value)}
                            placeholder="None"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-505">Format Constraints (Regex)</span>
                        <input
                            type="text"
                            value={validation.regex || ''}
                            onChange={(e) => handleUpdateNestedField('validation', 'regex', e.target.value)}
                            placeholder="E.g., ^[A-Z]{3}\d{3}$"
                            className="w-full text-xs font-mono bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-655 pt-1">
                    {['numericOnly', 'emailOnly', 'urlOnly'].map((key) => {
                        const map = {
                            numericOnly: "Numeric Digits only",
                            emailOnly: "Valid Email structure",
                            urlOnly: "Web Address URL structure"
                        };
                        return (
                            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!validation[key]}
                                    onChange={(e) => handleUpdateNestedField('validation', key, e.target.checked)}
                                    className="rounded text-purple-605 w-4 h-4"
                                />
                                <span>{map[key]}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ValidationDrawer;
