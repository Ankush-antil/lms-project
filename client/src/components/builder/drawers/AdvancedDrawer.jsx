import { X } from 'lucide-react';

const AdvancedDrawer = ({
    element,
    onUpdateField,
    handleUpdateNestedField,
    setActiveFooterTab
}) => {
    const advanced = element.advanced || {
        tags: '',
        difficulty: 'Medium',
        bloomTaxonomy: 'Understanding',
        learningOutcome: '',
        subjectMapping: '',
        topicMapping: ''
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 space-y-3 animate-fade-in shadow-inner text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    Advanced Taxonomy & Classifications
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150 text-xs">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Taxonomy tags</span>
                        <input
                            type="text"
                            value={advanced.tags || ''}
                            onChange={(e) => handleUpdateNestedField('advanced', 'tags', e.target.value)}
                            placeholder="E.g., CSS3, flexbox"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Difficulty Level</span>
                        <select
                            value={advanced.difficulty || 'Medium'}
                            onChange={(e) => handleUpdateNestedField('advanced', 'difficulty', e.target.value)}
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Bloom Taxonomy</span>
                        <select
                            value={advanced.bloomTaxonomy || 'Understanding'}
                            onChange={(e) => handleUpdateNestedField('advanced', 'bloomTaxonomy', e.target.value)}
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        >
                            <option value="Remembering">Remembering (Recall info)</option>
                            <option value="Understanding">Understanding (Explain ideas)</option>
                            <option value="Applying">Applying (Use information)</option>
                            <option value="Analyzing">Analyzing (Draw connections)</option>
                            <option value="Evaluating">Evaluating (Justify stance)</option>
                            <option value="Creating">Creating (Produce new work)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Learning Outcome Code</span>
                        <input
                            type="text"
                            value={element.learningOutcome || ''}
                            onChange={(e) => onUpdateField('learningOutcome', e.target.value)}
                            placeholder="E.g., LO-CS101"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Subject Mapping</span>
                        <input
                            type="text"
                            value={element.subjectMapping || ''}
                            onChange={(e) => onUpdateField('subjectMapping', e.target.value)}
                            placeholder="E.g., Computer Science"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-555">Topic Mapping</span>
                        <input
                            type="text"
                            value={element.topicMapping || ''}
                            onChange={(e) => onUpdateField('topicMapping', e.target.value)}
                            placeholder="E.g., React Hooks"
                            className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedDrawer;
