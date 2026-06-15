import { Globe, ExternalLink, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const WebpageBuilder = ({ element, onUpdateField }) => {
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
                        <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    {element.webpageUrl && (
                        <a
                            href={element.webpageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all whitespace-nowrap"
                        >
                            <ExternalLink size={13} />
                            Open
                        </a>
                    )}
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
