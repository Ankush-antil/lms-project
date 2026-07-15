import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const TruncatedCell = ({ text, maxLength = 25, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, position: 'below' });
    const buttonRef = useRef(null);
    const popoverRef = useRef(null);
    const str = String(text || '');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                popoverRef.current && !popoverRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (str.length <= maxLength) {
        return <span className={className}>{str}</span>;
    }

    const truncated = str.slice(0, maxLength);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            const rect = buttonRef.current.getBoundingClientRect();
            const popoverHeight = 150; // approximate height
            const spaceBelow = window.innerHeight - rect.bottom;
            
            if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
                // Place above
                setCoords({
                    top: rect.top + window.scrollY - 5,
                    left: rect.left + window.scrollX,
                    position: 'above'
                });
            } else {
                // Place below
                setCoords({
                    top: rect.bottom + window.scrollY + 5,
                    left: rect.left + window.scrollX,
                    position: 'below'
                });
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <span className={className}>
            <span>{truncated}</span>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                className="text-indigo-650 hover:text-indigo-850 hover:underline ml-1 font-bold text-[11px] inline-block cursor-pointer"
            >
                ...more
            </button>

            {isOpen && createPortal(
                <div 
                    ref={popoverRef}
                    style={{
                        position: 'absolute',
                        top: coords.position === 'above' ? 'auto' : `${coords.top}px`,
                        bottom: coords.position === 'above' ? `${document.documentElement.scrollHeight - coords.top}px` : 'auto',
                        left: `${coords.left}px`,
                    }}
                    className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[9999] min-w-[220px] max-w-[320px] animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-xs font-bold text-slate-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto pr-1">
                        {str}
                    </div>
                </div>,
                document.body
            )}
        </span>
    );
};

export default TruncatedCell;
