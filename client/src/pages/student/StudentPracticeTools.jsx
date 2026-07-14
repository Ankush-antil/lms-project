import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
    Calendar, Camera, Video, Mic, MonitorPlay, Phone, Settings, 
    ChevronRight, AlertCircle, Info, Lock, Unlock, Clock, FolderOpen, Upload, FileText, Menu
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const StudentPracticeTools = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Parse active date from URL query parameter if present
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');

    const [selectedDate, setSelectedDate] = useState('');
    const [isDateSidebarOpen, setIsDateSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Storage lists
    const [cloudFiles, setCloudFiles] = useState([]);
    const [localFiles, setLocalFiles] = useState([]);
    const [notesList, setNotesList] = useState([]);
    const [datesList, setDatesList] = useState([]);

    // Fetch and sync dates
    const loadAllPracticeData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Cloud Files and Notes
            const [cloudRes, notesRes] = await Promise.all([
                axios.get('/api/practice-files'),
                axios.get('/api/notes').catch(() => ({ data: [] }))
            ]);
            const cFiles = (cloudRes.data.files || []).filter(f => !f.inbox);
            setCloudFiles(cFiles);
            setNotesList((notesRes.data || []).filter(n => !n.inboxId));

            // 2. Fetch Local Files from LocalStorage
            const allLocal = [];

            // Screenshots
            const screenshotsStr = localStorage.getItem('practice_screenshots');
            if (screenshotsStr) {
                try {
                    const list = JSON.parse(screenshotsStr);
                    list.forEach(item => {
                        if (!item.inbox) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Screenshot Tool',
                                parsedDate: parseDateToDdMmYyyy(item.timestamp)
                            });
                        }
                    });
                } catch(e) {}
            }

            // Screen Recordings
            const screenStr = localStorage.getItem('practice_screen_recordings');
            if (screenStr) {
                try {
                    const list = JSON.parse(screenStr);
                    list.forEach(item => {
                        if (!item.inbox) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Screen Recorder',
                                parsedDate: parseDateToDdMmYyyy(item.timestamp)
                            });
                        }
                    });
                } catch(e) {}
            }

            // Videos
            const videoStr = localStorage.getItem('practice_videos');
            if (videoStr) {
                try {
                    const list = JSON.parse(videoStr);
                    list.forEach(item => {
                        if (!item.inbox) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Video Recorder',
                                parsedDate: parseDateToDdMmYyyy(item.timestamp)
                            });
                        }
                    });
                } catch(e) {}
            }

            // Audios
            const audioStr = localStorage.getItem('practice_audios');
            if (audioStr) {
                try {
                    const list = JSON.parse(audioStr);
                    list.forEach(item => {
                        if (!item.inbox) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Voice Recorder',
                                parsedDate: parseDateToDdMmYyyy(item.timestamp)
                            });
                        }
                    });
                } catch(e) {}
            }

            // Call Logs
            const logsStr = localStorage.getItem('practice_call_logs');
            if (logsStr) {
                try {
                    const list = JSON.parse(logsStr);
                    list.forEach(item => {
                        if (!item.inbox) {
                            allLocal.push({
                                timestamp: item.date,
                                toolType: 'Web-Calling Tool',
                                parsedDate: parseDateToDdMmYyyy(item.date)
                            });
                        }
                    });
                } catch(e) {}
            }

            // File Uploads
            const fileUploadsStr = localStorage.getItem('practice_file_uploads');
            if (fileUploadsStr) {
                try {
                    const list = JSON.parse(fileUploadsStr);
                    list.forEach(item => {
                        if (!item.inbox) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'File Uploader',
                                parsedDate: parseDateToDdMmYyyy(item.timestamp)
                            });
                        }
                    });
                } catch(e) {}
            }

            setLocalFiles(allLocal);

            // 3. Extract and Aggregate Dates
            const today = getTodayDdMmYyyy();
            const datesMap = {};
            datesMap[today] = true; // Always guarantee today is in the set

            cFiles.forEach(f => {
                const parsed = parseDateToDdMmYyyy(f.createdAt);
                if (parsed !== 'Unknown Date') datesMap[parsed] = true;
            });

            allLocal.forEach(f => {
                if (f.parsedDate !== 'Unknown Date') datesMap[f.parsedDate] = true;
            });

            notesList.forEach(n => {
                const parsed = parseDateToDdMmYyyy(n.createdAt);
                if (parsed !== 'Unknown Date') datesMap[parsed] = true;
            });

            // Sort dates descending
            const sortedDates = Object.keys(datesMap).sort((a, b) => {
                const aParts = a.split('-');
                const bParts = b.split('-');
                const aTime = new Date(`${aParts[2]}-${aParts[1]}-${aParts[0]}`).getTime();
                const bTime = new Date(`${bParts[2]}-${bParts[1]}-${bParts[0]}`).getTime();
                return bTime - aTime;
            });

            setDatesList(sortedDates);

            // Initialize active selection
            if (dateParam && datesMap[dateParam]) {
                setSelectedDate(dateParam);
            } else {
                setSelectedDate(today);
            }

        } catch (err) {
            console.error("Failed to load practice files dates", err);
            toast.error("Failed to load your practice activities.");
            // Guarantee at least Today is selected
            const today = getTodayDdMmYyyy();
            setDatesList([today]);
            setSelectedDate(today);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllPracticeData();
    }, [dateParam]);

    const isTodaySelected = useMemo(() => {
        return selectedDate === getTodayDdMmYyyy();
    }, [selectedDate]);

    // Count utility for tools on the active selected date
    const getFileCountForTool = (toolTitle) => {
        if (toolTitle === 'Notes Writing') {
            return notesList.filter(n => parseDateToDdMmYyyy(n.createdAt) === selectedDate).length;
        }

        const dbTypeMap = {
            'Screenshot Tool': 'screenshot',
            'Screen Recorder': 'screen-recorder',
            'Voice Recorder': 'voice-recorder',
            'Video Recorder': 'video-recorder',
            'Web-Calling Tool': 'web-calling',
            'File Uploader': 'file-uploader'
        };

        const localCount = localFiles.filter(f => f.parsedDate === selectedDate && f.toolType === toolTitle).length;

        const dbType = dbTypeMap[toolTitle];
        const cloudCount = cloudFiles.filter(c => {
            const fileDate = parseDateToDdMmYyyy(c.createdAt);
            return fileDate === selectedDate && c.toolType === dbType;
        }).length;

        return localCount + cloudCount;
    };

    const handleSelectDate = (date) => {
        setSelectedDate(date);
        setIsDateSidebarOpen(false);
        // Sync query parameter
        navigate(`/student/practice-tools?date=${date}`, { replace: true });
    };

    const getToolControl = (toolTitle) => {
        if (!user || !user.studentProfile?.controls?.tools) return { enabled: true, mode: 'hide' };

        const toolsCtrl = user.studentProfile.controls.tools;
        if (toolsCtrl.enabled === false) {
            return { enabled: false, mode: toolsCtrl.mode, note: toolsCtrl.note };
        }

        let key = '';
        if (toolTitle === "Voice Recorder") key = 'voiceRecorder';
        else if (toolTitle === "Video Recorder") key = 'videoRecorder';
        else if (toolTitle === "File Uploader") key = 'fileUploader';
        else if (toolTitle === "Notes Writing") key = 'notesWriting';
        else if (toolTitle === "Screenshot Tool") key = 'screenshotTool';
        else if (toolTitle === "Screen Recorder") key = 'screenRecorder';
        else if (toolTitle === "Web-Calling Tool") key = 'webCalling';

        const isEnabled = toolsCtrl[key] !== false;
        const note = toolsCtrl.subNotes?.[key] || toolsCtrl.note;
        return { enabled: isEnabled, mode: toolsCtrl.mode, note: note };
    };

    const handleLaunchTool = (path) => {
        navigate(`${path}?date=${selectedDate}`);
    };

    const practiceToolsConfig = [
        {
            title: "Voice Recorder",
            icon: Mic,
            color: "text-blue-600 bg-blue-50 border-blue-150 hover:border-blue-300",
            path: "/student/practice-tools/voice-recorder"
        },
        {
            title: "Video Recorder",
            icon: MonitorPlay,
            color: "text-purple-600 bg-purple-50 border-purple-150 hover:border-purple-300",
            path: "/student/practice-tools/video-recorder"
        },
        {
            title: "File Uploader",
            icon: Upload,
            color: "text-amber-600 bg-amber-50 border-amber-150 hover:border-amber-300",
            path: "/student/practice-tools/file-uploader"
        },
        {
            title: "Screenshot Tool",
            icon: Camera,
            color: "text-indigo-600 bg-indigo-50 border-indigo-150 hover:border-indigo-300",
            path: "/student/practice-tools/screenshot"
        },
        {
            title: "Screen Recorder",
            icon: Video,
            color: "text-emerald-600 bg-emerald-50 border-emerald-150 hover:border-emerald-300",
            path: "/student/practice-tools/screen-recorder"
        },
        {
            title: "Web-Calling Tool",
            icon: Phone,
            color: "text-pink-600 bg-pink-50 border-pink-150 hover:border-pink-300",
            path: "/student/practice-tools/web-calling"
        }
    ];

    const toolsCtrl = user?.studentProfile?.controls?.tools;
    const isToolsDisabled = toolsCtrl?.enabled === false;

    if (isToolsDisabled && toolsCtrl?.mode === 'hide') {
        return (
            <DashboardLayout role="Student" fullWidth={true}>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                        <Lock size={28} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Feature Restricted</h2>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Workspace tools have been disabled by your administrator.
                    </p>
                    {toolsCtrl?.note && (
                        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-2 font-bold max-w-sm">
                            Reason: {toolsCtrl.note}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className={`flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden font-sans relative ${isToolsDisabled ? 'opacity-60 pointer-events-none select-none' : ''}`}>
                {isToolsDisabled && (
                    <div 
                        title={toolsCtrl?.note || 'Workspace Tools are Disabled'}
                        className="absolute inset-0 bg-slate-50/10 backdrop-blur-[0.5px] z-50 flex items-center justify-center pointer-events-auto cursor-not-allowed"
                    >
                        <div className="bg-[#0b1329] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-800 animate-slide-up">
                            <Lock size={16} className="text-amber-500" />
                            <span className="text-xs font-bold">Workspace Tools are Disabled{toolsCtrl?.note ? ` - ${toolsCtrl.note}` : ''}</span>
                        </div>
                    </div>
                )}
                
                {/* Left Date Sidebar backdrop */}
                {isDateSidebarOpen && (
                    <div 
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
                        onClick={() => setIsDateSidebarOpen(false)}
                    />
                )}

                {/* ── LEFT DATE SIDEBAR ───────────────────────────────── */}
                <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 flex flex-col bg-white shrink-0 overflow-hidden text-left transition-transform duration-300 lg:static lg:translate-x-0 ${isDateSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-6 border-b border-slate-150 shrink-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Clock className="text-slate-700" size={18} />
                            <h2 className="font-extrabold text-slate-800 text-[15px] leading-tight">Practice Log Dates</h2>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Select workspace date</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/10">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-2xl" />)}
                            </div>
                        ) : datesList.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-semibold">No dates registered.</div>
                        ) : (
                            datesList.map(date => {
                                const isActive = selectedDate === date;
                                const isToday = date === getTodayDdMmYyyy();

                                return (
                                    <div
                                        key={date}
                                        onClick={() => handleSelectDate(date)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                                            ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 shadow-sm ring-1 ring-[#3E3ADD]/10'
                                            : 'border-slate-100 bg-white hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-[#3E3ADD] text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                <Calendar size={14} />
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-xs ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                    {date}
                                                </h3>
                                                <p className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                                                    {isToday ? 'Today\'s Workspace' : 'Past Workspace'}
                                                </p>
                                            </div>
                                        </div>
                                        {isToday && (
                                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-md uppercase tracking-wider shadow-sm">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* ── MAIN WORKSPACE CONTENT ───────────────────────────── */}
                <main className="flex-1 flex flex-col bg-white overflow-hidden text-left">
                    
                    {/* Header bar */}
                    <div className="bg-white border-b border-slate-200 p-6 flex flex-col gap-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDateSidebarOpen(true)}
                                    className="lg:hidden p-2 bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 rounded-xl transition-all shrink-0 cursor-pointer"
                                    title="Open Date List"
                                >
                                    <Menu size={18} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-[#3E3ADD] text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                    <Settings size={18} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-extrabold text-indigo-955 tracking-tight leading-none">
                                        Workspace: {selectedDate}
                                    </h1>
                                </div>
                            </div>
                            
                            {/* Interactive status badge */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                                isTodaySelected 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                                {isTodaySelected ? (
                                    <>
                                        <Unlock size={12} />
                                        <span>Interactive Workspace</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={12} />
                                        <span>Preview Workspace Only</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Interactive Warning Banner */}
                        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 mt-2 text-xs leading-relaxed ${
                            isTodaySelected 
                                ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900' 
                                : 'bg-amber-50/70 border-amber-100 text-amber-900'
                        }`}>
                            {isTodaySelected ? (
                                <>
                                    <Info className="text-[#3E3ADD] shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <p className="font-bold">Active Practice Environment</p>
                                        <p className="text-slate-500 text-[11px] font-medium mt-0.5">You can record new audio/video/screen clips, snap screenshots, and perform file deletions. Synchronizing and Google Drive integration are fully active.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <p className="font-bold">Previous Workspace Archive (Read-Only)</p>
                                        <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are previewing logs and recordings created on this date. Recording buttons, file saving, uploads, and deletions are disabled for this archive.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tools Grid */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {practiceToolsConfig
                                .map(tool => {
                                    const ctrl = getToolControl(tool.title);
                                    return { ...tool, ctrl };
                                })
                                .filter(tool => {
                                    return !(tool.ctrl.enabled === false && tool.ctrl.mode === 'hide');
                                })
                                .map((tool, idx) => {
                                    const ToolIcon = tool.icon;
                                    const fileCount = getFileCountForTool(tool.title);
                                    const isDisabled = tool.ctrl.enabled === false && tool.ctrl.mode === 'disable';

                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => {
                                                if (isDisabled) {
                                                    toast.error(tool.ctrl.note || `${tool.title} has been disabled by your administrator.`);
                                                    return;
                                                }
                                                handleLaunchTool(tool.path);
                                            }}
                                            title={isDisabled && tool.ctrl.note ? tool.ctrl.note : undefined}
                                            className={`bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex items-center justify-between group hover:-translate-y-0.5 duration-200 cursor-pointer h-20 
                                                ${isDisabled ? 'opacity-40 cursor-not-allowed hover:-translate-y-0' : ''}`}
                                        >
                                            {/* Left Side: Icon */}
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${tool.color.split(' hover:')[0]} group-hover:scale-105 transition-all duration-200 shrink-0`}>
                                                <ToolIcon size={18} />
                                            </div>
                                            
                                            {/* Right Side: Files Count and Tool Title */}
                                            <div className="flex flex-col items-end gap-1.5 text-right min-w-0">
                                                <div className="flex items-center gap-1">
                                                    {isDisabled && <Lock size={11} className="text-slate-400 shrink-0" />}
                                                    <span className={`px-2 py-0.5 rounded-md font-black text-[8px] uppercase tracking-wider ${
                                                        fileCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                        {fileCount} {fileCount === 1 ? 'file' : 'files'}
                                                    </span>
                                                </div>
                                                <h3 className="font-extrabold text-slate-850 text-[11px] tracking-tight leading-tight truncate max-w-full">{tool.title}</h3>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 4px; }
            `}</style>
        </DashboardLayout>
    );
};

export default StudentPracticeTools;
