const VideoBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Video Source URL (.mp4)</label>
                <input
                    type="text"
                    value={element.videoUrl || ''}
                    onChange={(e) => onUpdateField('videoUrl', e.target.value)}
                    placeholder="https://www.w3schools.com/html/mov_bbb.mp4"
                    className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                />
            </div>
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={!!element.autoplay}
                        onChange={(e) => onUpdateField('autoplay', e.target.checked)}
                        className="rounded text-purple-600"
                    />
                    Autoplay
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={!!element.loop}
                        onChange={(e) => onUpdateField('loop', e.target.checked)}
                        className="rounded text-purple-600"
                    />
                    Loop Video
                </label>
            </div>
            {element.videoUrl && (
                <video src={element.videoUrl} controls className="max-h-40 rounded-lg w-full bg-black mt-2" />
            )}
        </div>
    );
};

export default VideoBuilder;
