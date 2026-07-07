import { useState } from 'react';
import { X } from 'lucide-react';

const TruncatedCell = ({ text, maxLength = 25, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const str = String(text || '');

    if (str.length <= maxLength) {
        return <span className={className}>{str}</span>;
    }

    const truncated = str.slice(0, maxLength);

    return (
        <span className={className}>
            {truncated}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                }}
                className="text-indigo-650 hover:text-indigo-850 hover:underline ml-1 font-bold text-[11px] inline-block cursor-pointer"
            >
                ...more
            </button>

            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-5 relative animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Full Details</h4>
                        <div className="text-sm text-slate-650 font-semibold whitespace-pre-wrap max-h-60 overflow-y-auto pr-1">
                            {str}
                        </div>
                    </div>
                </div>
            )}
        </span>
    );
};

export default TruncatedCell;
