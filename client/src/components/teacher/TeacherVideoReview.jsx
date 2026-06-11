import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Pause, Volume2, VolumeX, RotateCcw, AlertTriangle, MessageSquare, Info, ShieldAlert,
    Video, Sparkles, Send, Trash2, Clock, CheckCircle2, ChevronRight, Sliders, FileText, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const TeacherVideoReview = ({
    videoData,
    maxMarks = 10,
    initialMarks = 0,
    initialFeedback = '',
    onEvaluationChange // Callback: (marks, feedback, updatedVideoDataString)
}) => {
    // Parse videoData JSON (or handle raw URL string as fallback)
    const [parsedData, setParsedData] = useState({
        url: '',
        duration: 0,
        thumbnail: '',
        trim: { start: 0, end: 0 },
        captions: [],
        proctoring: { violations: [], tabSwitchViolations: 0, fullScreenViolations: 0 },
        aiTranscript: null,
        timestampComments: []
    });

    const [marks, setMarks] = useState(initialMarks);
    const [feedback, setFeedback] = useState(initialFeedback);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' | 'summary' | 'keypoints' | 'topics' | 'proctoring'
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

    const videoRef = useRef(null);
    const timelineRef = useRef(null);

    // Load and parse videoData
    useEffect(() => {
        if (!videoData) return;
        try {
            if (typeof videoData === 'string' && videoData.startsWith('{')) {
                const data = JSON.parse(videoData);
                // Ensure default AI transcript mock exists if not provided
                if (!data.aiTranscript) {
                    data.aiTranscript = generateMockAI(data.captions || []);
                }
                setParsedData(prev => ({ ...prev, ...data }));
            } else {
                // Raw URL fallback
                const fallbackUrl = typeof videoData === 'string' ? videoData : '';
                setParsedData(prev => ({
                    ...prev,
                    url: fallbackUrl,
                    aiTranscript: generateMockAI([])
                }));
            }
        } catch (e) {
            console.error('Error parsing videoData:', e);
            setParsedData(prev => ({
                ...prev,
                url: typeof videoData === 'string' ? videoData : '',
                aiTranscript: generateMockAI([])
            }));
        }
    }, [videoData]);

    // Handle updates to parent
    const triggerParentUpdate = (updatedComments = parsedData.timestampComments, updatedMarks = marks, updatedFeedback = feedback) => {
        if (!onEvaluationChange) return;
        const freshData = {
            ...parsedData,
            timestampComments: updatedComments
        };
        onEvaluationChange(updatedMarks, updatedFeedback, JSON.stringify(freshData));
    };

    // Video events
    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().catch(err => console.log(err));
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;
        setDuration(videoRef.current.duration || parsedData.duration || 0);
    };

    const handleSpeedChange = (speed) => {
        if (!videoRef.current) return;
        videoRef.current.playbackRate = speed;
        setPlaybackSpeed(speed);
    };

    const handleVolumeToggle = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const seekTo = (seconds) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = seconds;
        setCurrentTime(seconds);
        if (!isPlaying) {
            videoRef.current.play().catch(err => console.log(err));
            setIsPlaying(true);
        }
    };

    const handleTimelineClick = (e) => {
        if (!timelineRef.current || !videoRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const targetTime = percentage * duration;
        seekTo(targetTime);
    };

    // Format seconds to mm:ss
    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds === null) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    // Add timestamp comment
    const handleAddComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const timeString = formatTime(currentTime);
        const commentObj = {
            timeSeconds: currentTime,
            time: timeString,
            text: newComment.trim(),
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedComments = [...parsedData.timestampComments, commentObj].sort((a, b) => a.timeSeconds - b.timeSeconds);
        setParsedData(prev => ({
            ...prev,
            timestampComments: updatedComments
        }));
        setNewComment('');
        triggerParentUpdate(updatedComments, marks, feedback);
        toast.success(`Feedback pinned at ${timeString}!`);
    };

    const handleDeleteComment = (idx) => {
        const updatedComments = parsedData.timestampComments.filter((_, i) => i !== idx);
        setParsedData(prev => ({
            ...prev,
            timestampComments: updatedComments
        }));
        triggerParentUpdate(updatedComments, marks, feedback);
        toast.success("Timeline comment deleted.");
    };

    // Mock AI generator based on question/captions
    const generateMockAI = (existingCaptions = []) => {
        let transcriptText = "In this response, I explain that computer systems operate on a combination of hardware and software components. The CPU acts as the primary brain of the system, processing information retrieved from volatile random-access memory (RAM). Secondary storage devices such as solid-state drives store persistent operating system and user file data. Users interact with the computer using key input devices like keyboard and mouse, while output peripherals like monitor displays deliver processed audio-visual feedback loops.";
        
        if (existingCaptions.length > 0) {
            transcriptText = existingCaptions.map(c => c.text).join(' ');
        }

        const words = transcriptText.split(' ');
        const sentences = [];
        let curSec = 0.5;

        // Break transcript into timestamped sentences
        for (let i = 0; i < words.length; i += 10) {
            const chunk = words.slice(i, i + 10).join(' ');
            sentences.push({
                timeSeconds: curSec,
                time: formatTime(curSec),
                text: chunk
            });
            curSec += 4.5;
        }

        return {
            transcript: transcriptText,
            sentences,
            summary: "The candidate provides a highly structured explanation of computer architecture, detail-orienting the interactive feedback loops between core hardware devices (CPU, RAM, persistent SSD storage) and input/output user peripherals.",
            keyPoints: [
                "Defined CPU as primary computing execution unit",
                "Differentiated volatile primary memory (RAM) from persistent secondary storage (SSD)",
                "Identified user input devices (mouse, keyboard) and output peripherals (displays, sound)",
                "Highlighted operating system coordination roles"
            ],
            topics: ["Hardware architecture", "CPU & memory storage", "Input/output devices", "Operating systems basics"]
        };
    };

    // Handle marks/feedback parent triggers
    const handleMarksChange = (val) => {
        const score = val === '' ? 0 : Number(val);
        setMarks(score);
        triggerParentUpdate(parsedData.timestampComments, score, feedback);
    };

    const handleFeedbackChange = (val) => {
        setFeedback(val);
        triggerParentUpdate(parsedData.timestampComments, marks, val);
    };

    // Find current subtitle text overlay
    const getCurrentSubtitle = () => {
        if (!subtitlesEnabled || !parsedData.aiTranscript?.sentences) return '';
        const sentence = parsedData.aiTranscript.sentences.find((s, idx, arr) => {
            const nextTime = arr[idx + 1] ? arr[idx + 1].timeSeconds : duration || 999;
            return currentTime >= s.timeSeconds && currentTime < nextTime;
        });
        return sentence ? sentence.text : '';
    };

    const activeSubtitle = getCurrentSubtitle();

    return (
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl font-sans grid grid-cols-1 lg:grid-cols-3">
            
            {/* Left/Middle Column - Video Workspace (2/3 width) */}
            <div className="lg:col-span-2 flex flex-col border-r border-slate-800">
                {/* Visual Player container */}
                <div className="relative bg-black aspect-video flex items-center justify-center group overflow-hidden">
                    {parsedData.url ? (
                        <video
                            ref={videoRef}
                            src={parsedData.url}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onClick={handlePlayPause}
                            className="w-full h-full object-contain cursor-pointer"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                            <Video size={40} className="animate-pulse" />
                            <span className="text-xs font-bold">No student video answer loaded</span>
                        </div>
                    )}

                    {/* Captions Track Display Overlay */}
                    {activeSubtitle && (
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[85%] bg-black/85 text-amber-300 font-semibold px-4 py-2 rounded-xl text-center text-xs md:text-sm shadow-lg border border-white/5 pointer-events-none select-none z-10 transition-all">
                            {activeSubtitle}
                        </div>
                    )}

                    {/* Speed / Controls floating badge */}
                    <div className="absolute top-4 right-4 bg-black/75 px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#B282FF] select-none">
                        <Sparkles size={11} className="animate-pulse" />
                        <span>AI CAPTIONS ACTIVE</span>
                    </div>

                    {/* Violations Floating Alert (Teacher Warn indicator) */}
                    {parsedData.proctoring?.violations?.length > 0 && (
                        <div className="absolute top-4 left-4 bg-rose-600/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-950/20">
                            <ShieldAlert size={12} className="animate-bounce" />
                            <span>Security Alerts ({parsedData.proctoring.violations.length})</span>
                        </div>
                    )}
                </div>

                {/* Custom Styled Timeline Tracker */}
                <div className="bg-slate-950 px-4 py-3 space-y-2 select-none border-b border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Timeline Slider Track */}
                    <div
                        ref={timelineRef}
                        onClick={handleTimelineClick}
                        className="relative h-2 bg-slate-800 rounded-full cursor-pointer hover:h-2.5 transition-all group"
                    >
                        {/* Playhead progress */}
                        <div
                            className="absolute h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                        {/* Playhead handle */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-purple-600 shadow-md transform -translate-x-1/2 pointer-events-none hidden group-hover:block"
                            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />

                        {/* Pinned Comments Dots */}
                        {parsedData.timestampComments.map((com, cIdx) => {
                            const pct = duration ? (com.timeSeconds / duration) * 100 : 0;
                            return (
                                <div
                                    key={cIdx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        seekTo(com.timeSeconds);
                                    }}
                                    className="absolute w-2 h-2 rounded-full bg-amber-400 border border-black transform -translate-x-1/2 hover:scale-150 transition-all top-0"
                                    style={{ left: `${pct}%` }}
                                    title={`Comment at ${com.time}: ${com.text}`}
                                />
                            );
                        })}
                    </div>

                    {/* Interactive controls row */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePlayPause}
                                className="w-9 h-9 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-md"
                            >
                                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button
                                onClick={() => seekTo(0)}
                                className="w-8 h-8 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-colors"
                                title="Restart Video"
                            >
                                <RotateCcw size={12} />
                            </button>
                            <button
                                onClick={handleVolumeToggle}
                                className="w-8 h-8 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-colors"
                            >
                                {isMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} />}
                            </button>
                            
                            <div className="w-px h-5 bg-slate-800 mx-1" />

                            {/* Subtitles caption toggle */}
                            <button
                                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${subtitlesEnabled ? 'bg-[#6F42C1]/20 border-[#6F42C1] text-purple-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                            >
                                CC Subtitles
                            </button>
                        </div>

                        {/* Playback speed options */}
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => handleSpeedChange(speed)}
                                    className={`px-2 py-1 rounded transition-colors ${playbackSpeed === speed ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800 text-slate-400'}`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Features & Analytics Tabbed panels */}
                <div className="bg-slate-900 flex-1 flex flex-col min-h-[280px]">
                    <div className="flex border-b border-slate-800 bg-slate-950 p-1">
                        {[
                            { id: 'transcript', label: 'AI Transcript', icon: Sparkles },
                            { id: 'summary', label: 'AI Summary', icon: FileText },
                            { id: 'keypoints', label: 'Key points', icon: Info },
                            { id: 'topics', label: 'Topics', icon: Sliders },
                            { id: 'proctoring', label: 'Proctoring Logs', icon: ShieldAlert }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-350'}`}
                            >
                                <tab.icon size={11} />
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto max-h-[220px] text-xs leading-relaxed text-slate-300">
                        {activeTab === 'transcript' && parsedData.aiTranscript && (
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#B282FF] block mb-1">Click a sentence to seek video</span>
                                <div className="space-y-2">
                                    {parsedData.aiTranscript.sentences.map((sentence, sIdx) => {
                                        const isSentenceActive = currentTime >= sentence.timeSeconds && 
                                            (sIdx === parsedData.aiTranscript.sentences.length - 1 || currentTime < parsedData.aiTranscript.sentences[sIdx+1].timeSeconds);
                                        return (
                                            <div
                                                key={sIdx}
                                                onClick={() => seekTo(sentence.timeSeconds)}
                                                className={`flex items-start gap-2.5 p-2 rounded-lg transition-all cursor-pointer ${isSentenceActive ? 'bg-purple-950/45 border border-purple-850/50 text-white font-semibold' : 'hover:bg-slate-800/40 text-slate-400'}`}
                                            >
                                                <span className="font-mono text-[9px] bg-slate-850 px-1 py-0.5 rounded text-slate-500 mt-0.5">{sentence.time}</span>
                                                <span className="flex-1">{sentence.text}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {activeTab === 'summary' && parsedData.aiTranscript && (
                            <div className="bg-slate-850 p-4 border border-slate-805 rounded-2xl space-y-2 animate-fade-in">
                                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">AI-Generated Assessment Summary</span>
                                <p className="font-medium text-slate-300 text-sm">{parsedData.aiTranscript.summary}</p>
                            </div>
                        )}

                        {activeTab === 'keypoints' && parsedData.aiTranscript && (
                            <div className="space-y-2 animate-fade-in">
                                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-2">Primary Concepts Spoken</span>
                                <div className="grid grid-cols-1 gap-2">
                                    {parsedData.aiTranscript.keyPoints.map((pt, pIdx) => (
                                        <div key={pIdx} className="flex gap-2.5 items-start bg-slate-850 p-3 border border-slate-800 rounded-xl">
                                            <span className="p-1 bg-[#6F42C1]/10 text-purple-400 rounded-md mt-0.5"><CheckCircle2 size={12} /></span>
                                            <span className="font-bold text-slate-250">{pt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'topics' && parsedData.aiTranscript && (
                            <div className="space-y-3 animate-fade-in">
                                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Detected Assessment Topics</span>
                                <div className="flex flex-wrap gap-2">
                                    {parsedData.aiTranscript.topics.map((topic, tIdx) => (
                                        <span key={tIdx} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-indigo-300 font-bold rounded-xl text-xs border border-slate-700 transition-colors cursor-default">
                                            🏷️ {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'proctoring' && (
                            <div className="space-y-3 animate-fade-in">
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 text-center">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Tab Switches</span>
                                        <span className="text-xl font-black text-amber-500 block mt-1">{parsedData.proctoring?.tabSwitchViolations || 0}</span>
                                    </div>
                                    <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 text-center">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase block">FullScreen Exits</span>
                                        <span className="text-xl font-black text-rose-500 block mt-1">{parsedData.proctoring?.fullScreenViolations || 0}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                                    {parsedData.proctoring?.violations?.length === 0 ? (
                                        <div className="py-6 text-center text-slate-500 font-semibold">
                                            ✅ Zero proctoring warnings logged for this recording.
                                        </div>
                                    ) : (
                                        parsedData.proctoring.violations.map((v, vIdx) => (
                                            <div key={vIdx} className="flex gap-2 items-center bg-rose-950/25 border border-rose-900/30 text-rose-350 p-2.5 rounded-lg text-[10px]">
                                                <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                                                <span className="font-bold flex-1">{v}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column - Review / Grading workspace (1/3 width) */}
            <div className="flex flex-col h-full bg-slate-950 p-5 space-y-6">
                
                {/* 1. Timeline Comments Section */}
                <div className="flex flex-col flex-1 h-[280px]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Timeline Feedback</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-[9px] text-slate-300 rounded-md font-bold">{parsedData.timestampComments.length} Comments</span>
                    </div>

                    {/* Comments list */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[240px]">
                        {parsedData.timestampComments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 gap-1.5 p-4">
                                <MessageSquare size={24} className="text-slate-700" />
                                <p className="text-[10px] font-bold">No timestamped feedback pinned yet.</p>
                                <p className="text-[9px] text-slate-500 max-w-[140px] leading-relaxed">Play the video and type comments below to pin notes.</p>
                            </div>
                        ) : (
                            parsedData.timestampComments.map((com, idx) => (
                                <div key={idx} className="flex gap-2 items-start bg-slate-900 border border-slate-805 p-3 rounded-2xl text-[11px] animate-fade-in group">
                                    <button
                                        onClick={() => seekTo(com.timeSeconds)}
                                        className="px-2 py-0.5 bg-[#6F42C1]/15 hover:bg-[#6F42C1]/30 text-purple-400 font-mono font-black rounded-lg text-[9px] transition-colors"
                                    >
                                        {com.time}
                                    </button>
                                    <div className="flex-1 text-slate-300 font-medium leading-relaxed">
                                        {com.text}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteComment(idx)}
                                        className="text-slate-600 hover:text-rose-450 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Feedback"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Comment Input Form */}
                    <form onSubmit={handleAddComment} className="mt-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl flex gap-1.5 shadow-inner">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={`Pin feedback at ${formatTime(currentTime)}...`}
                            className="flex-1 text-xs border-none bg-transparent rounded-lg px-2 py-1 outline-none text-white placeholder-slate-600 font-medium"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="px-3 py-1.5 bg-[#6F42C1] hover:bg-[#5a32a3] text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-purple-500/10 disabled:opacity-40"
                        >
                            <Send size={11} />
                        </button>
                    </form>
                </div>

                <div className="h-px bg-slate-850" />

                {/* 2. Grading & Feedback Notes */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Evaluation Grades</span>
                        <span className="text-[9px] bg-slate-800 text-slate-350 px-2 py-0.5 rounded-md font-bold">Auto-saves to database</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1 space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Marks</label>
                            <input
                                type="number"
                                min={0}
                                max={maxMarks}
                                value={marks}
                                onChange={(e) => handleMarksChange(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-black text-sm outline-none focus:border-purple-500 shadow-inner text-center"
                            />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Feedback Notes</label>
                            <input
                                type="text"
                                value={feedback}
                                onChange={(e) => handleFeedbackChange(e.target.value)}
                                placeholder="Good verbal pacing..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-semibold text-xs outline-none focus:border-purple-500 shadow-inner"
                            />
                        </div>
                    </div>
                </div>

            </div>
            
            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.25s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default TeacherVideoReview;
