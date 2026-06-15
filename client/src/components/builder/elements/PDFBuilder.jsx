import { FileText } from 'lucide-react';

const PDFBuilder = ({
    element,
    onUpdateField
}) => {
    return (
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
    );
};

export default PDFBuilder;
