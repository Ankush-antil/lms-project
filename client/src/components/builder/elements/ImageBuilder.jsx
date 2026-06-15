const ImageBuilder = ({
    element,
    onUpdateField
}) => {
    return (
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
    );
};

export default ImageBuilder;
