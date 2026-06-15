import { Files, Upload, X, FileText, Image, Film, Archive } from 'lucide-react';
import { useState } from 'react';

const getFileIcon = (name) => {
    if (!name) return FileText;
    const ext = name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return Image;
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return Film;
    if (['zip', 'rar', '7z'].includes(ext)) return Archive;
    return FileText;
};

const FILE_TYPE_OPTIONS = [
    { label: 'All Files',       value: 'all' },
    { label: 'Images Only',     value: 'image/*' },
    { label: 'Documents',       value: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt' },
    { label: 'Videos',          value: 'video/*' },
    { label: 'Audio',           value: 'audio/*' },
    { label: 'Archives (ZIP)',  value: '.zip,.rar,.7z' },
];

const MultiFileBuilder = ({ element, onUpdateField }) => {
    const [demoFiles, setDemoFiles] = useState([]);
    const maxFiles  = element.multiMaxFiles   || 5;
    const maxSizeMB = element.multiMaxSizeMB  || 10;
    const fileType  = element.multiFileType   || 'all';

    const handleDemoAdd = (e) => {
        const incoming = Array.from(e.target.files || []);
        setDemoFiles(prev => {
            const combined = [...prev, ...incoming].slice(0, maxFiles);
            return combined;
        });
        e.target.value = '';
    };

    const removeDemo = (i) => setDemoFiles(prev => prev.filter((_, idx) => idx !== i));

    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            {/* Config Row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Max Files
                    </label>
                    <input
                        type="number"
                        min={1} max={20}
                        value={maxFiles}
                        onChange={(e) => onUpdateField('multiMaxFiles', Number(e.target.value))}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Max Size (MB)
                    </label>
                    <input
                        type="number"
                        min={1} max={500}
                        value={maxSizeMB}
                        onChange={(e) => onUpdateField('multiMaxSizeMB', Number(e.target.value))}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        File Types
                    </label>
                    <select
                        value={fileType}
                        onChange={(e) => onUpdateField('multiFileType', e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-semibold"
                    >
                        {FILE_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Drop Zone Preview */}
            <label className="block border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50 rounded-2xl p-5 cursor-pointer transition-all group text-center">
                <input
                    type="file"
                    multiple
                    accept={fileType === 'all' ? undefined : fileType}
                    className="hidden"
                    onChange={handleDemoAdd}
                />
                <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white text-purple-500 rounded-full border border-purple-200 shadow-sm group-hover:scale-110 transition-transform">
                        <Files size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                        Drag & drop files or <span className="text-purple-600 underline">browse</span>
                    </span>
                    <span className="text-xs text-slate-400">
                        Up to {maxFiles} files · Max {maxSizeMB}MB each
                    </span>
                </div>
            </label>

            {/* Demo file list */}
            {demoFiles.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Preview Files ({demoFiles.length}/{maxFiles})</p>
                    {demoFiles.map((f, i) => {
                        const Icon = getFileIcon(f.name);
                        const sizeKB = (f.size / 1024).toFixed(1);
                        return (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                <div className="p-1.5 bg-purple-50 text-purple-500 rounded-lg shrink-0">
                                    <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{f.name}</p>
                                    <p className="text-[10px] text-slate-400">{sizeKB} KB</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeDemo(i)}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiFileBuilder;
