import { Sliders, X } from 'lucide-react';

const ParticularsDrawer = ({
    element,
    index,
    onUpdateField,
    handleUpdateNestedField,
    setActiveFooterTab
}) => {
    const label = element.label;
    const required = !!element.required;
    const marks = element.marks !== undefined ? element.marks : 1;
    const negativeMarks = element.negativeMarks || 0;
    const particulars = element.particulars || {
        shuffleOptions: false,
        multipleAttempts: false,
        charLimit: '',
        wordLimit: '',
        fileSizeLimit: 10,
        fileTypes: 'All',
        required: false,
        singleLineMode: false,
        minChars: '',
        maxChars: '',
        minWords: '',
        maxWords: '',
        placeholderText: 'Your answer',
        defaultValue: '',
        inputWidth: '100%',
        validationRules: '',
        answerMode: 'Text + Upload + Audio',
        enableTextStyle: false,
        style: {
            fontSize: '14px',
            fontWeight: 'normal',
            textColor: '#334155',
            bgColor: '#F8FAFC',
            borderRadius: '16px',
            borderStyle: 'solid',
            borderColor: '#E2E8F0'
        },
        supportingResources: []
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-150 p-4 space-y-3 animate-fade-in shadow-inner text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders size={13} className="text-teal-600" /> Element-Specific Settings
                </span>
                <button
                    type="button"
                    onClick={() => setActiveFooterTab(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded transition-all"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="space-y-3 text-left">
                {['Short Answer', 'Text Answer'].includes(label) ? (
                    <div className="space-y-4">
                        {/* Section 1: Text Answer Settings */}
                        <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Text Answer Configuration</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="flex items-center gap-2 select-none pt-2">
                                    <input
                                        type="checkbox"
                                        id={`req-sh-${index}`}
                                        checked={required}
                                        onChange={(e) => onUpdateField('required', e.target.checked)}
                                        className="rounded text-purple-600 w-4 h-4"
                                    />
                                    <label htmlFor={`req-sh-${index}`} className="font-semibold text-slate-700">Required Field</label>
                                </div>
                                <div className="flex items-center gap-2 select-none pt-2">
                                    <input
                                        type="checkbox"
                                        id={`single-line-${index}`}
                                        checked={!!particulars.singleLineMode}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'singleLineMode', e.target.checked)}
                                        className="rounded text-purple-600 w-4 h-4"
                                    />
                                    <label htmlFor={`single-line-${index}`} className="font-semibold text-slate-700">Single Line Mode</label>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Min Characters</label>
                                    <input
                                        type="number"
                                        value={particulars.minChars || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'minChars', e.target.value)}
                                        placeholder="No Min"
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Max Characters</label>
                                    <input
                                        type="number"
                                        value={particulars.maxChars || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'maxChars', e.target.value)}
                                        placeholder="No Max"
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Min Words</label>
                                    <input
                                        type="number"
                                        value={particulars.minWords || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'minWords', e.target.value)}
                                        placeholder="No Min"
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Max Words</label>
                                    <input
                                        type="number"
                                        value={particulars.maxWords || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'maxWords', e.target.value)}
                                        placeholder="No Max"
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Placeholder Text</label>
                                    <input
                                        type="text"
                                        value={particulars.placeholderText || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'placeholderText', e.target.value)}
                                        placeholder="Your Answer"
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Default Value</label>
                                    <input
                                        type="text"
                                        value={particulars.defaultValue || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'defaultValue', e.target.value)}
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Input Width</label>
                                    <input
                                        type="text"
                                        value={particulars.inputWidth || '100%'}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'inputWidth', e.target.value)}
                                        placeholder="100% or 50%"
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-505">Validation Rules</label>
                                    <select
                                        value={particulars.validationRules || 'none'}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'validationRules', e.target.value)}
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    >
                                        <option value="none">No Validation</option>
                                        <option value="regex">Regex pattern</option>
                                        <option value="keywords">Keywords list</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Answer Mode Settings */}
                        <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Answer Mode Settings</span>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
                                <label className="font-semibold text-slate-600 shrink-0">Answer Type:</label>
                                <select
                                    value={particulars.answerMode || 'Text + Upload + Audio'}
                                    onChange={(e) => handleUpdateNestedField('particulars', 'answerMode', e.target.value)}
                                    className="border rounded p-1.5 bg-slate-55 font-bold text-purple-700 outline-none"
                                >
                                    <option value="Text Only">Text Only</option>
                                    <option value="Text + Upload">Text + Upload</option>
                                    <option value="Text + Audio">Text + Audio</option>
                                    <option value="Text + Upload + Audio">Text + Upload + Audio</option>
                                    <option value="Upload Only">Upload Only</option>
                                    <option value="Audio Only">Audio Only</option>
                                </select>
                                <span className="text-[11px] text-slate-450 italic">Determines which input fields and action buttons are visible to the student.</span>
                            </div>
                        </div>

                        {/* Section 3: Question Particular Panel (Metadata, Tags, Difficulty, Scoring) */}
                        <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Question Metadata & Particular Panel</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Question Metadata</span>
                                    <input
                                        type="text"
                                        value={particulars.metadata || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'metadata', e.target.value)}
                                        placeholder="Category, Chapter, Standard etc."
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Question Tags</span>
                                    <input
                                        type="text"
                                        value={particulars.tags || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'tags', e.target.value)}
                                        placeholder="comma-separated-tags"
                                        className="w-full border rounded p-1.5 bg-slate-55"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Difficulty Level</span>
                                    <select
                                        value={particulars.difficulty || 'Medium'}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'difficulty', e.target.value)}
                                        className="w-full border rounded p-1.5 bg-slate-55 font-bold"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Scoring Model</span>
                                    <select
                                        value={particulars.scoring || 'manual'}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'scoring', e.target.value)}
                                        className="w-full border rounded p-1.5 bg-slate-55 font-bold"
                                    >
                                        <option value="auto">Auto Evaluation</option>
                                        <option value="manual">Teacher Review (Manual)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550">Marks Weight</span>
                                    <input
                                        type="number"
                                        value={marks}
                                        onChange={(e) => onUpdateField('marks', Number(e.target.value))}
                                        className="w-full border rounded p-1.5 bg-slate-55 font-extrabold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550">Negative Marks</span>
                                    <input
                                        type="number"
                                        value={negativeMarks}
                                        onChange={(e) => onUpdateField('negativeMarks', Number(e.target.value))}
                                        className="w-full border rounded p-1.5 bg-slate-55 font-extrabold"
                                    />
                                </div>
                                <div className="space-y-1 sm:col-span-3">
                                    <span className="text-[10px] font-bold text-slate-550 block">Custom Settings JSON Placeholder</span>
                                    <textarea
                                        value={particulars.customSettings || ''}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'customSettings', e.target.value)}
                                        placeholder='{"allowCopyPaste": false, "scoringRubric": "Keyword matching"}'
                                        rows={2}
                                        className="w-full border rounded p-1.5 bg-slate-55 font-mono text-[10px]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-150">
                        {/* MCQ Particulars */}
                        {(label === 'Multiple Choice' || label === 'Checkboxes' || label === 'Dropdown' || label === 'Matching') && (
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={particulars.shuffleOptions}
                                    onChange={(e) => handleUpdateNestedField('particulars', 'shuffleOptions', e.target.checked)}
                                    className="rounded text-purple-600 w-4 h-4"
                                />
                                Shuffle Choices list
                            </label>
                        )}

                        {/* Word Limits particulars */}
                        {(label === 'Paragraph' || label === 'Voice Rec') && (
                            <>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Maximum Word Limit</span>
                                    <input
                                        type="number"
                                        value={particulars.wordLimit}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'wordLimit', e.target.value)}
                                        placeholder="No Limit"
                                        className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Character Limit</span>
                                    <input
                                        type="number"
                                        value={particulars.charLimit}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'charLimit', e.target.value)}
                                        placeholder="No Limit"
                                        className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                    />
                                </div>
                            </>
                        )}

                        {/* Upload limit particulars */}
                        {label === 'File Upload' && (
                            <>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Max File Size (MB)</span>
                                    <input
                                        type="number"
                                        value={particulars.fileSizeLimit}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'fileSizeLimit', e.target.value)}
                                        className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-505">Allowed File Formats</span>
                                    <select
                                        value={particulars.fileTypes}
                                        onChange={(e) => handleUpdateNestedField('particulars', 'fileTypes', e.target.value)}
                                        className="w-full text-xs bg-slate-55 border border-slate-150 rounded-lg p-1.5"
                                    >
                                        <option value="All">All Formats</option>
                                        <option value="Images">Images only (.png, .jpg)</option>
                                        <option value="Documents">PDF & Word only</option>
                                        <option value="Media">Audio & Video only</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={particulars.multipleAttempts}
                                onChange={(e) => handleUpdateNestedField('particulars', 'multipleAttempts', e.target.checked)}
                                className="rounded text-purple-655 w-4 h-4"
                            />
                            Allow Multiple Retakes
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParticularsDrawer;
