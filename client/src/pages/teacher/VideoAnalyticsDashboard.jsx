import React, { useState, useEffect } from 'react';
import {
    Search, ArrowLeft, Play, Info, Clock,
    BarChart3, Star, Users, CheckCircle, Calendar, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import axios from 'axios';

const VideoAnalyticsDashboard = ({ videoId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [material, setMaterial] = useState(null);
    const [records, setRecords] = useState([]);

    // Filters and search
    const [searchQuery, setSearchQuery] = useState('');
    const [completionFilter, setCompletionFilter] = useState('all');

    // Selected student detail view (Drawer)
    const [selectedRecord, setSelectedRecord] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/video-analytics/details/${videoId}`);
            setMaterial(data.material);
            setRecords(data.records || []);
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
    }, [videoId]);

    // Computed total metrics
    const totalRecords = records.length;
    const avgCompletion = totalRecords > 0
        ? Math.round(records.reduce((sum, r) => sum + (r.progress?.completionPercentage || 0), 0) / totalRecords)
        : 0;
    const avgLearningScore = totalRecords > 0
        ? Math.round(records.reduce((sum, r) => sum + (r.learningScore || 0), 0) / totalRecords)
        : 0;
    const totalSecondsWatched = records.reduce((sum, r) => sum + (r.progress?.watchedDuration || 0), 0);
    const formattedWatchTime = `${Math.floor(totalSecondsWatched / 3600)}h ${Math.floor((totalSecondsWatched % 3600) / 60)}m`;
    const avgFocus = totalRecords > 0
        ? Math.round(records.reduce((sum, r) => sum + (r.focusAnalytics?.focusPercentage || 100), 0) / totalRecords)
        : 100;

    // Filtered records for table
    const filteredRecords = records.filter(r => {
        const studentName = r.student?.name || '';
        const studentEmail = r.student?.email || '';
        const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            studentEmail.toLowerCase().includes(searchQuery.toLowerCase());

        if (completionFilter === 'completed') {
            return matchesSearch && r.progress?.isCompleted;
        }
        if (completionFilter === 'inprogress') {
            return matchesSearch && !r.progress?.isCompleted;
        }
        return matchesSearch;
    });

    // Chart data for completion brackets
    const chartData = [
        { name: '0-25%', count: records.filter(r => (r.progress?.completionPercentage || 0) <= 25).length },
        { name: '26-50%', count: records.filter(r => (r.progress?.completionPercentage || 0) > 25 && (r.progress?.completionPercentage || 0) <= 50).length },
        { name: '51-75%', count: records.filter(r => (r.progress?.completionPercentage || 0) > 50 && (r.progress?.completionPercentage || 0) <= 75).length },
        { name: '76-100%', count: records.filter(r => (r.progress?.completionPercentage || 0) > 75).length }
    ];

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
                        <h2 className="text-xl font-bold text-slate-800">Video Learning Analytics</h2>
                        {material && <p className="text-xs text-slate-400 mt-0.5">{material.title} ({material.course} - {material.subject})</p>}
                    </div>
                </div>
            </div>

            {/* Dashboard metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#3E3ADD]">
                        <Users size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total Viewers</span>
                        <p className="text-2xl font-black text-slate-800 mt-0.5">{totalRecords}</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Play size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Avg Completion</span>
                        <p className="text-2xl font-black text-emerald-600 mt-0.5">{avgCompletion}%</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                        <Star size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Avg Learning Score</span>
                        <p className="text-2xl font-black text-amber-600 mt-0.5">{avgLearningScore}/100</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Avg Focus Time</span>
                        <p className="text-2xl font-black text-purple-600 mt-0.5">{avgFocus}%</p>
                    </div>
                </div>
            </div>

            {/* Graphical Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-800 mb-4">Completion Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3E3ADD" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 3 ? '#10b981' : '#3E3ADD'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-extrabold text-slate-800 mb-4">Cumulative Watch Time</h3>
                        <div className="text-center py-6">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cumulative Watch Time</h4>
                            <p className="text-5xl font-black text-[#3E3ADD] tracking-tight">{formattedWatchTime}</p>
                            <p className="text-xs text-slate-400 mt-2">Across all student sessions registered in this cohort.</p>
                        </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <Info size={14} className="text-slate-400" /> Auto-updates dynamically from real-time events.
                    </div>
                </div>
            </div>

            {/* Table layout with filtering */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-5">
                    <h3 className="text-base font-extrabold text-slate-800">Student Progress Breakdown</h3>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by student name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                            />
                        </div>
                        <select
                            value={completionFilter}
                            onChange={(e) => setCompletionFilter(e.target.value)}
                            className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold cursor-pointer w-full md:w-44"
                        >
                            <option value="all">All Viewers</option>
                            <option value="completed">Completed (>=95%)</option>
                            <option value="inprogress">{"In Progress (<95%)"}</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="pb-3 pl-3">Student Name</th>
                                <th className="pb-3">Completion %</th>
                                <th className="pb-3">Learning Score</th>
                                <th className="pb-3">Focus Ratio</th>
                                <th className="pb-3">Last Position</th>
                                <th className="pb-3">Last Active</th>
                                <th className="pb-3 pr-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-slate-400 italic">No matching student analytics found</td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3.5 pl-3">
                                            <p className="font-bold text-slate-800 text-sm mb-0.5">{record.student?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-slate-400 font-mono mb-0">{record.student?.email || ''}</p>
                                        </td>
                                        <td className="py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-[#3E3ADD] h-full rounded-full"
                                                        style={{ width: `${record.progress?.completionPercentage || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{record.progress?.completionPercentage || 0}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                                                record.learningScore >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                record.learningScore >= 50 ? 'bg-indigo-50 text-[#3E3ADD] border-indigo-100' :
                                                'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                                {record.learningScore || 0}
                                            </span>
                                        </td>
                                        <td className="py-3.5 font-semibold text-slate-750">{record.focusAnalytics?.focusPercentage || 100}%</td>
                                        <td className="py-3.5 font-mono text-xs text-slate-600">
                                            {(() => {
                                                const val = record.progress?.lastWatchedPosition || 0;
                                                return `${Math.floor(val / 60)}m ${Math.floor(val % 60)}s`;
                                            })()}
                                        </td>
                                        <td className="py-3.5 text-xs text-slate-500 font-medium">
                                            {record.progress?.lastWatchedDate ? new Date(record.progress.lastWatchedDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="py-3.5 pr-3 text-right">
                                            <button
                                                onClick={() => setSelectedRecord(record)}
                                                className="px-3.5 py-1.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Right-side Slider Drawer */}
            {selectedRecord && (
                <div className="fixed inset-0 z-[100000] flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all"
                        onClick={() => setSelectedRecord(null)}
                    />

                    {/* Drawer Content */}
                    <div className="bg-white border-l border-slate-100 w-full max-w-2xl h-full shadow-2xl relative z-50 flex flex-col overflow-hidden animate-slide-left">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
                            <h3 className="text-base font-extrabold text-slate-800">Student Video Performance</h3>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 text-xl font-bold transition-all cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                            {/* Profile details */}
                            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                <h3 className="text-base font-black text-slate-800">{selectedRecord.student?.name}</h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedRecord.student?.email}</p>
                                <div className="border-t border-slate-100 my-4" />
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Completion %</span>
                                        <span className="text-lg font-black text-[#3E3ADD] block mt-0.5">{selectedRecord.progress?.completionPercentage}%</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Learning Score</span>
                                        <span className="text-lg font-black text-emerald-600 block mt-0.5">{selectedRecord.learningScore} / 100</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Sessions</span>
                                        <span className="text-lg font-black text-purple-600 block mt-0.5">{selectedRecord.sessions?.length || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline visualization */}
                            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                <h4 className="text-sm font-extrabold text-slate-800 mb-3">Video Timeline (5-sec Segments)</h4>
                                <div className="flex flex-wrap gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                    {(() => {
                                        const timeline = selectedRecord.watchTimeline || [];
                                        if (timeline.length === 0) {
                                            return <p className="text-xs text-slate-400 italic py-2">No timeline segments tracked.</p>;
                                        }
                                        return timeline.map((seg, idx) => {
                                            let color = 'bg-red-400'; // default: skipped
                                            if (seg.status === 'watched') {
                                                color = 'bg-emerald-500';
                                            } else if (seg.status === 'partial') {
                                                color = 'bg-amber-400';
                                            }
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`w-3.5 h-7 rounded-sm ${color} transition-all hover:scale-110 cursor-pointer`}
                                                    title={`Segment ${idx + 1}: ${seg.status === 'watched' ? `Watched (${seg.watchCount}x)` : 'Skipped'}`}
                                                />
                                            );
                                        });
                                    })()}
                                </div>
                                <div className="flex justify-start gap-4 mt-3 text-[10px] font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Watched</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /> Partial</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-400 rounded-sm" /> Skipped</span>
                                </div>
                            </div>

                            {/* Heatmap visualization */}
                            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                <h4 className="text-sm font-extrabold text-slate-800 mb-3">Video Replay Heatmap</h4>
                                <div className="flex flex-wrap gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                    {(() => {
                                        const timeline = selectedRecord.watchTimeline || [];
                                        if (timeline.length === 0) {
                                            return <p className="text-xs text-slate-400 italic py-2">No replay counts logged.</p>;
                                        }
                                        return timeline.map((seg, idx) => {
                                            const count = seg.watchCount || 0;
                                            let bgColor = 'rgba(226, 232, 240, 1)'; // 0 views
                                            if (count > 0) {
                                                const opacity = Math.min(1.0, 0.2 + (count * 0.15));
                                                bgColor = `rgba(79, 70, 229, ${opacity})`;
                                            }
                                            return (
                                                <div
                                                    key={idx}
                                                    style={{ backgroundColor: bgColor }}
                                                    className="w-3.5 h-7 rounded-sm transition-all hover:scale-110 cursor-pointer"
                                                    title={`Segment ${idx + 1}: ${count} views`}
                                                />
                                            );
                                        });
                                    })()}
                                </div>
                                <div className="flex justify-between items-center mt-3 text-[10px] font-bold text-slate-500">
                                    <span>0-1 views</span>
                                    <span>Multiple Replays</span>
                                </div>
                            </div>

                            {/* Focus & speed stats split */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Browser Focus stats */}
                                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                    <h4 className="text-sm font-extrabold text-slate-800 mb-3.5">Focus Analytics</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Focused Time:</span>
                                            <span className="font-bold text-slate-700">{selectedRecord.focusAnalytics?.focusedTime || 0}s</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Unfocused Time:</span>
                                            <span className="font-bold text-slate-700">{selectedRecord.focusAnalytics?.unfocusedTime || 0}s</span>
                                        </div>
                                        <div className="border-t border-slate-100 my-2" />
                                        <div className="flex justify-between text-xs font-bold text-slate-750">
                                            <span>Focus Percentage:</span>
                                            <span>{selectedRecord.focusAnalytics?.focusPercentage || 100}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Playback speed breakdown */}
                                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                    <h4 className="text-sm font-extrabold text-slate-800 mb-3.5">Speed Breakdown</h4>
                                    <div className="space-y-2 text-xs text-slate-500">
                                        <div className="flex justify-between">
                                            <span>1x Speed:</span>
                                            <span className="font-semibold text-slate-700">{(selectedRecord.playbackSpeedDurations?.speed_1x || 0)}s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>1.25x Speed:</span>
                                            <span className="font-semibold text-slate-700">{(selectedRecord.playbackSpeedDurations?.speed_1_25x || 0)}s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>1.5x Speed:</span>
                                            <span className="font-semibold text-slate-700">{(selectedRecord.playbackSpeedDurations?.speed_1_5x || 0)}s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>1.75x Speed:</span>
                                            <span className="font-semibold text-slate-700">{(selectedRecord.playbackSpeedDurations?.speed_1_75x || 0)}s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>2x Speed:</span>
                                            <span className="font-semibold text-slate-700">{(selectedRecord.playbackSpeedDurations?.speed_2x || 0)}s</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Skips & Replays events log */}
                            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                <h4 className="text-sm font-extrabold text-slate-800 mb-3.5">Seek Events (Skips & Replays)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Skips ({selectedRecord.skips?.length || 0})</h5>
                                        {selectedRecord.skips && selectedRecord.skips.length > 0 ? (
                                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1.5">
                                                {selectedRecord.skips.map((s, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-550 border border-slate-100">
                                                        Seek: {Math.floor(s.skipStart)}s → {Math.floor(s.skipEnd)}s (+{Math.floor(s.skippedDuration)}s)
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-350 italic">No skip events logged.</p>
                                        )}
                                    </div>
                                    <div>
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Replays ({selectedRecord.replays?.length || 0})</h5>
                                        {selectedRecord.replays && selectedRecord.replays.length > 0 ? (
                                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1.5">
                                                {selectedRecord.replays.map((r, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-550 border border-slate-100">
                                                        Rewind: {Math.floor(r.replayEnd)}s → {Math.floor(r.replayStart)}s
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-355 italic">No rewind events logged.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Session logs */}
                            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                <h4 className="text-sm font-extrabold text-slate-800 mb-3">Watch Session History</h4>
                                {selectedRecord.sessions && selectedRecord.sessions.length > 0 ? (
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1.5">
                                        {selectedRecord.sessions.map((s, idx) => (
                                            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-700">Session {idx + 1}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {new Date(s.sessionStart).toLocaleTimeString()} - {new Date(s.sessionEnd).toLocaleTimeString()} ({new Date(s.sessionStart).toLocaleDateString()})
                                                    </p>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full bg-[#3E3ADD] text-white text-[10px] font-black">
                                                    {s.sessionDuration}s
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No session logs recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes slideLeft {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-left {
                    animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default VideoAnalyticsDashboard;
