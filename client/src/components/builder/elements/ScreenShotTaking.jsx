import { Camera } from 'lucide-react';

const ScreenShotBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Screenshot Scope</label>
                <select
                    value={element.screenshotScope || 'Entire Screen'}
                    onChange={(e) => onUpdateField('screenshotScope', e.target.value)}
                    className="w-full text-sm bg-slate-55 border border-slate-200 rounded-xl px-3.5 py-2"
                >
                    <option value="Entire Screen">Entire Desktop Screen</option>
                    <option value="Active Browser Window">Active Browser Window</option>
                    <option value="Selected Custom Frame">Selected Custom Frame</option>
                </select>
            </div>
            <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 flex items-center gap-3 text-xs text-slate-505 font-medium">
                <Camera size={16} className="text-purple-600" />
                <span>Requires the student to upload a verified screenshot.</span>
            </div>
        </div>
    );
};

export default ScreenShotBuilder;
