import { Video } from 'lucide-react';

const VideoSettingsDrawer = ({
    element,
    handleUpdateNestedField
}) => {
    const videoSettings = element.videoSettings || {};

    return (
        <div className="space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-[10px] font-black text-purple-750 uppercase tracking-widest flex items-center gap-1">
                    <Video size={12} /> Redesigned Video element Settings
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3.5 rounded-xl border border-slate-150">
                {/* 1. Recording Modes */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recording Modes</span>
                    <div className="space-y-1.5">
                        {[
                            { key: 'allowWebcam', label: 'Camera' },
                            { key: 'allowScreen', label: 'Screen Only' },
                            { key: 'allowScreenWebcam', label: 'Screen + Webcam' },
                            { key: 'allowAudioOnly', label: 'Audio Only' },
                            { key: 'allowUpload', label: 'Upload Existing Video' }
                        ].map(mode => (
                            <label key={mode.key} className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={videoSettings[mode.key] !== false}
                                    onChange={(e) => handleUpdateNestedField('videoSettings', mode.key, e.target.checked)}
                                    className="rounded text-purple-605 w-3.5 h-3.5"
                                />
                                {mode.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* 2. Video Restrictions */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Video Restrictions</span>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-600">Min Duration (sec)</span>
                            <input
                                type="number"
                                value={videoSettings.minDuration || 30}
                                onChange={(e) => handleUpdateNestedField('videoSettings', 'minDuration', Number(e.target.value))}
                                className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-600">Max Duration (sec)</span>
                            <input
                                type="number"
                                value={videoSettings.maxDuration || 600}
                                onChange={(e) => handleUpdateNestedField('videoSettings', 'maxDuration', Number(e.target.value))}
                                className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-600">Max File Size (MB)</span>
                            <input
                                type="number"
                                value={videoSettings.maxFileSize || 100}
                                onChange={(e) => handleUpdateNestedField('videoSettings', 'maxFileSize', Number(e.target.value))}
                                className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-600">Attempts Limit</span>
                            <input
                                type="number"
                                value={videoSettings.recordingAttemptsLimit || 3}
                                onChange={(e) => handleUpdateNestedField('videoSettings', 'recordingAttemptsLimit', Number(e.target.value))}
                                className="w-16 text-center text-xs bg-slate-50 border border-slate-200 rounded p-1"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Exam Security & AI Options */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exam Security & AI</span>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {[
                            { key: 'webcamRequired', label: 'Webcam Required' },
                            { key: 'microphoneRequired', label: 'Microphone Required' },
                            { key: 'fullScreenRequired', label: 'Full Screen Required' },
                            { key: 'tabSwitchingDetection', label: 'Tab Switch Detection' },
                            { key: 'multipleFaceDetection', label: 'Multiple Face Alert' },
                            { key: 'faceMissingDetection', label: 'Face Missing Alert' },
                            { key: 'backgroundNoiseDetection', label: 'Noise Alert' },
                            { key: 'aiTranscriptEnabled', label: 'AI Transcript Features' },
                            { key: 'timestampFeedbackEnabled', label: 'Timestamp Feedback' }
                        ].map(item => (
                            <label key={item.key} className="flex items-center gap-2 text-xs font-semibold text-slate-655 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!videoSettings[item.key]}
                                    onChange={(e) => handleUpdateNestedField('videoSettings', item.key, e.target.checked)}
                                    className="rounded text-purple-605 w-3.5 h-3.5"
                                />
                                {item.label}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoSettingsDrawer;
