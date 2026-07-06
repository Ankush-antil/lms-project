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

    const handleResizeStart = (e, corner) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = element.videoWidth || 500;

        const handleMouseMove = (moveEvent) => {
            let deltaX = moveEvent.clientX - startX;
            let deltaY = moveEvent.clientY - startY;
            // Use maximum delta to represent uniform resize
            let change = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
            if (deltaX < 0 && (corner === 'top-right' || corner === 'bottom-right')) change = -Math.abs(change);
            if (deltaX > 0 && (corner === 'top-left' || corner === 'bottom-left')) change = -Math.abs(change);
            if (deltaX > 0 && (corner === 'top-right' || corner === 'bottom-right')) change = Math.abs(change);
            if (deltaX < 0 && (corner === 'top-left' || corner === 'bottom-left')) change = Math.abs(change);

            const newWidth = Math.max(500, Math.min(1000, startWidth + change * 1.5));
            onUpdateField('videoWidth', newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

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
                    <div 
                        className="relative mx-auto group/video rounded-2xl border border-slate-200 shadow-md aspect-video bg-black flex items-center justify-center transition-shadow hover:shadow-lg"
                        style={{ width: `${element.videoWidth || 500}px`, maxWidth: '100%' }}
                    >
                        <iframe
                            src={embedUrl}
                            title="Embedded Video Preview"
                            className="w-full h-full border-0 rounded-2xl pointer-events-auto"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />

                        {/* Resize handles at four corners */}
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
                            className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                            title="Resize video"
                        />
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                            title="Resize video"
                        />
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
                            className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                            title="Resize video"
                        />
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md opacity-0 group-hover/video:opacity-100 transition-opacity z-20 hover:scale-125 pointer-events-auto"
                            title="Resize video"
                        />

                        {/* Drag Helper Label */}
                        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-[9px] font-black text-white px-2 py-1 rounded-lg uppercase tracking-wider opacity-0 group-hover/video:opacity-100 transition-opacity pointer-events-none select-none z-10 shadow-sm border border-white/10">
                            Drag corners to resize
                        </div>
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
