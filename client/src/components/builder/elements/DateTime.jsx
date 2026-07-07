import { Calendar, Clock } from 'lucide-react';

const DateTimeBuilder = ({ element, handleUpdateNestedField }) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 select-none">
                <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
                    <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        disabled
                        className="w-full bg-white border border-slate-205 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    />
                </div>
                <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
                    <input
                        type="text"
                        placeholder="HH:MM"
                        disabled
                        className="w-full bg-white border border-slate-205 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    />
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

export default DateTimeBuilder;
