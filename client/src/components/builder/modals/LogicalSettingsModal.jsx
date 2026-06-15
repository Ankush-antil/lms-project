import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const ToggleSwitch = ({ checked, onChange }) => {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-[#5A5CD6]' : 'bg-slate-200'
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    );
};

const LogicalSettingsModal = ({
    isOpen,
    onClose,
    draftLogicalSettings,
    setDraftLogicalSettings,
    onSave
}) => {
    if (!isOpen) return null;

    const handleSave = () => {
        onSave(draftLogicalSettings);
        onClose();
        toast.success('Logical settings saved!');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-2">
            <div className="bg-white rounded-2xl max-w-[380px] w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white">
                    <h3 className="text-sm font-extrabold text-slate-800 text-center w-full relative">
                        Logical Settings
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-655 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <X size={16} />
                        </button>
                    </h3>
                </div>

                {/* Modal Body */}
                <div className="px-5 py-3.5 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar select-none text-left">
                    {/* 1. Topic relevance check */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Topic relevance check</span>
                        <ToggleSwitch
                            checked={!!draftLogicalSettings.topicRelevance}
                            onChange={(val) => setDraftLogicalSettings({ ...draftLogicalSettings, topicRelevance: val })}
                        />
                    </div>

                    {/* 2. Logical flow required (Intro–Body–Conclusion) */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Logical flow required (Intro–Body–Conclusion)</span>
                        <ToggleSwitch
                            checked={!!draftLogicalSettings.logicalFlow}
                            onChange={(val) => setDraftLogicalSettings({ ...draftLogicalSettings, logicalFlow: val })}
                        />
                    </div>

                    {/* 3. Mandatory key points coverage */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Mandatory key points coverage</span>
                        <input
                            type="text"
                            placeholder="Comma separated key"
                            value={draftLogicalSettings.mandatoryKeyPoints || ''}
                            onChange={(e) => setDraftLogicalSettings({ ...draftLogicalSettings, mandatoryKeyPoints: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-32 outline-none focus:border-[#5A5CD6] transition-all"
                        />
                    </div>

                    {/* 4. Repeated content detection */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Repeated content detection</span>
                        <ToggleSwitch
                            checked={!!draftLogicalSettings.repeatedContent}
                            onChange={(val) => setDraftLogicalSettings({ ...draftLogicalSettings, repeatedContent: val })}
                        />
                    </div>

                    {/* 5. Contradictory statement detection */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Contradictory statement detection</span>
                        <ToggleSwitch
                            checked={!!draftLogicalSettings.contradictoryStatement}
                            onChange={(val) => setDraftLogicalSettings({ ...draftLogicalSettings, contradictoryStatement: val })}
                        />
                    </div>

                    {/* 6. Off-topic answer flag */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Off-topic answer flag</span>
                        <ToggleSwitch
                            checked={!!draftLogicalSettings.offTopicFlag}
                            onChange={(val) => setDraftLogicalSettings({ ...draftLogicalSettings, offTopicFlag: val })}
                        />
                    </div>

                    {/* 7. AI-based answer quality scoring */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">AI-based answer quality scoring</span>
                        <ToggleSwitch
                            checked={!!draftLogicalSettings.aiQualityScoring}
                            onChange={(val) => setDraftLogicalSettings({ ...draftLogicalSettings, aiQualityScoring: val })}
                        />
                    </div>

                    {/* 8. Depth of explanation level */}
                    <div className="flex items-center justify-between py-1">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Depth of explanation level</span>
                        <select
                            value={draftLogicalSettings.depthExplanation || 'Low'}
                            onChange={(e) => setDraftLogicalSettings({ ...draftLogicalSettings, depthExplanation: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-28 bg-white outline-none focus:border-[#5A5CD6] transition-all"
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-all font-semibold text-[11px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-1.5 bg-[#5A5CD6] hover:bg-[#494bb8] text-white rounded-lg shadow-sm transition-all font-semibold text-[11px]"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogicalSettingsModal;
