import React, { useState, useEffect } from 'react';
import {
    Search, ArrowLeft, Play, Info, Clock,
    BarChart3, Star, Users, CheckCircle, Calendar, Eye, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import axios from 'axios';

const formatDuration = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
};

const getReturnGap = (currentSession, prevSession) => {
    if (!prevSession) return null;
    const diffMs = new Date(currentSession.sessionStart) - new Date(prevSession.sessionEnd);
    if (diffMs <= 0) return null;
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
        return `${diffDays}d ${diffHours % 24}h`;
    }
    if (diffHours > 0) {
        return `${diffHours}h ${diffMins % 60}m`;
    }
    if (diffMins > 0) {
        return `${diffMins}m ${diffSecs % 60}s`;
    }
    return `${diffSecs}s`;
};

const VideoAnalyticsDashboard = ({ videoId, studentId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [material, setMaterial] = useState(null);
    const [records, setRecords] = useState([]);

    // Filters and search
    const [searchQuery, setSearchQuery] = useState('');
    const [completionFilter, setCompletionFilter] = useState('all');

    // Selected student detail view
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Active detail tab
    const [activeTab, setActiveTab] = useState('clicks'); // 'clicks' | 'attempts' | 'watchtime' | 'dropoff' | 'gaps'

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const url = studentId
                ? `/api/video-analytics/details/${videoId}?studentId=${studentId}`
                : `/api/video-analytics/details/${videoId}`;
            const { data } = await axios.get(url);
            setMaterial(data.material);
            setRecords(data.records || []);
            if (data.records && data.records.length > 0) {
                setSelectedRecord(data.records[0]);
            }
        } catch (err) {
            console.error("Failed to load video analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (videoId) {
            fetchAnalytics();
        }
    }, [videoId, studentId]);

    // Helper functions
    const getTotalClicks = (record) => {
        if (!record || !record.sessions) return 0;
        return record.sessions.reduce((sum, s) => {
            return sum + 
                (s.totalPauses || 0) + 
                (s.totalResumed || 0) + 
                (s.totalReturned || 0) + 
                (s.totalForward || 0) + 
                (s.totalRewind || 0) + 
                (s.tabSwitch || 0) + 
                (s.leftVideo || 0);
        }, 0);
    };

    const getDropOffChartData = (record) => {
        if (!record || !record.sessions) return [];
        return [...record.sessions]
            .sort((a, b) => new Date(a.sessionStart) - new Date(b.sessionStart))
            .map((s, idx) => {
                const date = new Date(s.sessionStart);
                return {
                    name: `S${idx + 1}`,
                    dateStr: date.toLocaleDateString(),
                    timeStr: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    position: Math.round(s.lastWatchedPosition || 0),
                    positionFormatted: formatDuration(s.lastWatchedPosition),
                    completion: Math.round(((s.lastWatchedPosition || 0) / (record.progress?.videoDuration || 1)) * 100)
                };
            });
    };

    const getReturnGapsList = (record) => {
        if (!record || !record.sessions || record.sessions.length < 2) return [];
        const sorted = [...record.sessions].sort((a, b) => new Date(a.sessionStart) - new Date(b.sessionStart));
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            const gapStr = getReturnGap(sorted[i], sorted[i - 1]);
            if (gapStr) {
                gaps.push({
                    fromSession: i,
                    toSession: i + 1,
                    fromTime: new Date(sorted[i - 1].sessionEnd).toLocaleString(),
                    toTime: new Date(sorted[i].sessionStart).toLocaleString(),
                    gap: gapStr
                });
            }
        }
        return gaps;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-4" />
                <p className="text-slate-500 font-semibold animate-pulse">Loading Analytics Data...</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen p-6 font-sans">
            {/* Header */}
            <div className="flex justify-between items-center bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 bg-white transition-all cursor-pointer flex items-center justify-center"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Student Video Performance Analytics</h2>
                        {material && <p className="text-xs text-slate-400 mt-0.5">{material.title} ({material.course} - {material.subject})</p>}
                    </div>
                </div>
            </div>

            {selectedRecord ? (
                <div className="space-y-6 text-left">
                    {/* The 5 custom cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        {/* 1. Total Click */}
                        <div 
                            onClick={() => setActiveTab('clicks')}
                            className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between h-40 cursor-pointer transition-all duration-200 ${
                                activeTab === 'clicks' 
                                    ? 'border-[#3E3ADD] ring-2 ring-indigo-50 bg-indigo-50/10' 
                                    : 'border-slate-100 hover:border-slate-200'
                            }`}
                        >
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Click</span>
                                <span className="text-3xl font-black text-[#3E3ADD] block mt-2">{getTotalClicks(selectedRecord)}</span>
                            </div>
                            <button
                                type="button"
                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                                    activeTab === 'clicks' ? 'bg-[#3E3ADD] text-white' : 'bg-indigo-50 text-[#3E3ADD]'
                                }`}
                            >
                                See Details
                            </button>
                        </div>

                        {/* 2. Completion Attempts Count */}
                        <div 
                            onClick={() => setActiveTab('attempts')}
                            className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between h-40 cursor-pointer transition-all duration-200 ${
                                activeTab === 'attempts' 
                                    ? 'border-emerald-500 ring-2 ring-emerald-50 bg-emerald-50/10' 
                                    : 'border-slate-100 hover:border-slate-200'
                            }`}
                        >
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Completion Attempt Count</span>
                                <span className="text-3xl font-black text-emerald-600 block mt-2">{selectedRecord.completionAttempts || 0}</span>
                            </div>
                            <button
                                type="button"
                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                                    activeTab === 'attempts' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
                                }`}
                            >
                                See Details
                            </button>
                        </div>

                        {/* 3. Total Watch Time */}
                        <div 
                            onClick={() => setActiveTab('watchtime')}
                            className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between h-40 cursor-pointer transition-all duration-200 ${
                                activeTab === 'watchtime' 
                                    ? 'border-purple-500 ring-2 ring-purple-50 bg-purple-50/10' 
                                    : 'border-slate-100 hover:border-slate-200'
                            }`}
                        >
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Watch Time</span>
                                <span className="text-2xl font-black text-purple-600 block mt-2">
                                    {formatDuration(selectedRecord.totalWatchTime || selectedRecord.sessions?.reduce((sum, s) => sum + s.sessionDuration, 0))}
                                </span>
                            </div>
                            <button
                                type="button"
                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                                    activeTab === 'watchtime' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'
                                }`}
                            >
                                See Details
                            </button>
                        </div>

                        {/* 4. Drop-off Point */}
                        <div 
                            onClick={() => setActiveTab('dropoff')}
                            className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between h-40 cursor-pointer transition-all duration-200 ${
                                activeTab === 'dropoff' 
                                    ? 'border-rose-500 ring-2 ring-rose-50 bg-rose-50/10' 
                                    : 'border-slate-100 hover:border-slate-200'
                            }`}
                        >
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Drop-off Point</span>
                                <span className="text-2xl font-black text-rose-600 block mt-2">
                                    {formatDuration(selectedRecord.progress?.lastWatchedPosition)}
                                </span>
                            </div>
                            <button
                                type="button"
                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                                    activeTab === 'dropoff' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600'
                                }`}
                            >
                                See Graph
                            </button>
                        </div>

                        {/* 5. Return Gap */}
                        <div 
                            onClick={() => setActiveTab('gaps')}
                            className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between h-40 cursor-pointer transition-all duration-200 ${
                                activeTab === 'gaps' 
                                    ? 'border-amber-500 ring-2 ring-amber-50 bg-amber-50/10' 
                                    : 'border-slate-100 hover:border-slate-200'
                            }`}
                        >
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Return Gap</span>
                                <span className="text-2xl font-black text-amber-600 block mt-2">
                                    {(() => {
                                        const gaps = getReturnGapsList(selectedRecord);
                                        return gaps.length > 0 ? gaps[gaps.length - 1].gap : 'N/A';
                                    })()}
                                </span>
                            </div>
                            <button
                                type="button"
                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                                    activeTab === 'gaps' ? 'bg-amber-600 text-white' : 'bg-amber-550/10 text-amber-600'
                                }`}
                            >
                                See Details
                            </button>
                        </div>
                    </div>

                    {/* Integrated Details Panel (Instead of Modals) */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mt-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                            <BarChart3 size={18} className="text-[#3E3ADD]" />
                            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                                {activeTab === 'clicks' && 'Total Clicks - Session Details'}
                                {activeTab === 'attempts' && 'Completion Attempt Details'}
                                {activeTab === 'watchtime' && 'Session Watch Duration Details'}
                                {activeTab === 'dropoff' && 'Drop-off Points Analysis'}
                                {activeTab === 'gaps' && 'Return Gaps Log'}
                            </h3>
                        </div>

                        <div>
                            {activeTab === 'clicks' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="pb-3 pl-3">Started Video (Time)</th>
                                                <th className="pb-3 text-center">Total Pause</th>
                                                <th className="pb-3 text-center">Total Resumed</th>
                                                <th className="pb-3 text-center">Total Returned</th>
                                                <th className="pb-3 text-center">Total Forward</th>
                                                <th className="pb-3 text-center">Total Rewind</th>
                                                <th className="pb-3 text-center">Tab Switch</th>
                                                <th className="pb-3 text-center">Left Video</th>
                                                <th className="pb-3 pr-3 text-right">Total Watch Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                                            {selectedRecord.sessions && selectedRecord.sessions.length > 0 ? (
                                                [...selectedRecord.sessions]
                                                    .sort((a, b) => new Date(a.sessionStart) - new Date(b.sessionStart))
                                                    .map((s, idx) => (
                                                        <tr key={s.sessionId || idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 pl-3">
                                                                <p className="font-bold text-slate-800">Session {idx + 1}</p>
                                                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{new Date(s.sessionStart).toLocaleString()}</p>
                                                            </td>
                                                            <td className="py-3 text-center text-slate-650 font-mono">{s.totalPauses || 0}</td>
                                                            <td className="py-3 text-center text-slate-655 font-mono">{s.totalResumed || 0}</td>
                                                            <td className="py-3 text-center text-slate-655 font-mono">{s.totalReturned || 0}</td>
                                                            <td className="py-3 text-center text-slate-655 font-mono">{s.totalForward || 0}</td>
                                                            <td className="py-3 text-center text-slate-655 font-mono">{s.totalRewind || 0}</td>
                                                            <td className="py-3 text-center text-rose-500 font-bold font-mono">{s.tabSwitch || 0}</td>
                                                            <td className="py-3 text-center text-amber-500 font-bold font-mono">{s.leftVideo || 0}</td>
                                                            <td className="py-3 pr-3 text-right text-indigo-600 font-bold">
                                                                {((s.sessionDuration || 0) / 60).toFixed(2)} mins
                                                                <span className="text-[9px] text-slate-400 font-medium block mt-0.5">({formatDuration(s.sessionDuration)})</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-6 text-slate-400 italic">No session click logs recorded.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'attempts' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="pb-3 pl-3">Attempt / Session</th>
                                                <th className="pb-3">Date</th>
                                                <th className="pb-3">Time</th>
                                                <th className="pb-3">Session Watch Time</th>
                                                <th className="pb-3 pr-3 text-right">Completion Attempts</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                                            {selectedRecord.sessions && selectedRecord.sessions.length > 0 ? (
                                                [...selectedRecord.sessions]
                                                    .sort((a, b) => new Date(a.sessionStart) - new Date(b.sessionStart))
                                                    .map((s, idx) => {
                                                        const sDate = new Date(s.sessionStart);
                                                        return (
                                                            <tr key={s.sessionId || idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-3.5 pl-3">
                                                                    <span className="px-2.5 py-0.5 bg-indigo-50 text-[#3E3ADD] rounded-lg text-[9px] font-black">
                                                                        Session {idx + 1}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3.5 text-slate-700">{sDate.toLocaleDateString()}</td>
                                                                <td className="py-3.5 text-slate-500 font-medium">{sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                                                <td className="py-3.5 text-slate-655 font-bold">{formatDuration(s.sessionDuration)}</td>
                                                                <td className="py-3.5 pr-3 text-right">
                                                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
                                                                        s.completionAttempts > 0 
                                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                                            : 'bg-slate-50 text-slate-400 border border-slate-100'
                                                                    }`}>
                                                                        {s.completionAttempts || 0} attempts
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-6 text-slate-400 italic">No completion attempt logs recorded.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'watchtime' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="pb-3 pl-3">Session</th>
                                                <th className="pb-3">Started At</th>
                                                <th className="pb-3">Ended At</th>
                                                <th className="pb-3 pr-3 text-right">Watch Time Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                                            {selectedRecord.sessions && selectedRecord.sessions.length > 0 ? (
                                                [...selectedRecord.sessions]
                                                    .sort((a, b) => new Date(a.sessionStart) - new Date(b.sessionStart))
                                                    .map((s, idx) => (
                                                        <tr key={s.sessionId || idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3.5 pl-3">
                                                                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-black">
                                                                    Session {idx + 1}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 text-slate-700">{new Date(s.sessionStart).toLocaleString()}</td>
                                                            <td className="py-3.5 text-slate-500 font-medium">{s.sessionEnd ? new Date(s.sessionEnd).toLocaleString() : 'Active/Unfinished'}</td>
                                                            <td className="py-3.5 pr-3 text-right text-purple-600 font-bold">{formatDuration(s.sessionDuration)}</td>
                                                        </tr>
                                                    ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-6 text-slate-400 italic">No watch duration logs recorded.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'dropoff' && (
                                <div className="space-y-6">
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getDropOffChartData(selectedRecord)}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" label={{ value: 'Sessions', position: 'insideBottomRight', offset: -5 }} />
                                                <YAxis label={{ value: 'Drop-off Position (Seconds)', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-xl text-xs space-y-1">
                                                                    <p className="font-extrabold text-slate-800">{data.name} ({data.dateStr})</p>
                                                                    <p className="text-slate-500 font-medium">Time: {data.timeStr}</p>
                                                                    <p className="font-black text-[#3E3ADD]">Drop-off: {data.positionFormatted}</p>
                                                                    <p className="font-bold text-rose-500">Progress: {data.completion}%</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="position" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-2.5">
                                        <Info size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-slate-600 leading-relaxed font-sans">
                                            This chart displays the drop-off position in seconds for each watch session sequentially. 
                                            A lower height indicates the student stopped early in that session, helping you analyze where the student drops off interest.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'gaps' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="pb-3 pl-3">Previous Session Exit</th>
                                                <th className="pb-3">Next Session Entry</th>
                                                <th className="pb-3 pr-3 text-right">Return Gap (Time Elapsed)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                                            {getReturnGapsList(selectedRecord).length > 0 ? (
                                                getReturnGapsList(selectedRecord).map((g, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-3.5 pl-3">
                                                            <p className="font-bold text-slate-800">Session {g.fromSession} Ended</p>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{g.fromTime}</p>
                                                        </td>
                                                        <td className="py-3.5">
                                                            <p className="font-bold text-slate-800">Session {g.toSession} Started</p>
                                                            <p className="text-[10px] text-slate-405 font-medium mt-0.5">{g.toTime}</p>
                                                        </td>
                                                        <td className="py-3.5 pr-3 text-right">
                                                            <span className="bg-amber-550/10 text-amber-600 border border-amber-250 font-black rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider">
                                                                ⏳ {g.gap}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="text-center py-8 text-slate-400 italic">
                                                        No return gaps recorded. Needs at least two sessions to compute.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                    <p className="text-slate-500 font-semibold italic">No video watch records found for this student.</p>
                </div>
            )}
        </div>
    );
};

export default VideoAnalyticsDashboard;
