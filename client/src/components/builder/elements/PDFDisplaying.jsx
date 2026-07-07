import { FileText } from 'lucide-react';

const PDFBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">PDF Document URL</label>
                    <input
                        type="text"
                        value={element.pdfUrl || ''}
                        onChange={(e) => onUpdateField('pdfUrl', e.target.value)}
                        placeholder="https://example.com/document.pdf"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-3 bg-slate-55 border border-slate-200 p-3 rounded-xl">
                    <FileText size={20} className="text-red-500" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{element.pdfUrl || 'Untitled Document.pdf'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">PDF Asset</span>
                    </div>
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

export default PDFBuilder;
