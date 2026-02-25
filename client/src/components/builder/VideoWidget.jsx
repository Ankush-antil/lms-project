import {
    Pencil, GripVertical, Image as ImageIcon, ArrowRightLeft, Trash2, ChevronUp, Mic,
    Bold, Italic, Underline, Strikethrough, Link, List, AlignLeft,
    Type, Music, Copy, Settings, Wand2, Upload, PenTool,
    AlignCenter, ArrowDownUp, Check, X, Maximize2, Minimize2, FileText, Video
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const VideoWidget = ({ onDelete, onDuplicate, onUpdate, initialText = "" }) => {
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && initialText && editorRef.current.innerText !== initialText) {
            editorRef.current.innerText = initialText;
        }
    }, [initialText]);

    const handleUpdate = () => {
        if (onUpdate && editorRef.current) onUpdate(editorRef.current.innerText);
    };

    // UI States
    const [isExpanded, setIsExpanded] = useState(true);
    const [enableTextStyle, setEnableTextStyle] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [activeFormats, setActiveFormats] = useState([]);

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
        // ...
    };


    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-sans group hover:shadow-md transition-shadow mb-6">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

            {/* Header / Top Bar */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#5B8EFF] rounded-lg text-white shadow-sm shadow-blue-200">
                        <Video size={18} />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Video</span>
                </div>

                {/* Drag Handle */}
                <div className="flex-1 flex justify-center">
                    <GripVertical className="text-slate-400 cursor-move opacity-50 hover:opacity-100" size={20} />
                </div>

                {/* Main Actions */}
                <div className="flex items-center gap-2">
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white rounded text-xs font-bold hover:bg-sky-600 transition-colors shadow-sm shadow-sky-200"
                    >
                        <Wand2 size={14} /> Make it using AI
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6F42C1] text-white rounded text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm shadow-purple-200"
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
                    {/* Text Input */}
                    <div className="mb-6 relative group/input">
                        <div
                            ref={editorRef}
                            contentEditable
                            className="w-full text-lg text-slate-700 outline-none bg-transparent py-2 border-b-2 border-transparent focus:border-blue-500 transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 rich-text-editor"
                            data-placeholder="Type your Text here"
                            onInput={handleUpdate}
                            onBlur={handleUpdate}
                            onKeyUp={(e) => { checkActiveFormats(); handleUpdate(); }}
                            onMouseUp={checkActiveFormats}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    // optional: ensure proper block creation
                                }
                            }}
                        ></div>
                    </div>

                    {/* Answer Input */}
                    <div className="mb-6">
                        <input
                            type="text"
                            placeholder="Type your Answer here"
                            className="w-full text-sm text-slate-600 px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                        />
                    </div>

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



                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                        <div className="mb-6 animate-fade-in">
                            {/* ... Same file list logic ... */}
                            <div className="flex flex-col gap-2">
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-sm">
                                        <span>{file.name}</span>
                                        <X size={14} className="cursor-pointer" onClick={() => setUploadedFiles([])} />
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
                                <span className={`text-xs font-bold ${enableTextStyle ? 'text-blue-600' : 'text-slate-500'}`}>Enable Text Style</span>
                                <div className={`w-9 h-5 rounded-full relative transition-colors ${enableTextStyle ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${enableTextStyle ? 'left-4.5 translate-x-3.5' : 'left-0.5'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoWidget;
