import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Drawer, Statistic, Card, Progress, Badge, Divider, Button, Tooltip } from 'antd';
import { SearchOutlined, ArrowLeftOutlined, PlayCircleOutlined, InfoCircleOutlined, FieldTimeOutlined, BarChartOutlined, StarOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
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

    const columns = [
        {
            title: 'Student Name',
            dataIndex: ['student', 'name'],
            key: 'name',
            render: (text, record) => (
                <div>
                    <p className="font-bold text-slate-800 text-sm mb-0.5">{text || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-400 font-mono mb-0">{record.student?.email || ''}</p>
                </div>
            ),
            sorter: (a, b) => (a.student?.name || '').localeCompare(b.student?.name || '')
        },
        {
            title: 'Completion %',
            dataIndex: ['progress', 'completionPercentage'],
            key: 'completion',
            render: (val) => (
                <div className="flex items-center gap-2">
                    <Progress percent={val} size="small" strokeColor="#3E3ADD" className="w-24 mb-0" />
                </div>
            ),
            sorter: (a, b) => (a.progress?.completionPercentage || 0) - (b.progress?.completionPercentage || 0)
        },
        {
            title: 'Learning Score',
            dataIndex: 'learningScore',
            key: 'learningScore',
            render: (val) => (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border uppercase tracking-wider ${
                    val >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    val >= 50 ? 'bg-indigo-50 text-[#3E3ADD] border-indigo-100' :
                    'bg-orange-50 text-orange-600 border-orange-100'
                }`}>
                    {val} / 100
                </span>
            ),
            sorter: (a, b) => (a.learningScore || 0) - (b.learningScore || 0)
        },
        {
            title: 'Focus Ratio',
            dataIndex: ['focusAnalytics', 'focusPercentage'],
            key: 'focus',
            render: (val) => <span className="font-semibold text-slate-700">{val || 100}%</span>,
            sorter: (a, b) => (a.focusAnalytics?.focusPercentage || 100) - (b.focusAnalytics?.focusPercentage || 100)
        },
        {
            title: 'Last Position',
            dataIndex: ['progress', 'lastWatchedPosition'],
            key: 'position',
            render: (val) => {
                const mins = Math.floor(val / 60);
                const secs = Math.floor(val % 60);
                return <span className="font-mono text-xs text-slate-650">{mins}m {secs}s</span>;
            }
        },
        {
            title: 'Last Active',
            dataIndex: ['progress', 'lastWatchedDate'],
            key: 'lastActive',
            render: (val) => new Date(val).toLocaleDateString(),
            sorter: (a, b) => new Date(a.progress?.lastWatchedDate) - new Date(b.progress?.lastWatchedDate)
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button 
                    type="primary" 
                    size="small" 
                    className="bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase"
                    onClick={() => setSelectedRecord(record)}
                >
                    View Details
                </Button>
            )
        }
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-4" />
                <p className="text-slate-500 font-semibold animate-pulse">Loading Analytics Data...</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen p-6 font-sans">
            {/* Header */}
            <div className="flex justify-between items-center bg-white border border-slate-100 rounded-3xl p-5 shadow-sm shrink-0 mb-6">
                <div className="flex items-center gap-3">
                    <Button 
                        icon={<ArrowLeftOutlined />} 
                        onClick={onClose} 
                        className="rounded-xl border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200" 
                    />
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Video Learning Analytics</h2>
                        {material && <p className="text-xs text-slate-400 mt-0.5">{material.title} ({material.course} - {material.subject})</p>}
                    </div>
                </div>
            </div>

            {/* Dashboard metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="rounded-3xl border-slate-100 shadow-sm">
                    <Statistic 
                        title={<span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Enrolled Viewers</span>}
                        value={totalRecords}
                        prefix={<FieldTimeOutlined className="text-[#3E3ADD]" />}
                        valueStyle={{ fontWeight: 900, color: '#1e293b' }}
                    />
                </Card>
                <Card className="rounded-3xl border-slate-100 shadow-sm">
                    <Statistic 
                        title={<span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Average Completion</span>}
                        value={avgCompletion}
                        suffix="%"
                        prefix={<PlayCircleOutlined className="text-emerald-500" />}
                        valueStyle={{ fontWeight: 900, color: '#10b981' }}
                    />
                </Card>
                <Card className="rounded-3xl border-slate-100 shadow-sm">
                    <Statistic 
                        title={<span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Average Learning Score</span>}
                        value={avgLearningScore}
                        suffix="/ 100"
                        prefix={<StarOutlined className="text-amber-500" />}
                        valueStyle={{ fontWeight: 900, color: '#f59e0b' }}
                    />
                </Card>
                <Card className="rounded-3xl border-slate-100 shadow-sm">
                    <Statistic 
                        title={<span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Average Focus Time</span>}
                        value={avgFocus}
                        suffix="%"
                        prefix={<BarChartOutlined className="text-purple-500" />}
                        valueStyle={{ fontWeight: 900, color: '#8b5cf6' }}
                    />
                </Card>
            </div>

            {/* Graphical Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card title="Completion Distribution" className="md:col-span-2 rounded-3xl border-slate-100 shadow-sm">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3E3ADD" radius={[10, 10, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 3 ? '#10b981' : '#3E3ADD'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card title="Total Cumulative Time" className="rounded-3xl border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="text-center py-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cumulative Watch Time</h4>
                        <p className="text-5xl font-black text-[#3E3ADD] tracking-tight">{formattedWatchTime}</p>
                        <p className="text-xs text-slate-400 mt-2">Across all student sessions registered in this cohort.</p>
                    </div>
                    <Divider className="my-2" />
                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <InfoCircleOutlined className="text-slate-400" /> Auto-updates dynamically from real-time events.
                    </div>
                </Card>
            </div>

            {/* Table layout with filtering */}
            <Card className="rounded-3xl border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-5">
                    <h3 className="text-base font-extrabold text-slate-800">Student Progress Breakdown</h3>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <Input
                            placeholder="Search by student name or email..."
                            prefix={<SearchOutlined className="text-slate-400" />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl h-10 w-full md:w-64"
                        />
                        <Select
                            value={completionFilter}
                            onChange={setCompletionFilter}
                            className="h-10 w-full md:w-44"
                            options={[
                                { label: 'All Viewers', value: 'all' },
                                { label: 'Completed (>=95%)', value: 'completed' },
                                { label: 'In Progress (<95%)', value: 'inprogress' }
                            ]}
                        />
                    </div>
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredRecords}
                    rowKey="_id"
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                />
            </Card>

            {/* Student details details drawer */}
            <Drawer
                title={selectedRecord ? `${selectedRecord.student?.name}'s Video Analytics` : 'Viewer Analytics'}
                placement="right"
                width={700}
                onClose={() => setSelectedRecord(null)}
                visible={!!selectedRecord}
                bodyStyle={{ backgroundColor: '#f8fafc', padding: '24px' }}
            >
                {selectedRecord && (
                    <div className="space-y-6">
                        {/* Profile header */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                            <h3 className="text-base font-black text-slate-800">{selectedRecord.student?.name}</h3>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedRecord.student?.email}</p>
                            <Divider className="my-3.5" />
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

                        {/* Interactive Timeline */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                            <h4 className="text-sm font-extrabold text-slate-800 mb-3.5">Video Timeline (5-sec Segments)</h4>
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                {(() => {
                                    const timeline = selectedRecord.watchTimeline || [];
                                    if (timeline.length === 0) {
                                        return <p className="text-xs text-slate-400 italic py-2">No timeline segments tracked.</p>;
                                    }
                                    return timeline.map((seg, idx) => {
                                        let color = 'bg-red-400'; // skipped
                                        let label = 'Skipped';
                                        if (seg.status === 'watched') {
                                            color = 'bg-emerald-500';
                                            label = `Watched (${seg.watchCount}x)`;
                                        } else if (seg.status === 'partial') {
                                            color = 'bg-amber-400';
                                            label = 'Partial';
                                        }
                                        return (
                                            <Tooltip title={`Segment ${idx + 1}: ${label}`} key={idx}>
                                                <div className={`w-4 h-8 rounded-md ${color} transition-all hover:scale-105 cursor-pointer`} />
                                            </Tooltip>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="flex justify-start gap-4 mt-3 text-[10px] font-bold text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded" /> Watched</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded" /> Partial</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-400 rounded" /> Skipped</span>
                            </div>
                        </div>

                        {/* Interactive Heatmap */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                            <h4 className="text-sm font-extrabold text-slate-800 mb-3.5">Video Replay Heatmap</h4>
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                {(() => {
                                    const timeline = selectedRecord.watchTimeline || [];
                                    if (timeline.length === 0) {
                                        return <p className="text-xs text-slate-400 italic py-2">No segment frequency logged.</p>;
                                    }
                                    return timeline.map((seg, idx) => {
                                        const count = seg.watchCount || 0;
                                        // Dynamic opacity for frequently watched parts
                                        let bgColor = 'rgba(226, 232, 240, 1)'; // 0 views (grey)
                                        if (count > 0) {
                                            const opacity = Math.min(1.0, 0.2 + (count * 0.15));
                                            bgColor = `rgba(79, 70, 229, ${opacity})`;
                                        }
                                        return (
                                            <Tooltip title={`Segment ${idx + 1}: ${count} views`} key={idx}>
                                                <div 
                                                    style={{ backgroundColor: bgColor }}
                                                    className="w-4 h-8 rounded-md transition-all hover:scale-105 cursor-pointer" 
                                                />
                                            </Tooltip>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="flex justify-between items-center mt-3 text-[10px] font-bold text-slate-500">
                                <span>Light (0-1 views)</span>
                                <span>Dark (Frequently Replayed)</span>
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
                                    <Divider className="my-2" />
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
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1.5">
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
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1.5">
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
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                                    {selectedRecord.sessions.map((s, idx) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold text-slate-700">Session {idx + 1}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(s.sessionStart).toLocaleTimeString()} - {new Date(s.sessionEnd).toLocaleTimeString()} ({new Date(s.sessionStart).toLocaleDateString()})
                                                </p>
                                            </div>
                                            <Badge 
                                                count={`${s.sessionDuration}s`} 
                                                style={{ backgroundColor: '#3E3ADD' }} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No session logs recorded.</p>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default VideoAnalyticsDashboard;
