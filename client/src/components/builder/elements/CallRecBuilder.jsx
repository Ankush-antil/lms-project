import { Phone } from 'lucide-react';

const CallRecBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
            <Phone size={22} className="text-purple-500" />
            <span className="text-xs font-semibold">Web-based Audio calling configured.</span>
        </div>
    );
};

export default CallRecBuilder;
