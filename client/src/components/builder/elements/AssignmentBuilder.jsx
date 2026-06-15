import { FileText } from 'lucide-react';

const AssignmentBuilder = () => {
    return (
        <div className="border-2 border-dashed border-purple-205 rounded-3xl p-8 bg-white flex flex-col items-center justify-center gap-2 text-center select-none shadow-sm shadow-purple-50/20">
            <div className="p-3.5 bg-purple-55 text-purple-600 rounded-full">
                <FileText size={24} />
            </div>
            <span className="text-sm font-black text-slate-800">Assignment File Submission Portal</span>
            <span className="text-xs text-slate-400 max-w-sm">Students will upload their files (PDF, DOCX, ZIP, PPTX) here. Limit set in Particulars Settings.</span>
        </div>
    );
};

export default AssignmentBuilder;
