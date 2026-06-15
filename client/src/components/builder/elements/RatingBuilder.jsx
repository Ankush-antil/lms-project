import { Star } from 'lucide-react';

const RatingBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="bg-white p-4 border border-slate-150 rounded-2xl flex flex-col gap-2 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Default Rating</span>
            <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        type="button"
                        key={star}
                        onClick={() => onUpdateField('defaultValue', star)}
                        className="text-2xl transition-transform hover:scale-110 active:scale-95 text-slate-200"
                    >
                        <Star
                            size={24}
                            className={star <= (element.defaultValue || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RatingBuilder;
