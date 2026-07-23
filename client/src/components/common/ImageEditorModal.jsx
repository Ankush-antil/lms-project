import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Crop, Pencil, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const ImageEditorModal = ({ isOpen, onClose, draft, title, setTitle, onSave }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [brushColor, setBrushColor] = useState('#ef4444');
    const [brushSize, setBrushSize] = useState(4);
    const [editorMode, setEditorMode] = useState('draw'); // 'draw' | 'crop'
    const [localTitle, setLocalTitle] = useState(title || '');

    // Drawing state
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });

    // Cropping selection state
    const [cropArea, setCropArea] = useState(null); // { startX, startY, endX, endY }
    const isSelectingCropRef = useRef(false);
    const cropStartRef = useRef({ x: 0, y: 0 });

    // History state for undo
    const [history, setHistory] = useState([]);

    // Load image onto canvas
    useEffect(() => {
        if (!draft?.url) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = draft.url;
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match container and image aspect ratio
            const container = containerRef.current;
            const maxW = container ? container.clientWidth - 32 : 600;
            const maxH = 400;
            
            let w = img.width;
            let h = img.height;
            
            if (w > maxW) {
                h = (maxW / w) * h;
                w = maxW;
            }
            if (h > maxH) {
                w = (maxH / h) * w;
                h = maxH;
            }
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            
            // Push initial state to history
            setHistory([canvas.toDataURL()]);
        };
    }, [draft]);

    const getCanvasMousePos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        // Handle touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: ((clientX - rect.left) / rect.width) * canvas.width,
            y: ((clientY - rect.top) / rect.height) * canvas.height
        };
    };

    const handleMouseDown = (e) => {
        if (editorMode === 'draw') {
            isDrawingRef.current = true;
            const pos = getCanvasMousePos(e);
            lastPosRef.current = pos;
        } else if (editorMode === 'crop') {
            isSelectingCropRef.current = true;
            const pos = getCanvasMousePos(e);
            cropStartRef.current = pos;
            setCropArea({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
        }
    };

    const handleMouseMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pos = getCanvasMousePos(e);

        if (editorMode === 'draw' && isDrawingRef.current) {
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            lastPosRef.current = pos;
        } else if (editorMode === 'crop' && isSelectingCropRef.current && cropArea) {
            setCropArea(prev => ({
                ...prev,
                endX: pos.x,
                endY: pos.y
            }));
        }
    };

    const handleMouseUp = () => {
        if (editorMode === 'draw' && isDrawingRef.current) {
            isDrawingRef.current = false;
            // Save state to history
            const canvas = canvasRef.current;
            if (canvas) {
                setHistory(prev => [...prev, canvas.toDataURL()]);
            }
        } else if (editorMode === 'crop' && isSelectingCropRef.current) {
            isSelectingCropRef.current = false;
        }
    };

    const handleUndo = () => {
        if (history.length <= 1) {
            toast.error("No actions to undo!");
            return;
        }
        
        const newHistory = history.slice(0, -1);
        setHistory(newHistory);
        const previousState = newHistory[newHistory.length - 1];
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.src = previousState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    };

    const handleApplyCrop = () => {
        if (!cropArea) {
            toast.error("Drag on the image to select crop area!");
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const x = Math.min(cropArea.startX, cropArea.endX);
        const y = Math.min(cropArea.startY, cropArea.endY);
        const w = Math.abs(cropArea.startX - cropArea.endX);
        const h = Math.abs(cropArea.startY - cropArea.endY);

        if (w < 10 || h < 10) {
            toast.error("Crop area is too small!");
            return;
        }

        // Create temp canvas to extract cropped area
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

        // Draw cropped area back to main canvas
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(tempCanvas, 0, 0);

        setCropArea(null);
        setHistory(prev => [...prev, canvas.toDataURL()]);
        toast.success("Image cropped!");
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL();
        setTitle(localTitle);
        
        // Calculate file size from dataUrl
        const head = "data:image/png;base64,";
        const fileSizeBytes = Math.round((dataUrl.length - head.length) * 3 / 4);
        const sizeString = (fileSizeBytes / 1024).toFixed(1) + " KB";

        onSave({
            ...draft,
            title: localTitle,
            url: dataUrl,
            size: sizeString,
            resolution: `${canvas.width}x${canvas.height}`
        });
    };

    // Render crop selection box
    const getCropBoxStyles = () => {
        if (!cropArea || !canvasRef.current) return { display: 'none' };
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const xRatio = rect.width / canvas.width;
        const yRatio = rect.height / canvas.height;

        const x = Math.min(cropArea.startX, cropArea.endX) * xRatio;
        const y = Math.min(cropArea.startY, cropArea.endY) * yRatio;
        const w = Math.abs(cropArea.startX - cropArea.endX) * xRatio;
        const h = Math.abs(cropArea.startY - cropArea.endY) * yRatio;

        return {
            left: `${x}px`,
            top: `${y}px`,
            width: `${w}px`,
            height: `${h}px`,
            border: '2px dashed #10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
        };
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left font-sans">
            <div className="bg-[#f5f5f5] rounded-3xl max-w-xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                        Edit & Crop Screenshot
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                    {/* Title Input */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Screenshot Name / Title
                        </label>
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            placeholder="Enter title..."
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 outline-none font-bold text-slate-700 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-150 flex-wrap gap-2.5">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => {
                                    setEditorMode('draw');
                                    setCropArea(null);
                                }}
                                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    editorMode === 'draw'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <Pencil size={14} />
                                <span>Draw</span>
                            </button>
                            <button
                                onClick={() => setEditorMode('crop')}
                                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    editorMode === 'crop'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <Crop size={14} />
                                <span>Crop</span>
                            </button>
                        </div>

                        {/* Drawing Controls */}
                        {editorMode === 'draw' && (
                            <div className="flex items-center gap-2.5">
                                {/* Color choices */}
                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                                    {['#ef4444', '#10b981', '#3b82f6', '#1e293b'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setBrushColor(c)}
                                            style={{ backgroundColor: c }}
                                            className={`w-4 h-4 rounded-full border transition-all ${
                                                brushColor === c ? 'scale-110 ring-1 ring-slate-400' : 'opacity-80'
                                            }`}
                                        />
                                    ))}
                                </div>
                                {/* Brush Size input */}
                                <input
                                    type="range"
                                    min="2"
                                    max="12"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-16 accent-indigo-600"
                                />
                            </div>
                        )}

                        {/* Crop Actions */}
                        {editorMode === 'crop' && (
                            <button
                                onClick={handleApplyCrop}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                            >
                                Apply Crop
                            </button>
                        )}

                        {/* Undo action */}
                        <button
                            onClick={handleUndo}
                            className="p-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
                            title="Undo Last Action"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>

                    {/* Canvas Area */}
                    <div 
                        ref={containerRef}
                        className="bg-slate-900 rounded-2xl flex items-center justify-center p-4 border border-slate-800 relative overflow-hidden"
                        style={{ touchAction: 'none' }}
                    >
                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleMouseDown}
                                onTouchMove={handleMouseMove}
                                onTouchEnd={handleMouseUp}
                                className={`rounded-lg cursor-crosshair bg-slate-950 ${
                                    editorMode === 'crop' ? 'select-none' : ''
                                }`}
                            />
                            {/* Overlay selection box for crop */}
                            {editorMode === 'crop' && cropArea && (
                                <div 
                                    className="absolute pointer-events-none rounded"
                                    style={getCropBoxStyles()}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1"
                    >
                        <Check size={14} />
                        <span>Save Edits</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImageEditorModal;
