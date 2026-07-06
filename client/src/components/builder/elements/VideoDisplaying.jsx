import { uploadVideo, getVideoUrl } from "../../../api/videoApi";

const VideoBuilder = ({
    element,
    index,
    onUpdateField,
    handleUpdateNestedField,
    setLightboxImage,
    setLightboxScale
}) => {
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

            {/* Upload Input */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">
                    Upload Video
                </label>

                <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        try {
                            onUpdateField("videoName", file.name);

                            const formData = new FormData();
                            formData.append("video", file);

                            const data = await uploadVideo(formData);

                            console.log("Uploaded Video:", data);

                            onUpdateField("videoUrl", data.videoUrl);
                        } catch (error) {
                            console.error("Video upload failed:", error);
                        }
                    }}
                    className="w-full text-sm bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all"
                />

                {/* File Name Card */}
                {element.videoName && (
                    <div className="mt-2 h-10 w-full rounded-lg bg-slate-100 border border-slate-200 flex items-center px-3">
                        <span className="text-sm text-slate-600 truncate">
                            {element.videoName}
                        </span>
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

            {/* Video Settings */}
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={!!element.autoplay}
                        onChange={(e) =>
                            onUpdateField("autoplay", e.target.checked)
                        }
                        className="rounded text-purple-600"
                    />
                    Autoplay
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={!!element.loop}
                        onChange={(e) =>
                            onUpdateField("loop", e.target.checked)
                        }
                        className="rounded text-purple-600"
                    />
                    Loop Video
                </label>
            </div>

            {/* Video Preview */}
            {element.videoUrl && (
                <div className="space-y-2">
                    <p className="text-xs text-slate-500 break-all">
                        {element.videoUrl}
                    </p>

                    <div 
                        className="relative mx-auto group/video rounded-2xl border border-slate-800 bg-black flex items-center justify-center transition-shadow hover:shadow-lg aspect-video"
                        style={{ width: `${element.videoWidth || 500}px`, maxWidth: '100%' }}
                    >
                        <video
                            src={getVideoUrl(element.videoUrl)}
                            controls
                            autoPlay={!!element.autoplay}
                            loop={!!element.loop}
                            className="w-full rounded-2xl object-contain bg-black pointer-events-auto"
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
                </div>
            )}
        </div>
    );
};

export default VideoBuilder;
