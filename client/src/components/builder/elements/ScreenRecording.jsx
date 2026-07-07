import { Monitor } from 'lucide-react';

const ScreenRecBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-550 uppercase tracking-wider block">Video Quality</label>
                        <select
                            value={element.quality || '1080p'}
                            onChange={(e) => onUpdateField('quality', e.target.value)}
                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white"
                        >
                            <option value="720p">HD (720p)</option>
                            <option value="1080p">Full HD (1080p)</option>
                            <option value="4k">4K Ultra</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end pb-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={!!element.includeMic}
                                onChange={(e) => onUpdateField('includeMic', e.target.checked)}
                                className="rounded text-purple-600"
                            />
                            Include Microphone Audio
                        </label>
                    </div>
                </div>
                <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 flex items-center gap-3 text-xs text-slate-505 font-medium">
                    <Monitor size={16} className="text-purple-600" />
                    <span>Students will record screen output during the test.</span>
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

export default ScreenRecBuilder;
