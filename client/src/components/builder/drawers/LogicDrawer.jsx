import { GitBranch, X } from 'lucide-react';

const LogicDrawer = ({
    element,
    handleUpdateNestedField,
    setActiveFooterTab
}) => {
    const logic = element.logic || {
        dependsOnQuestion: '',
        dependsOnAnswer: '',
        scoreTrigger: ''
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 space-y-3 animate-fade-in shadow-inner text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <GitBranch size={13} className="text-teal-600" /> Conditional Display & Logic Routing
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
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-purple-755 uppercase tracking-widest flex items-center gap-1">Conditional Options</span>
                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black">Future Integration</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Show this question IF Question:</span>
                        <input
                            type="text"
                            value={logic.dependsOnQuestion || ''}
                            onChange={(e) => handleUpdateNestedField('logic', 'dependsOnQuestion', e.target.value)}
                            placeholder="E.g., Question 1"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Equals Answer value:</span>
                        <input
                            type="text"
                            value={logic.dependsOnAnswer || ''}
                            onChange={(e) => handleUpdateNestedField('logic', 'dependsOnAnswer', e.target.value)}
                            placeholder="E.g., Yes"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Section routing trigger:</span>
                        <input
                            type="text"
                            value={logic.scoreTrigger || ''}
                            onChange={(e) => handleUpdateNestedField('logic', 'scoreTrigger', e.target.value)}
                            placeholder="E.g., Route to Sec 2 if score > 50%"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogicDrawer;
