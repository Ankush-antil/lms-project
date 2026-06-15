import { Calendar, Clock } from 'lucide-react';

const DateTimeBuilder = () => {
    return (
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
    );
};

export default DateTimeBuilder;
