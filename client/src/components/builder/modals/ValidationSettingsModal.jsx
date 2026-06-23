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

const ValidationSettingsModal = ({
    isOpen,
    onClose,
    draftValidationSettings,
    setDraftValidationSettings,
    onSave
}) => {
    if (!isOpen) return null;

    const handleSave = () => {
        onSave(draftValidationSettings);
        onClose();
        toast.success('Validation settings saved!');
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-2">
            <div className="bg-white rounded-2xl max-w-[380px] w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white">
                    <h3 className="text-sm font-extrabold text-slate-800 text-center w-full relative">
                        Validation Settings
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
                    {/* 1. Answer cannot be empty */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Answer cannot be empty</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.answerNotEmpty}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, answerNotEmpty: val })}
                        />
                    </div>

                    {/* 2. Minimum words required */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Minimum words required</span>
                        <input
                            type="number"
                            placeholder="None"
                            value={draftValidationSettings.minWords || ''}
                            onChange={(e) => setDraftValidationSettings({ ...draftValidationSettings, minWords: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-28 outline-none focus:border-[#5A5CD6] transition-all"
                        />
                    </div>

                    {/* 3. Maximum words allowed */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Maximum words allowed</span>
                        <input
                            type="number"
                            placeholder="None"
                            value={draftValidationSettings.maxWords || ''}
                            onChange={(e) => setDraftValidationSettings({ ...draftValidationSettings, maxWords: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-28 outline-none focus:border-[#5A5CD6] transition-all"
                        />
                    </div>

                    {/* 4. Special characters allowed */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Special characters allowed</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.specialChars}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, specialChars: val })}
                        />
                    </div>

                    {/* 5. Numeric values allowed */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Numeric values allowed</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.numericValues}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, numericValues: val })}
                        />
                    </div>

                    {/* 6. Plagiarism check */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Plagiarism check</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.plagiarismCheck}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, plagiarismCheck: val })}
                        />
                    </div>

                    {/* 7. Keyword presence required */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Keyword presence required</span>
                        <input
                            type="text"
                            placeholder="Comma separated key"
                            value={draftValidationSettings.keywordPresence || ''}
                            onChange={(e) => setDraftValidationSettings({ ...draftValidationSettings, keywordPresence: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-32 outline-none focus:border-[#5A5CD6] transition-all"
                        />
                    </div>

                    {/* 8. Answer length warning before submit */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Answer length warning before submit</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.lengthWarning}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, lengthWarning: val })}
                        />
                    </div>

                    {/* 9. Grammar check enable */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Grammar check enable</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.grammarCheck}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, grammarCheck: val })}
                        />
                    </div>

                    {/* 10. Auto-reject very short answers */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Auto-reject very short answers</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.autoRejectShort}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, autoRejectShort: val })}
                        />
                    </div>

                    {/* 11. Copy paste Disabled */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Copy paste Disabled</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.copyPasteDisabled}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, copyPasteDisabled: val })}
                        />
                    </div>

                    {/* 12. Going on chrome new tab disabled */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Going on chrome new tab disabled</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.chromeNewTabDisabled}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, chromeNewTabDisabled: val })}
                        />
                    </div>

                    {/* 13. Include Characters */}
                    <div className="flex items-center justify-between py-1">
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Include Characters</span>
                        <ToggleSwitch
                            checked={!!draftValidationSettings.includeCharacters}
                            onChange={(val) => setDraftValidationSettings({ ...draftValidationSettings, includeCharacters: val })}
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

export default ValidationSettingsModal;
