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

const EmbeddedVideoBuilder = ({ element, onUpdateField, handleUpdateNestedField }) => {
    const embedUrl = getEmbedUrl(element.embeddedVideoUrl || '');
    const particulars = element.particulars || {};

    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            {/* URL Input */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 uppercase tracking-wider block">
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
                    <div className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-55 border border-dashed border-slate-200 rounded-xl text-slate-400">
                        <PlaySquare size={22} />
                        <span className="text-xs font-semibold">Could not detect a supported platform. Try YouTube, Vimeo or Loom.</span>
                    </div>
                )
            )}



            {/* Student Answer Box & Enable It Switch */}
            <div className="flex items-center justify-between bg-white px-3.5 py-3.5 border border-slate-200 rounded-xl shadow-sm">
                {particulars.enableAnswerBox !== false ? (
                    <input
                        type="text"
                        placeholder="Type your Answer here"
                        readOnly
                        tabIndex={-1}
                        className="bg-transparent outline-none flex-1 text-sm border-none font-sans pointer-events-none select-none cursor-default"
                        style={{
                            fontSize: particulars.enableTextStyle && particulars.style?.fontSize ? particulars.style.fontSize : '14px',
                            fontWeight: particulars.enableTextStyle && particulars.style?.fontWeight ? particulars.style.fontWeight : 'normal',
                            color: particulars.enableTextStyle && particulars.style?.textColor ? particulars.style.textColor : '#94a3b8',
                            backgroundColor: particulars.enableTextStyle && particulars.style?.bgColor ? particulars.style.bgColor : 'transparent',
                            borderRadius: particulars.enableTextStyle && particulars.style?.borderRadius ? particulars.style.borderRadius : '8px',
                            border: particulars.enableTextStyle && particulars.style?.borderStyle && particulars.style.borderStyle !== 'none' ? `1px ${particulars.style.borderStyle} ${particulars.style.borderColor || '#cbd5e1'}` : 'none',
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}
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

export default EmbeddedVideoBuilder;
