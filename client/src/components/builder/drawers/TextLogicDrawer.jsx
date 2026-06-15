import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const TextLogicDrawer = ({
    element,
    onUpdateText,
    setActiveFooterTab
}) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 space-y-3 animate-fade-in shadow-inner text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    Dynamic Text Placeholder Tokens
                </span>
                <button
                    type="button"
                    onClick={() => setActiveFooterTab(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded transition-all"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="space-y-3 text-left">
                <p className="text-[11px] text-slate-500 leading-normal">
                    Insert placeholders into Title, Description, or Helper Text. Replaced dynamically on exam attempt:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                        { token: "{Student Name}", desc: "Student's name" },
                        { token: "{Institute Name}", desc: "Institute name" },
                        { token: "{Course Name}", desc: "Course name" },
                        { token: "{Subject Name}", desc: "Subject name" }
                    ].map((t) => (
                        <button
                            key={t.token}
                            type="button"
                            onClick={() => {
                                const currentText = element.text || '';
                                onUpdateText(currentText + (currentText ? ' ' : '') + t.token);
                                toast.success(`Inserted ${t.token}!`);
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] hover:border-purple-300 hover:text-purple-700 transition-all font-mono font-bold flex flex-col items-start"
                        >
                            <span>{t.token}</span>
                            <span className="text-[8px] text-slate-400 font-normal mt-0.5">{t.desc}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TextLogicDrawer;
