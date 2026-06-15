import { PlaySquare, Link2 } from 'lucide-react';

// Detect embed URL from various video platforms
const getEmbedUrl = (url) => {
    if (!url) return '';

    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&#?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;

    // Direct embed URL passed
    if (url.includes('embed') || url.includes('player')) return url;

    return '';
};

const EmbeddedVideoBuilder = ({ element, onUpdateField }) => {
    const embedUrl = getEmbedUrl(element.embeddedVideoUrl || '');

    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            {/* URL Input */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Video URL
                </label>
                <div className="relative">
                    <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="url"
                        value={element.embeddedVideoUrl || ''}
                        onChange={(e) => onUpdateField('embeddedVideoUrl', e.target.value)}
                        placeholder="YouTube, Vimeo, or Loom URL..."
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Supported Platforms */}
            <div className="flex gap-2 flex-wrap">
                {['YouTube', 'Vimeo', 'Loom'].map((p) => (
                    <span key={p} className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                        {p}
                    </span>
                ))}
            </div>

            {/* Preview */}
            {element.embeddedVideoUrl && (
                embedUrl ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm aspect-video bg-black max-h-44 flex items-center justify-center">
                        <iframe
                            src={embedUrl}
                            title="Embedded Video Preview"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                        <PlaySquare size={22} />
                        <span className="text-xs font-semibold">Could not detect a supported platform. Try YouTube, Vimeo or Loom.</span>
                    </div>
                )
            )}

            {!element.embeddedVideoUrl && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <PlaySquare size={16} className="text-purple-500 shrink-0" />
                    <span className="text-xs text-purple-700 font-medium">
                        Paste a YouTube, Vimeo, or Loom video link to embed it in the test.
                    </span>
                </div>
            )}
        </div>
    );
};

export default EmbeddedVideoBuilder;
