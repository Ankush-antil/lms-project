import { Check, X, Plus } from 'lucide-react';
import { uploadAudio, getAudioUrl } from "../../../api/audioApi";

const AudioListeningBuilder = ({
    element,
    onUpdateField,
    handleUpdateOptionText,
    handleToggleCorrect,
    handleRemoveOption,
    handleAddOption,
    handleUpdateNestedField,
    index,
    setLightboxImage,
    setLightboxScale
}) => {
    const particulars = element.particulars || {};
    const options = element.options || [
        { text: 'Option 1', isCorrect: false },
        { text: 'Option 2', isCorrect: false }
    ];

    return (
<div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
        Upload Audio
    </label>

    <input
        type="file"
        accept="audio/*"
        onChange={async (e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            try {
                onUpdateField("audioName", file.name);

                const formData = new FormData();
                formData.append("audio", file);

                const data = await uploadAudio(formData);

                onUpdateField("audioUrl", data.audioUrl);
            } catch (error) {
                console.error("Audio upload failed:", error);
            }
        }}
        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2"
    />

    {element.audioName && (
        <div className="mt-2 h-10 w-full rounded-lg bg-slate-100 border border-slate-200 flex items-center px-3">
            <span className="text-sm text-slate-600 truncate">
                🎵 {element.audioName}
            </span>
        </div>
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

export default AudioListeningBuilder;
