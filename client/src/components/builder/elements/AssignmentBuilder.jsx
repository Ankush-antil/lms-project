import { FileText } from 'lucide-react';

const AssignmentBuilder = ({ element, handleUpdateNestedField }) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="border-2 border-dashed border-purple-205 rounded-3xl p-8 bg-white flex flex-col items-center justify-center gap-2 text-center select-none shadow-sm shadow-purple-50/20">
                <div className="p-3.5 bg-purple-55 text-purple-600 rounded-full">
                    <FileText size={24} />
                </div>
                <span className="text-sm font-black text-slate-800">Assignment File Submission Portal</span>
                <span className="text-xs text-slate-400 max-w-sm">Students will upload their files (PDF, DOCX, ZIP, PPTX) here. Limit set in Particulars Settings.</span>
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

export default AssignmentBuilder;
