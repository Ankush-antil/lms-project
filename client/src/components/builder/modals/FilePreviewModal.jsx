import { createPortal } from 'react-dom';
import { X, FileText, Download } from 'lucide-react';

const FilePreviewModal = ({
    isOpen,
    onClose,
    uploadedResource
}) => {
    if (!isOpen || !uploadedResource) return null;

    const type = uploadedResource.type?.toUpperCase();
    const url = uploadedResource.url;

    const getTxtContent = (dataUrl) => {
        if (!dataUrl) return '';
        if (dataUrl.startsWith('data:text/plain;base64,')) {
            try {
                const base64Content = dataUrl.split(',')[1];
                return atob(base64Content);
            } catch (e) {
                return 'Error decoding text content.';
            }
        }
        return 'Unsupported text format or failed to read content.';
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-[#5A5CD6] rounded-lg">
                            <FileText size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 truncate max-w-[400px]">
                                {uploadedResource.name}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                {(uploadedResource.size / 1024).toFixed(1)} KB • {uploadedResource.type}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-100 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-50/30 min-h-[300px]">
                    {(() => {
                        if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(type)) {
                            return (
                                <img
                                    src={url}
                                    alt={uploadedResource.name}
                                    className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-md border border-slate-200"
                                />
                            );
                        }

                        if (type === 'PDF') {
                            return (
                                <iframe
                                    src={url}
                                    className="w-full h-[55vh] rounded-xl border border-slate-200"
                                    title="PDF Preview"
                                />
                            );
                        }

                        if (type === 'TXT') {
                            return (
                                <pre className="w-full max-h-[55vh] p-4 bg-slate-900 text-slate-100 text-xs rounded-xl overflow-auto whitespace-pre-wrap font-mono leading-relaxed text-left">
                                    {getTxtContent(url)}
                                </pre>
                            );
                        }

                        // Default fallback for other file types
                        return (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                                <div className="p-4 bg-indigo-50 text-[#5A5CD6] rounded-2xl">
                                    <FileText size={40} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-800">Preview not available</p>
                                    <p className="text-xs text-slate-550">Inline preview is not supported for {type} files.</p>
                                </div>
                                <a
                                    href={url}
                                    download={uploadedResource.name}
                                    className="px-4 py-2 bg-[#5A5CD6] hover:bg-[#4a4cb2] text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
                                >
                                    <Download size={13} />
                                    <span>Download File</span>
                                </a>
                            </div>
                        );
                    })()}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                    {uploadedResource.url && (
                        <a
                            href={uploadedResource.url}
                            download={uploadedResource.name}
                            className="px-4 py-2 bg-indigo-50 text-[#5A5CD6] hover:bg-indigo-100 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                        >
                            <Download size={13} />
                            <span>Download</span>
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 font-bold rounded-xl text-xs transition-colors"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FilePreviewModal;
