import { Mic } from 'lucide-react';

const VoiceRecBuilder = () => {
    return (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6 flex flex-col items-center justify-center gap-2 text-center select-none shadow-sm">
            <Mic size={24} className="text-purple-600 animate-pulse" />
            <span className="text-sm font-semibold text-slate-700">Voice Response recording block</span>
            <span className="text-xs text-slate-400">Students will record their voice responses during the exam.</span>
        </div>
    );
};

export default VoiceRecBuilder;
