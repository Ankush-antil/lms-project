const ImageBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const particulars = element.particulars || {};

    return (
        <div className="space-y-3">
            <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Image Source URL</label>
                    <input
                        type="text"
                        value={element.imageUrl || ''}
                        onChange={(e) => onUpdateField('imageUrl', e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Alt Text</label>
                        <input
                            type="text"
                            value={element.altText || ''}
                            onChange={(e) => onUpdateField('altText', e.target.value)}
                            placeholder="Description of image"
                            className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Alignment</label>
                        <select
                            value={element.align || 'center'}
                            onChange={(e) => onUpdateField('align', e.target.value)}
                            className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-semibold"
                        >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                </div>
                {element.imageUrl && (
                    <div className="mt-3 flex justify-center border border-slate-105 rounded-xl p-2 bg-slate-50">
                        <img
                            src={element.imageUrl}
                            alt={element.altText || 'Preview'}
                            className="max-h-40 rounded-lg object-contain shadow-sm"
                        />
                    </div>
                )}
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

export default ImageBuilder;
