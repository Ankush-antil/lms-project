const getYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = String(url).match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
};

const YouTubeBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 uppercase tracking-wider block">YouTube Link or Video ID</label>
                <input
                    type="text"
                    value={element.youtubeUrl || ''}
                    onChange={(e) => onUpdateField('youtubeUrl', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    className="w-full text-sm bg-slate-55 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                />
            </div>
            {element.youtubeUrl && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 shadow-sm aspect-video bg-black max-h-40 flex items-center justify-center">
                    <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(element.youtubeUrl)}`}
                        title="YouTube Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )}
        </div>
    );
};

export default YouTubeBuilder;
