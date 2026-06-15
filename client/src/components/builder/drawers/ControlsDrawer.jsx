import { Settings, X, Paperclip, MessageSquare, CheckCircle2 } from 'lucide-react';

const ControlsDrawer = ({
    element,
    setActiveFooterTab,
    onUpdateField,
    onApplyMoreSettingToAll
}) => {
    const ms = element.moreSettings || {};
    const isUploadSynced = (element.appliedToAllMoreSettings || []).includes('allowUpload');
    const isChatSynced = (element.appliedToAllMoreSettings || []).includes('allowChat');
    const isSubmitFinishSynced = (element.appliedToAllMoreSettings || []).includes('allowSubmitFinish');

    return (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 space-y-3 animate-fade-in shadow-inner text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Settings size={13} className="text-teal-600" /> More Settings
                </span>
                <button
                    type="button"
                    onClick={() => setActiveFooterTab(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded transition-all"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Toggle rows in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Upload toggle */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 w-full">
                        <span className="text-[10px] font-black text-slate-755 flex items-center gap-1 whitespace-nowrap">
                            <Paperclip size={11} className="text-teal-600 shrink-0" /> Allow Upload
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={!!ms.allowUpload}
                                onChange={(e) => onUpdateField('moreSettings', { ...ms, allowUpload: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={() => onApplyMoreSettingToAll('allowUpload', !isUploadSynced)}
                        className={`px-2 py-0.5 rounded transition-all border w-full text-center text-[9px] font-black ${isUploadSynced
                            ? 'bg-purple-100 border-purple-200 text-purple-700 font-extrabold shadow-sm'
                            : 'bg-slate-55 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                    >
                        {isUploadSynced ? 'Applied to all' : 'Apply to all'}
                    </button>
                </div>

                {/* Chat with Teacher toggle */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 w-full">
                        <span className="text-[10px] font-black text-slate-755 flex items-center gap-1 whitespace-nowrap">
                            <MessageSquare size={11} className="text-teal-600 shrink-0" /> Chat with Teacher
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={!!ms.allowChat}
                                onChange={(e) => onUpdateField('moreSettings', { ...ms, allowChat: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={() => onApplyMoreSettingToAll('allowChat', !isChatSynced)}
                        className={`px-2 py-0.5 rounded transition-all border w-full text-center text-[9px] font-black ${isChatSynced
                            ? 'bg-purple-100 border-purple-200 text-purple-700 font-extrabold shadow-sm'
                            : 'bg-slate-55 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                    >
                        {isChatSynced ? 'Applied to all' : 'Apply to all'}
                    </button>
                </div>

                {/* Submit & Finish toggle */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 w-full">
                        <span className="text-[10px] font-black text-slate-755 flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle2 size={11} className="text-teal-600 shrink-0" /> Submit & Finish
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={!!ms.allowSubmitFinish}
                                onChange={(e) => onUpdateField('moreSettings', { ...ms, allowSubmitFinish: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={() => onApplyMoreSettingToAll('allowSubmitFinish', !isSubmitFinishSynced)}
                        className={`px-2 py-0.5 rounded transition-all border w-full text-center text-[9px] font-black ${isSubmitFinishSynced
                            ? 'bg-purple-100 border-purple-200 text-purple-700 font-extrabold shadow-sm'
                            : 'bg-slate-55 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                    >
                        {isSubmitFinishSynced ? 'Applied to all' : 'Apply to all'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ControlsDrawer;
