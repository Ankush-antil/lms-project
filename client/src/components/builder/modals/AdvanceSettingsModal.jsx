import { createPortal } from 'react-dom';
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

const AdvanceSettingsModal = ({
    isOpen,
    onClose,
    draftParticulars,
    setDraftParticulars,
    onSave
}) => {
    if (!isOpen) return null;

    const handleSave = () => {
        onSave(draftParticulars);
        onClose();
        toast.success('Advance settings saved!');
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-2">
            <div className="bg-white rounded-2xl max-w-[360px] w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white">
                    <h3 className="text-sm font-extrabold text-slate-800 text-center w-full relative">
                        Advance Settings
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
                    {/* 1. Time limit per question */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Time limit per question</span>
                        <input
                            type="number"
                            placeholder="Seconds"
                            value={draftParticulars.timeLimit || ''}
                            onChange={(e) => setDraftParticulars({ ...draftParticulars, timeLimit: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-24 text-right outline-none focus:border-[#5A5CD6] transition-all"
                        />
                    </div>

                    {/* 2. Allow answer editing after submit */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Allow answer editing after submit</span>
                        <ToggleSwitch
                            checked={!!draftParticulars.allowEditing}
                            onChange={(val) => setDraftParticulars({ ...draftParticulars, allowEditing: val })}
                        />
                    </div>

                    {/* 3. Show word counter to student */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Show word counter to student</span>
                        <ToggleSwitch
                            checked={draftParticulars.showWordCounter !== false}
                            onChange={(val) => setDraftParticulars({ ...draftParticulars, showWordCounter: val })}
                        />
                    </div>

                    {/* Security & Anti-Cheating Settings */}
                    <div className="pt-2 pb-1 text-[11px] font-black uppercase text-indigo-600 tracking-wider border-t border-slate-100">
                        Security & Anti-Cheating
                    </div>

                    {/* 5. Disable Question Copy */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Disable Question Copy</span>
                        <ToggleSwitch
                            checked={!!draftParticulars.disableCopy}
                            onChange={(val) => setDraftParticulars({ ...draftParticulars, disableCopy: val })}
                        />
                    </div>

                    {/* 6. Disable Answer Paste */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Disable Answer Paste</span>
                        <ToggleSwitch
                            checked={!!draftParticulars.disablePaste}
                            onChange={(val) => setDraftParticulars({ ...draftParticulars, disablePaste: val })}
                        />
                    </div>

                    {/* 7. Prevent / Detect Tab Switching */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Prevent Tab Switching</span>
                        <ToggleSwitch
                            checked={!!draftParticulars.preventNewTab}
                            onChange={(val) => setDraftParticulars({ ...draftParticulars, preventNewTab: val })}
                        />
                    </div>

                    {/* 8. Prevent Tab Closing */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Prevent Tab Closing</span>
                        <ToggleSwitch
                            checked={!!draftParticulars.preventTabClose}
                            onChange={(val) => setDraftParticulars({ ...draftParticulars, preventTabClose: val })}
                        />
                    </div>

                    {/* 9. Disable Inspect Element (F12/Right-Click) */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Disable Inspect Element</span>
                        <ToggleSwitch
                            checked={!!draftParticulars.disableInspect}
                            onChange={(val) => setDraftParticulars({ ...draftParticulars, disableInspect: val })}
                        />
                    </div>

                    {/* 10. Answer language restriction */}
                    <div className="flex items-center justify-between py-1">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Answer language restriction</span>
                        <input
                            type="text"
                            placeholder="e.g. English"
                            value={draftParticulars.languageRestriction || ''}
                            onChange={(e) => setDraftParticulars({ ...draftParticulars, languageRestriction: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-28 outline-none focus:border-[#5A5CD6] transition-all"
                        />
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
        </div>,
        document.body
    );
};

export default AdvanceSettingsModal;
