import {
    Pencil, GripVertical, Image as ImageIcon, ArrowRightLeft, Trash2, ChevronUp, Mic,
    Bold, Italic, Underline, Strikethrough, Link, List, AlignLeft,
    Type, Music, Copy, Settings, Wand2, Upload, PenTool,
    AlignCenter, ArrowDownUp, Check, X, Maximize2, Minimize2, FileText, AlignLeft as Pilcrow
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const ParagraphWidget = ({ onDelete, onDuplicate, onUpdate, initialText = "" }) => {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    // Sync initial text
    useEffect(() => {
        if (editorRef.current && initialText && editorRef.current.innerText !== initialText) {
            editorRef.current.innerText = initialText;
        }
    }, [initialText]);

    const handleUpdate = () => {
        if (onUpdate && editorRef.current) {
            onUpdate(editorRef.current.innerText);
        }
    };

    // UI States
    const [activeFormats, setActiveFormats] = useState([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [enableAnswer, setEnableAnswer] = useState(false);
    const [enableTextStyle, setEnableTextStyle] = useState(true); // Default enabled as per screenshot usually implies context
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const checkActiveFormats = () => {
        const formats = [];
        if (document.queryCommandState('bold')) formats.push('bold');
        if (document.queryCommandState('italic')) formats.push('italic');
        if (document.queryCommandState('underline')) formats.push('underline');
        if (document.queryCommandState('strikeThrough')) formats.push('strikeThrough');
        if (document.queryCommandState('subscript')) formats.push('subscript');
        if (document.queryCommandState('superscript')) formats.push('superscript');
        if (document.queryCommandState('insertUnorderedList')) formats.push('insertUnorderedList');
        if (document.queryCommandState('justifyLeft')) formats.push('justifyLeft');
        if (document.queryCommandState('justifyCenter')) formats.push('justifyCenter');
        if (document.queryCommandState('justifyRight')) formats.push('justifyRight');
        setActiveFormats(formats);
    };

    const handleFormat = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
        checkActiveFormats();
    };

    const handleAiGeneration = () => {
        setIsAiGenerating(true);
        if (editorRef.current) {
            editorRef.current.focus();
            // Simulate AI typing
            editorRef.current.innerText = "Generating paragraph question...";
        }

        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.innerText = "Explain the significance of the industrial revolution on modern society, considering economic, social, and environmental impacts.";
            }
            setIsAiGenerating(false);
        }, 1500);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const newFile = e.target.files[0];
            setUploadedFiles(prev => [...prev, newFile]);
        }
    };

    const handleCopy = () => {
        const textToCopy = editorRef.current?.innerText || "";
        navigator.clipboard.writeText(textToCopy).then(() => {
            toast.success("Question text copied to clipboard!");
        });
        if (onDuplicate) onDuplicate();
    };

    const handleImageInsert = () => {
        const url = prompt("Enter Image URL:");
        if (url) handleFormat('insertImage', url);
    };

    const handleMicClick = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Your browser does not support speech recognition. Please try Chrome or Edge.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const processMathSpeech = (transcript) => {
            // ... (keep math processing or simplify for paragraph)
            return transcript;
        };

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;

            if (editorRef.current) {
                editorRef.current.focus();
                const success = document.execCommand('insertText', false, transcript);
                if (!success) {
                    editorRef.current.innerText += (editorRef.current.innerText ? ' ' : '') + transcript;
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-sans group hover:shadow-md transition-shadow">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

            {/* Header / Top Bar */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm shadow-indigo-200">
                        {/* Use Pilcrow if available, else AlignLeft */}
                        <Pilcrow size={18} />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Paragraph</span>
                </div>

                {/* Drag Handle */}
                <div className="flex-1 flex justify-center">
                    <GripVertical className="text-slate-400 cursor-move opacity-50 hover:opacity-100" size={20} />
                </div>

                {/* Main Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAiGeneration}
                        disabled={isAiGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white rounded text-xs font-bold hover:bg-sky-600 transition-colors shadow-sm shadow-sky-200 disabled:opacity-70"
                    >
                        <Wand2 size={14} className={isAiGenerating ? "animate-spin" : ""} />
                        {isAiGenerating ? "Generating..." : "Make it using AI"}
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                    >
                        <Upload size={14} /> Upload
                    </button>
                </div>

                {/* Right Icons */}
                <div className="flex items-center gap-3 ml-4 pl-4">
                    <button className="hover:text-red-500 text-red-400 p-1 hover:bg-red-50 rounded" onClick={onDelete}><Trash2 size={18} /></button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`hover:text-slate-600 p-1 hover:bg-slate-50 rounded transition-transform ${isExpanded ? '' : 'rotate-180'}`}
                    >
                        <ChevronUp size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isExpanded && (
                <div className="p-6 animate-fade-in">
                    {/* Question Input (Rich Text) */}
                    <div className="mb-6 relative group/input">
                        <div
                            ref={editorRef}
                            contentEditable
                            className="w-full text-lg text-slate-700 outline-none bg-transparent py-2 border-b-2 border-transparent focus:border-indigo-500 transition-colors pr-10 min-h-[46px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 rich-text-editor"
                            data-placeholder="Type your Text here"
                            onInput={handleUpdate}
                            onBlur={handleUpdate}
                            onKeyUp={(e) => {
                                checkActiveFormats();
                                handleUpdate();
                            }}
                            onMouseUp={checkActiveFormats}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    // optional: ensure proper block creation
                                }
                            }}
                        ></div>

                        <div className="absolute right-0 top-2 transition-all">
                            <button
                                onClick={handleMicClick}
                                className={`p-1 rounded-full transition-all ${isRecording ? 'text-red-500 scale-110 animate-pulse bg-red-50' : 'text-slate-400 hover:text-indigo-600 opacity-50 group-hover/input:opacity-100'}`}
                                title="Click to speak"
                            >
                                <Mic size={20} fill={isRecording ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    {enableTextStyle && (
                        <div className="flex items-center flex-wrap gap-2 mb-4 text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 select-none animate-fade-in">
                            <style>{`
                                .rich-text-editor ul { list-style-type: disc; margin-left: 1.5rem; }
                                .rich-text-editor ol { list-style-type: decimal; margin-left: 1.5rem; }
                                .rich-text-editor li { margin-bottom: 0.25rem; }
                            `}</style>
                            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
                                    className={`p-1.5 hover:shadow-sm rounded font-serif font-bold transition-all ${activeFormats.includes('bold') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Bold"
                                >B</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}
                                    className={`p-1.5 hover:shadow-sm rounded italic font-serif transition-all ${activeFormats.includes('italic') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Italic"
                                >I</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }}
                                    className={`p-1.5 hover:shadow-sm rounded underline transition-all ${activeFormats.includes('underline') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Underline"
                                >U</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('strikeThrough'); }}
                                    className={`p-1.5 hover:shadow-sm rounded line-through transition-all ${activeFormats.includes('strikeThrough') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Strikethrough"
                                >S</button>
                            </div>
                            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('subscript'); }}
                                    className={`p-1.5 hover:shadow-sm rounded font-mono text-xs transition-all ${activeFormats.includes('subscript') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Subscript"
                                >X<sub>2</sub></button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('superscript'); }}
                                    className={`p-1.5 hover:shadow-sm rounded font-mono text-xs transition-all ${activeFormats.includes('superscript') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Superscript"
                                >X<sup>2</sup></button>
                                <button
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        const url = prompt('Enter link URL:');
                                        if (url) handleFormat('createLink', url);
                                    }}
                                    className="p-1.5 hover:bg-white hover:shadow-sm rounded hover:text-indigo-600 transition-all"
                                    title="Link"
                                ><Link size={16} /></button>
                            </div>
                            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); }}
                                    className={`p-1.5 hover:shadow-sm rounded transition-all ${activeFormats.includes('insertUnorderedList') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="List"
                                ><List size={16} /></button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyLeft'); }}
                                    className={`p-1.5 hover:shadow-sm rounded transition-all ${activeFormats.includes('justifyLeft') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Align Left"
                                ><AlignLeft size={16} /></button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyCenter'); }}
                                    className={`p-1.5 hover:shadow-sm rounded transition-all ${activeFormats.includes('justifyCenter') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Align Center"
                                ><AlignCenter size={16} /></button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyRight'); }}
                                    className={`p-1.5 hover:shadow-sm rounded transition-all ${activeFormats.includes('justifyRight') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white hover:text-indigo-600'}`}
                                    title="Align Right"
                                ><AlignLeft size={16} className="rotate-180" /></button>
                                <button onMouseDown={(e) => { e.preventDefault(); handleFormat('fontName', 'Serif'); }} className="p-1.5 hover:bg-white hover:shadow-sm rounded hover:text-indigo-600 font-serif" title="Font">A</button>
                            </div>
                            <button
                                onMouseDown={(e) => { e.preventDefault(); handleFormat('hiliteColor', 'yellow'); }}
                                className="px-3 py-1 bg-purple-700 text-white text-[10px] uppercase font-bold rounded shadow-sm hover:bg-purple-800"
                            >
                                Background Color
                            </button>
                            <div className="flex-1"></div>
                            <button className="p-1.5 hover:bg-white hover:shadow-sm rounded hover:text-indigo-600"><Music size={16} /></button>
                            <button className="p-1.5 hover:bg-white hover:shadow-sm rounded hover:text-indigo-600"><ArrowDownUp size={16} /></button>
                        </div>
                    )}

                    {/* Answer Input */}
                    <div className="mb-6">
                        <textarea
                            placeholder="Type your Answer here"
                            className="w-full bg-white border border-slate-200 rounded-lg text-slate-600 text-sm px-4 py-3 min-h-[120px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
                        ></textarea>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                        <div className="mb-6 animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                    <Upload size={12} /> Attached Files ({uploadedFiles.length})
                                </div>
                                <button
                                    onClick={() => setUploadedFiles([])}
                                    className="text-xs text-red-400 hover:text-red-500 hover:underline"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg group hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-white rounded-md border border-slate-200 text-indigo-600 shadow-sm">
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                                                <span className="text-xs text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setUploadedFiles(files => files.filter((_, i) => i !== index))}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove file"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer Settings */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                            <div
                                className="flex items-center gap-2 cursor-pointer select-none"
                                onClick={() => setEnableTextStyle(!enableTextStyle)}
                            >
                                <span className="text-xs font-bold text-slate-800">Enable Text Style</span>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${enableTextStyle ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${enableTextStyle ? 'left-4.5 translate-x-4' : 'left-0.5'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParagraphWidget;
