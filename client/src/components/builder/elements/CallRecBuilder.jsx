import { Phone } from 'lucide-react';

const CallRecBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Roleplay Script / Scenario Details</label>
                <textarea
                    value={element.scriptScenario || ''}
                    onChange={(e) => onUpdateField('scriptScenario', e.target.value)}
                    placeholder="Describe the dialogue roleplay scenario for this call recording..."
                    rows={3}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all font-medium resize-none"
                />
            </div>
            <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 flex items-center gap-3 text-xs text-slate-505 font-medium">
                <Phone size={16} className="text-purple-600 animate-bounce" />
                <span>Dialer Roleplay interface.</span>
            </div>
        </div>
    );
};

export default CallRecBuilder;
