import { X, Upload, Camera, FolderUp, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const ImageInsertModal = ({
    isOpen,
    onClose,
    index,
    imageSearchQuery,
    setImageSearchQuery,
    imageByUrl,
    setImageByUrl,
    activeImageTab,
    setActiveImageTab,
    onAddImage
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800">Insert image</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-100 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tab Headers */}
                <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap bg-slate-50/30">
                    {['Upload', 'Webcam', 'By URL', 'Photos', 'Google Drive', 'Google Images'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveImageTab(tab)}
                            className={`px-5 py-3 text-xs font-bold transition-all relative ${activeImageTab === tab ? 'text-purple-650' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab}
                            {activeImageTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-650"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                    {activeImageTab === 'Upload' && (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50 min-h-[250px] text-center">
                            <Upload size={32} className="text-slate-400 mb-3" />
                            <p className="text-xs font-bold text-slate-700 mb-1">Drag and drop your image here</p>
                            <p className="text-[10px] text-slate-400 mb-4">PNG, JPG, JPEG, WEBP up to 5MB</p>
                            <input
                                type="file"
                                id={`img-upload-input-${index}`}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            onAddImage(reader.result);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => document.getElementById(`img-upload-input-${index}`).click()}
                                className="px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                            >
                                Browse Files
                            </button>
                        </div>
                    )}

                    {activeImageTab === 'Webcam' && (
                        <div className="flex flex-col items-center justify-center border border-slate-150 bg-slate-50/20 rounded-2xl p-6 min-h-[250px] text-center">
                            <div className="aspect-video w-full max-w-md bg-slate-900 rounded-xl flex items-center justify-center text-xs text-slate-400 mb-4 font-semibold relative overflow-hidden">
                                <div className="text-center space-y-1">
                                    <Camera size={24} className="text-slate-505 mb-2 block mx-auto animate-pulse" />
                                    <span>Webcam Camera Feed Simulator</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onAddImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60');
                                }}
                                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                            >
                                Take Snapshot
                            </button>
                        </div>
                    )}

                    {activeImageTab === 'By URL' && (
                        <div className="space-y-4 py-4 max-w-md mx-auto">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Paste image URL</label>
                                <input
                                    type="text"
                                    value={imageByUrl}
                                    onChange={(e) => setImageByUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500"
                                />
                            </div>
                            {imageByUrl && (
                                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/50 flex justify-center">
                                    <img
                                        src={imageByUrl}
                                        alt="Preview URL"
                                        className="max-h-32 object-contain rounded"
                                        onError={() => toast.error("Invalid image URL preview")}
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                disabled={!imageByUrl}
                                onClick={() => {
                                    onAddImage(imageByUrl);
                                }}
                                className="w-full py-2 bg-purple-655 hover:bg-purple-750 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Insert Image
                            </button>
                        </div>
                    )}

                    {activeImageTab === 'Photos' && (
                        <div className="space-y-3">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Select a photo</span>
                            <div className="grid grid-cols-3 gap-2.5">
                                {[
                                    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&auto=format&fit=crop&q=60',
                                    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&auto=format&fit=crop&q=60',
                                    'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=300&auto=format&fit=crop&q=60',
                                    'https://images.unsplash.com/photo-1498243691581-b145c3f54a5c?w=300&auto=format&fit=crop&q=60',
                                    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=60',
                                    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&auto=format&fit=crop&q=60'
                                ].map((url, uIdx) => (
                                    <button
                                        key={uIdx}
                                        type="button"
                                        onClick={() => {
                                            onAddImage(url);
                                        }}
                                        className="aspect-video rounded-xl overflow-hidden border border-slate-200 hover:border-purple-500 transition-all hover:scale-[1.02] shadow-sm relative group"
                                    >
                                        <img src={url} alt="preset" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeImageTab === 'Google Drive' && (
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl min-h-[250px]">
                            <FolderUp size={32} className="text-slate-400 mb-2.5" />
                            <p className="text-xs font-bold text-slate-700">Google Drive Files</p>
                            <p className="text-[10px] text-slate-400 max-w-xs mt-1">Access your Drive directories to choose shared templates or files.</p>
                            <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-md">
                                {['Quiz_Diagram_A.png', 'LMS_Architecture_v2.jpg'].map((fName, fIdx) => (
                                    <button
                                        key={fIdx}
                                        type="button"
                                        onClick={() => {
                                            onAddImage(fIdx === 0
                                                ? 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60'
                                                : 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60');
                                        }}
                                        className="p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-purple-500 transition-all flex items-center gap-2 text-xs font-semibold text-slate-655"
                                    >
                                        <ImageIcon size={14} className="text-purple-650" />
                                        <span className="truncate">{fName}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeImageTab === 'Google Images' && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={imageSearchQuery}
                                    onChange={(e) => setImageSearchQuery(e.target.value)}
                                    placeholder="Search for images..."
                                    className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white focus:border-purple-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            toast.success(`Search results loaded for "${imageSearchQuery}"`);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => toast.success(`Search results loaded for "${imageSearchQuery}"`)}
                                    className="px-4 bg-purple-650 hover:bg-purple-750 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                {[
                                    { tag: 'office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&auto=format&fit=crop&q=60' },
                                    { tag: 'meeting', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=60' },
                                    { tag: 'success', url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&auto=format&fit=crop&q=60' }
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onAddImage(item.url);
                                        }}
                                        className="aspect-video rounded-xl overflow-hidden border border-slate-200 hover:border-purple-500 transition-all hover:scale-[1.02] shadow-sm relative group"
                                    >
                                        <img src={item.url} alt={item.tag} className="w-full h-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/50 p-1.5 text-[9px] text-white font-bold truncate">
                                            {item.tag} search result
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageInsertModal;
