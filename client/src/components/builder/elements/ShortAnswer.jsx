import { X, Mic, Video } from 'lucide-react';
import toast from 'react-hot-toast';

const ShortAnswerBuilder = ({
    element,
    index,
    onUpdateField,
    handleUpdateNestedField,
    setLightboxImage,
    setLightboxScale
}) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            {/* Unified Inserted Images Thumbnails */}
            {(() => {
                const imagesToRender = [
                    ...(element.insertedImage?.url ? [element.insertedImage.url] : []),
                    ...(element.insertedImages || [])
                ];
                if (imagesToRender.length === 0) return null;
                return (
                    <div className="flex flex-wrap gap-2.5 mb-3 p-2 bg-slate-100/40 border border-dashed border-slate-200 rounded-xl">
                        {imagesToRender.map((imgUrl, imgIdx) => (
                            <div
                                key={imgIdx}
                                className="relative group/thumb w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center cursor-pointer hover:border-purple-500 transition-all"
                            >
                                <img
                                    src={imgUrl}
                                    alt={`Inserted preview ${imgIdx + 1}`}
                                    className="w-full h-full object-cover"
                                    onClick={() => {
                                        setLightboxImage(imgUrl);
                                        setLightboxScale(100);
                                    }}
                                />
                                {/* Delete button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (element.insertedImage?.url === imgUrl) {
                                            onUpdateField('insertedImage', null);
                                        } else {
                                            const updated = (element.insertedImages || []).filter(url => url !== imgUrl);
                                            onUpdateField('insertedImages', updated);
                                        }
                                        toast.success("Image removed");
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity shadow"
                                    title="Delete Image"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {/* Student Answer Box & Toggle Switches for Text, Audio, and Video Responses */}
            <div className="flex flex-wrap gap-2.5 bg-white p-2.5 border border-slate-200 rounded-xl shadow-sm justify-start items-center">
                
                {/* Column 1: Text Answer (Type your Answer here) */}
                <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-xl px-2.5 py-1.5 min-h-[36px] w-fit gap-2">
                    <div className="mr-1 min-w-[120px] max-w-[150px]">
                        {particulars.enableAnswerBox !== false ? (
                            <input
                                type="text"
                                placeholder="Type your Answer here"
                                readOnly
                                tabIndex={-1}
                                className="bg-transparent outline-none w-full text-[10px] font-bold text-slate-500 pointer-events-none select-none cursor-default"
                            />
                        ) : (
                            <div className="text-slate-400 text-[10px] italic font-bold">Text Box Disabled</div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 select-none border-l border-slate-200 pl-2 shrink-0">
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-wide">Text</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={particulars.enableAnswerBox !== false}
                                onChange={(e) => handleUpdateNestedField('particulars', 'enableAnswerBox', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>

                {/* Column 2: Audio Answer */}
                <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-xl px-2.5 py-1.5 min-h-[36px] w-fit gap-3">
                    <div className="flex items-center gap-1.5 min-w-0 mr-1">
                        <div className="w-6 h-6 rounded bg-red-50 text-red-655 flex items-center justify-center shrink-0">
                            <Mic size={12} />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-750 truncate">Audio Response</span>
                    </div>
                    <div className="flex items-center gap-1.5 select-none border-l border-slate-200 pl-2 shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={particulars.enableAudio === true}
                                onChange={(e) => handleUpdateNestedField('particulars', 'enableAudio', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>

                {/* Column 3: Video Answer */}
                <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-xl px-2.5 py-1.5 min-h-[36px] w-fit gap-3">
                    <div className="flex items-center gap-1.5 min-w-0 mr-1">
                        <div className="w-6 h-6 rounded bg-blue-50 text-blue-655 flex items-center justify-center shrink-0">
                            <Video size={12} />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-750 truncate">Video Response</span>
                    </div>
                    <div className="flex items-center gap-1.5 select-none border-l border-slate-200 pl-2 shrink-0">
                        <label className="relative inline-flex inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={particulars.enableVideo === true}
                                onChange={(e) => handleUpdateNestedField('particulars', 'enableVideo', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>

            </div>

            {/* Supporting Resources Upload Section */}
            {element.showUploadResources && (
                <div className="p-3 bg-purple-50/35 border border-purple-150 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-755 uppercase tracking-wider block">Supporting Resources (Max 4)</span>
                        <button
                            type="button"
                            onClick={() => {
                                const resources = particulars.supportingResources || [];
                                if (resources.length >= 4) {
                                    toast.error("Maximum of 4 supporting resources allowed");
                                    return;
                                }
                                const nextIdx = resources.length + 1;
                                const newRes = {
                                    id: `res-${Date.now()}`,
                                    name: `File ${nextIdx}`,
                                    note: `Note ${nextIdx}`,
                                    size: 1024 * 100, // mock size
                                    type: 'PDF'
                                };
                                handleUpdateNestedField('particulars', 'supportingResources', [...resources, newRes]);
                            }}
                            className="px-2 py-1 bg-[#5A5CD6] hover:bg-[#4a4cb2] text-white rounded text-[10px] font-bold shadow-sm"
                        >
                            + Add Resource
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(particulars.supportingResources || []).map((res, rIdx) => (
                            <div key={res.id || rIdx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs relative">
                                <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-slate-700">Resource #{rIdx + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const resources = particulars.supportingResources || [];
                                            handleUpdateNestedField('particulars', 'supportingResources', resources.filter((_, idx) => idx !== rIdx));
                                        }}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 block uppercase">File Name</label>
                                    <input
                                        type="text"
                                        value={res.name}
                                        onChange={(e) => {
                                            const resources = particulars.supportingResources || [];
                                            const updated = resources.map((item, idx) => idx === rIdx ? { ...item, name: e.target.value } : item);
                                            handleUpdateNestedField('particulars', 'supportingResources', updated);
                                        }}
                                        className="w-full border border-slate-200 rounded p-1 outline-none text-slate-705"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 block uppercase">Notes / Instruction</label>
                                    <input
                                        type="text"
                                        value={res.note}
                                        onChange={(e) => {
                                            const resources = particulars.supportingResources || [];
                                            const updated = resources.map((item, idx) => idx === rIdx ? { ...item, note: e.target.value } : item);
                                            handleUpdateNestedField('particulars', 'supportingResources', updated);
                                        }}
                                        className="w-full border border-slate-200 rounded p-1 outline-none text-slate-705"
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-450 pt-1">
                                    <span>Allowed formats: PDF, ZIP, XLS, CSV etc.</span>
                                    <select
                                        value={res.type}
                                        onChange={(e) => {
                                            const resources = particulars.supportingResources || [];
                                            const updated = resources.map((item, idx) => idx === rIdx ? { ...item, type: e.target.value } : item);
                                            handleUpdateNestedField('particulars', 'supportingResources', updated);
                                        }}
                                        className="border rounded p-0.5 bg-white"
                                    >
                                        {['PDF', 'ZIP', 'XLS', 'CSV', 'DOC', 'PPT', 'TXT', 'Image', 'Audio', 'Video'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShortAnswerBuilder;
