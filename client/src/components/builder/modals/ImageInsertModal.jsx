import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Camera, FolderUp, Image as ImageIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ImageInsertModal = ({
    isOpen,
    onClose,
    index,
    imageSearchQuery,
    setImageSearchQuery,
    imageByUrl,
    setImageByUrl,
    activeImageTab,
    setActiveImageTab,
    onAddImage
}) => {
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [isWebcamOn, setIsWebcamOn] = useState(true);
    const [searchResults, setSearchResults] = useState([
        { tag: 'office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&auto=format&fit=crop&q=60' },
        { tag: 'meeting', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=60' },
        { tag: 'success', url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&auto=format&fit=crop&q=60' },
        { tag: 'classroom', url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=300&auto=format&fit=crop&q=60' },
        { tag: 'study', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&auto=format&fit=crop&q=60' },
        { tag: 'laptop', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&auto=format&fit=crop&q=60' }
    ]);

    useEffect(() => {
        let activeStream = null;
        if (isOpen && activeImageTab === 'Webcam' && isWebcamOn) {
            setCameraError(null);
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then((mediaStream) => {
                        activeStream = mediaStream;
                        setStream(mediaStream);
                    })
                    .catch((err) => {
                        console.error("Camera access error:", err);
                        setCameraError("Camera access denied or unavailable. Fallback mockup snapshot will be used.");
                    });
            } else {
                setCameraError("Media devices not supported in this browser. Fallback mockup snapshot will be used.");
            }
        } else {
            setStream(null);
        }

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            setStream(null);
        };
    }, [isOpen, activeImageTab, isWebcamOn]);

    // Bind stream to video element when videoRef is attached and stream is ready
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, activeImageTab, isWebcamOn]);

    const handleWebcamSnapshot = () => {
        if (stream && videoRef.current) {
            try {
                const video = videoRef.current;
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onAddImage(dataUrl);
                toast.success("Snapshot captured successfully!");
            } catch (err) {
                console.error("Error capturing canvas frame:", err);
                onAddImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60');
                toast.success("Fallback mockup snapshot added!");
            }
        } else {
            onAddImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60');
            toast.success("Mockup snapshot added!");
        }
    };

    const handleSearch = async () => {
        const query = imageSearchQuery.trim();
        if (!query) {
            toast.error("Please enter a search term");
            return;
        }
        
        toast.loading("Searching images...", { id: 'img-search' });
        
        try {
            const response = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=60&prop=imageinfo&iiprop=url&format=json&origin=*`);
            const data = await response.json();
            
            let results = [];
            if (data.query && data.query.pages) {
                results = Object.values(data.query.pages)
                    .map(p => ({
                        tag: query,
                        url: p.imageinfo && p.imageinfo[0] ? p.imageinfo[0].url : null
                    }))
                    .filter(item => item.url && /\.(jpe?g|png|webp|gif)$/i.test(item.url));
            }
            
            // Supplement with picsum photos if we have fewer than 6 images
            if (results.length < 6) {
                const needed = 6 - results.length;
                for (let i = 0; i < needed; i++) {
                    results.push({
                        tag: query,
                        url: `https://picsum.photos/seed/${encodeURIComponent(query)}-${i}-${Math.floor(Math.random() * 1000)}/600/400`
                    });
                }
            } else {
                results = results.slice(0, 6);
            }
            
            setSearchResults(results);
            toast.success(`Found ${results.length} images for "${query}"`, { id: 'img-search' });
        } catch (error) {
            console.error("Search fetch failed:", error);
            const results = [];
            for (let i = 0; i < 6; i++) {
                results.push({
                    tag: query,
                    url: `https://picsum.photos/seed/${encodeURIComponent(query)}-${i}-${Math.floor(Math.random() * 1000)}/600/400`
                });
            }
            setSearchResults(results);
            toast.success(`Loaded fallback images for "${query}"`, { id: 'img-search' });
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800">Insert image</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-100 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tab Headers */}
                <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap bg-slate-50/30">
                    {['Upload', 'Webcam', 'By URL', 'Google Drive', 'Google Images'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveImageTab(tab)}
                            className={`px-5 py-3 text-xs font-bold transition-all relative ${activeImageTab === tab ? 'text-purple-650' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab}
                            {activeImageTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-650"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                    {activeImageTab === 'Upload' && (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50 min-h-[250px] text-center">
                            <Upload size={32} className="text-slate-400 mb-3" />
                            <p className="text-xs font-bold text-slate-700 mb-1">Drag and drop your image here</p>
                            <p className="text-[10px] text-slate-400 mb-4">PNG, JPG, JPEG, WEBP up to 5MB</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            onAddImage(reader.result);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-purple-655 hover:bg-purple-750 text-black rounded-xl text-xs font-bold shadow-sm transition-colors"
                            >
                                Browse Files
                            </button>
                        </div>
                    )}

                    {activeImageTab === 'Webcam' && (
                        <div className="flex flex-col items-center justify-center border border-slate-155 bg-slate-50/20 rounded-2xl p-6 min-h-[250px] text-center">
                            <div className="aspect-video w-full max-w-md bg-slate-900 rounded-xl flex items-center justify-center text-xs text-slate-400 mb-4 font-semibold relative overflow-hidden">
                                {!isWebcamOn ? (
                                    <div className="p-4 text-center text-slate-450">
                                        <Camera size={24} className="text-slate-500 mb-2 block mx-auto" />
                                        <p className="text-xs font-bold text-slate-350">Camera is turned off</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Click "Turn On Camera" below to start.</p>
                                    </div>
                                ) : cameraError ? (
                                    <div className="p-4 text-center text-slate-450">
                                        <Camera size={24} className="text-amber-500 mb-2 block mx-auto animate-pulse" />
                                        <p className="text-xs font-bold text-slate-350">{cameraError}</p>
                                    </div>
                                ) : stream ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center space-y-1">
                                        <Camera size={24} className="text-slate-550 mb-2 block mx-auto animate-pulse" />
                                        <span>Requesting camera access...</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsWebcamOn(!isWebcamOn)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 border ${
                                        isWebcamOn 
                                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                                            : 'bg-purple-650 hover:bg-purple-755 text-black border-purple-550'
                                    }`}
                                >
                                    {isWebcamOn ? 'Turn Off Camera' : 'Turn On Camera'}
                                </button>
                                <button
                                    type="button"
                                    disabled={!isWebcamOn || !stream}
                                    onClick={handleWebcamSnapshot}
                                    className="px-4 py-2 bg-red-400 hover:bg-red-500 text-black rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Take Snapshot
                                </button>
                            </div>
                        </div>
                    )}

                    {activeImageTab === 'By URL' && (
                        <div className="space-y-4 py-4 max-w-md mx-auto">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Paste image URL</label>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={imageByUrl}
                                        onChange={(e) => setImageByUrl(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 outline-none focus:bg-white focus:border-purple-500"
                                    />
                                    {imageByUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setImageByUrl('')}
                                            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Clear input"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {imageByUrl && (
                                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center relative group">
                                    <button
                                        type="button"
                                        onClick={() => setImageByUrl('')}
                                        className="absolute top-2 right-2 p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-all border border-red-100 shadow-sm"
                                        title="Clear Preview"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <img
                                        src={imageByUrl}
                                        alt="Preview URL"
                                        className="max-h-32 object-contain rounded"
                                        onError={() => toast.error("Invalid image URL preview")}
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                disabled={!imageByUrl}
                                onClick={() => {
                                    onAddImage(imageByUrl);
                                }}
                                className="w-full py-2.5 bg-purple-655 hover:bg-purple-750 text-black rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Insert Image
                            </button>
                        </div>
                    )}

                    {activeImageTab === 'Google Drive' && (
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl min-h-[250px]">
                            <FolderUp size={32} className="text-slate-400 mb-2.5" />
                            <p className="text-xs font-bold text-slate-700">Google Drive Files</p>
                            <p className="text-[10px] text-slate-400 max-w-xs mt-1">Access your Drive directories to choose shared templates or files.</p>
                            <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-md">
                                {['Quiz_Diagram_A.png', 'LMS_Architecture_v2.jpg'].map((fName, fIdx) => (
                                    <button
                                        key={fIdx}
                                        type="button"
                                        onClick={() => {
                                            onAddImage(fIdx === 0
                                                ? 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60'
                                                : 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60');
                                        }}
                                        className="p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-purple-500 transition-all flex items-center gap-2 text-xs font-semibold text-slate-655"
                                    >
                                        <ImageIcon size={14} className="text-purple-650" />
                                        <span className="truncate">{fName}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeImageTab === 'Google Images' && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={imageSearchQuery}
                                    onChange={(e) => setImageSearchQuery(e.target.value)}
                                    placeholder="Search for images..."
                                    className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white focus:border-purple-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    className="px-4 bg-purple-650 hover:bg-purple-755 text-black font-bold rounded-xl text-xs shadow-sm transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                {searchResults.map((item, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onAddImage(item.url);
                                        }}
                                        className="aspect-video rounded-xl overflow-hidden border border-slate-200 hover:border-purple-500 transition-all hover:scale-[1.02] shadow-sm relative group"
                                    >
                                        <img src={item.url} alt={item.tag} className="w-full h-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/50 p-1.5 text-[9px] text-white font-bold truncate font-sans">
                                            {item.tag} search result
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-505 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImageInsertModal;
