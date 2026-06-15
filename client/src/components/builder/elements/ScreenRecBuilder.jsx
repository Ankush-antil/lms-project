import { Monitor } from 'lucide-react';

const ScreenRecBuilder = ({
    element,
    onUpdateField
}) => {
    return (
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
    );
};

export default ScreenRecBuilder;
