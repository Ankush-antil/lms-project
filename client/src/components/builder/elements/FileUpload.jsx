import { Upload } from 'lucide-react';

const FileUploadBuilder = () => {
    return (
        <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 bg-white flex flex-col items-center justify-center gap-2 text-center shadow-sm select-none">
            <div className="p-3 bg-purple-55 text-purple-600 rounded-full">
                <Upload size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-700">Drag files here or click to browse</span>
            <span className="text-xs text-slate-400">PDF, DOC, PNG, JPG (Max 10MB)</span>
        </div>
    );
};

export default FileUploadBuilder;
