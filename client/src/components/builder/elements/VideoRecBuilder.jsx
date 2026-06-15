import { Video } from 'lucide-react';

const VideoRecBuilder = () => {
    return (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6 flex flex-col items-center justify-center gap-2 text-center select-none shadow-sm">
            <Video size={24} className="text-purple-600 animate-pulse" />
            <span className="text-sm font-semibold text-slate-700">Video Response capture block</span>
            <span className="text-xs text-slate-400">Requires camera permissions to record student video.</span>
        </div>
    );
};

export default VideoRecBuilder;
