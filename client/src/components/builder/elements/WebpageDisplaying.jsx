import { Globe, ExternalLink, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const WebpageBuilder = ({ 
    element,
    onUpdateField,
    index,
    handleUpdateNestedField,
}) => {
    const particulars = element.particulars || {};
    const [previewError, setPreviewError] = useState(false);

    const handleLoad = () => setPreviewError(false);
    const handleError = () => setPreviewError(true);

    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            {/* URL Input */}
            <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
        Webpage URL
    </label>

    <div className="flex gap-2">
        <div className="relative flex-1">
            <Globe
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
                type="url"
                value={element.webpageUrl || ''}
                onChange={(e) => {
                    onUpdateField('webpageUrl', e.target.value);
                    setPreviewError(false);
                }}
                placeholder="https://example.com"
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all font-medium"
            />
        </div>
    </div>
</div>

<div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
        HTML Code
    </label>

    <textarea
    value={element.htmlContent || ''}
    onChange={(e) =>
        onUpdateField('htmlContent', e.target.value)
    }
    rows={1}
    placeholder="<h1>Hello Student</h1>"
    className="w-full h-10 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all resize-none"
/>
</div>

        {/* Preview */}
{(element.webpageUrl || element.htmlContent) && (
    <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {element.htmlContent ? (
            <iframe
                title="HTML Preview"
                srcDoc={element.htmlContent}
                className="w-full border-0 bg-white"
                style={{
                    height: `${Math.min(element.webpageHeight || 400, 350)}px`
                }}
                sandbox="allow-scripts"
            />
        ) : previewError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 bg-amber-50 text-amber-700">
                <AlertTriangle size={20} />
                <span className="text-xs font-semibold">
                    This page blocks embedding. Try the Open button.
                </span>
            </div>
        ) : (
            <iframe
                src={element.webpageUrl}
                title="Webpage Preview"
                className="w-full border-0"
                style={{
                    height: `${Math.min(element.webpageHeight || 400, 350)}px`
                }}
                scrolling={element.webpageScroll || "yes"}
                onLoad={handleLoad}
                onError={handleError}
            />
        )}
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

            {/* Height Option */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Height (px)
                    </label>
                    <input
                        type="number"
                        value={element.webpageHeight || 400}
                        onChange={(e) => onUpdateField('webpageHeight', Number(e.target.value))}
                        min={200}
                        max={1200}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-medium"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Scrollable
                    </label>
                    <select
                        value={element.webpageScroll || 'yes'}
                        onChange={(e) => onUpdateField('webpageScroll', e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-purple-500 transition-all font-semibold"
                    >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>
            </div>

            {/* Preview */}
            {element.webpageUrl && (
                <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    {previewError ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-6 bg-amber-50 text-amber-700">
                            <AlertTriangle size={20} />
                            <span className="text-xs font-semibold">
                                This page blocks embedding. It will still load for students in the test.
                            </span>
                        </div>
                    ) : (
                        <iframe
                            src={element.webpageUrl}
                            title="Webpage Preview"
                            style={{ height: `${Math.min(element.webpageHeight || 400, 220)}px` }}
                            className="w-full border-0"
                            scrolling={element.webpageScroll || 'yes'}
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    )}
                </div>
            )}

            {!element.webpageUrl && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                    <Globe size={16} className="text-purple-400 shrink-0" />
                    <span className="text-xs text-slate-500 font-medium">
                        Enter a URL above to embed a webpage. Students will see it inline in the test.
                    </span>
                </div>
            )}
        </div>
    );
};

export default WebpageBuilder;
