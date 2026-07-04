import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    X, Calendar, CheckCircle, XCircle, FileText, Sun, QrCode,
    Edit3, Trash2, ChevronLeft, ChevronRight, User, Image as ImageIcon,
    Save, ExternalLink, Clock, BookOpen
} from 'lucide-react';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    Present: {
        label: 'Present',
        bg: 'bg-emerald-500',
        light: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        icon: CheckCircle,
    },
    Absent: {
        label: 'Absent',
        bg: 'bg-rose-500',
        light: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-700',
        icon: XCircle,
    },
    Leave: {
        label: 'Leave',
        bg: 'bg-amber-500',
        light: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: FileText,
    },
    Holiday: {
        label: 'Holiday',
        bg: 'bg-blue-500',
        light: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: Sun,
    }
};

// ─── Mini Calendar Heatmap ─────────────────────────────────────────────────────
const CalendarHeatmap = ({ history, viewMonth, onMonthChange }) => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dateMap = {};
    history.forEach(r => { if (r.date) dateMap[r.date] = r.status; });

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const monthLabel = viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    const bgMap = { Present: 'bg-emerald-500', Absent: 'bg-rose-500', Leave: 'bg-amber-500', Holiday: 'bg-blue-500' };

    return (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => onMonthChange(new Date(year, month - 1, 1))}
                    className="w-7 h-7 rounded-full hover:bg-white border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer">
                    <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold text-slate-600">{monthLabel}</span>
                <button onClick={() => onMonthChange(new Date(year, month + 1, 1))}
                    className="w-7 h-7 rounded-full hover:bg-white border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer">
                    <ChevronRight size={14} />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-[9px] font-bold text-slate-400">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {cells.map((day, idx) => {
                    if (!day) return <div key={'e' + idx} />;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const status = dateMap[dateStr];
                    return (
                        <div key={day} title={status ? `${dateStr}: ${status}` : dateStr}
                            className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold transition-all
                                ${status ? `${bgMap[status]} text-white shadow-sm` : 'text-slate-400 hover:bg-slate-200'}`}>
                            {day}
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${v.bg}`} />
                        <span className="text-[10px] text-slate-500 font-medium">{v.label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <span className="text-[10px] text-slate-500 font-medium">No record</span>
                </div>
            </div>
        </div>
    );
};

// ─── Main Modal ────────────────────────────────────────────────────────────────
const StudentAttendanceDetailModal = ({ studentId, onClose, onDataChange }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMonth, setViewMonth] = useState(new Date());
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [editingNoteFor, setEditingNoteFor] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [deletingDate, setDeletingDate] = useState(null);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const { data: res } = await axios.get(`/api/attendance/student/${studentId}/history`);
            setData(res);
        } catch {
            toast.error('Failed to load attendance history');
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const stats = data?.history ? {
        present: data.history.filter(r => r.status === 'Present').length,
        absent: data.history.filter(r => r.status === 'Absent').length,
        leave: data.history.filter(r => r.status === 'Leave').length,
        holiday: data.history.filter(r => r.status === 'Holiday').length,
    } : null;

    const handleSaveTeacherNote = async (date) => {
        try {
            setSavingNote(true);
            const record = data.history.find(r => r.date === date);
            await axios.post(`/api/users/${studentId}/physical-attendance`, {
                date,
                status: record?.status || 'Present',
                teacherNote: noteText
            });
            toast.success('Note saved');
            setEditingNoteFor(null);
            await fetchHistory();
            if (onDataChange) onDataChange();
        } catch {
            toast.error('Failed to save note');
        } finally {
            setSavingNote(false);
        }
    };

    const handleDelete = async (date) => {
        if (!window.confirm(`"${date}" ki attendance delete karna chahte hain?`)) return;
        try {
            setDeletingDate(date);
            await axios.delete(`/api/attendance/student/${studentId}/date/${date}`);
            toast.success('Attendance deleted');
            await fetchHistory();
            if (onDataChange) onDataChange();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        } finally {
            setDeletingDate(null);
        }
    };

    const handleLeaveApproval = async (date, approved) => {
        try {
            await axios.post(`/api/attendance/student/${studentId}/date/${date}/leave-approve`, { approved });
            toast.success(`Leave application ${approved ? 'approved' : 'rejected'}`);
            await fetchHistory();
            if (onDataChange) onDataChange();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update leave status');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    const isImageFile = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url || '');

    return (
        <>
            <div className="fixed inset-0 z-[9995] flex items-center justify-center" style={{ animation: 'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1) both' }}>
                <div className="bg-white w-full h-full flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
                    <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-white/30 shrink-0">
                        {data?.student?.avatar
                            ? <img src={data.student.avatar} alt="" className="w-full h-full object-cover" />
                            : <User size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-base leading-tight truncate">
                            {loading ? 'Loading...' : (data?.student?.name || 'Student')}
                        </h2>
                        {!loading && data?.student && (
                            <p className="text-white/60 text-xs font-medium mt-0.5">
                                {data.student.email}{data.student.section ? ` · Section ${data.student.section}` : ''}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-slate-400 text-sm font-medium">Loading attendance history...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">

                        {/* Stats Bar */}
                        {stats && (
                            <div className="grid grid-cols-4 border-b border-slate-100">
                                {[
                                    { label: 'Present', count: stats.present, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                                    { label: 'Absent',  count: stats.absent,  bg: 'bg-rose-50',    text: 'text-rose-700' },
                                    { label: 'Leave',   count: stats.leave,   bg: 'bg-amber-50',   text: 'text-amber-700' },
                                    { label: 'Holiday', count: stats.holiday, bg: 'bg-blue-50',    text: 'text-blue-700' },
                                ].map(s => (
                                    <div key={s.label} className={`flex flex-col items-center py-4 ${s.bg} ${s.text}`}>
                                        <span className="text-3xl font-black leading-none">{s.count}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-70">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Two-column layout: calendar left, records right */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Left — Calendar (sticky) */}
                            <div className="w-96 shrink-0 border-r border-slate-100 p-6 overflow-y-auto bg-slate-50/40 space-y-4">
                                <CalendarHeatmap history={data?.history || []} viewMonth={viewMonth} onMonthChange={setViewMonth} />

                                {/* Attendance percentage ring */}
                                {stats && stats.present + stats.absent > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Attendance Rate</p>
                                        <div className="relative w-20 h-20 mx-auto">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="transparent"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                <path className="text-emerald-500" strokeWidth="3.5"
                                                    strokeDasharray={`${Math.round((stats.present / (stats.present + stats.absent)) * 100)}, 100`}
                                                    strokeLinecap="round" stroke="currentColor" fill="transparent"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-lg font-black text-slate-800">
                                                    {Math.round((stats.present / (stats.present + stats.absent)) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 font-semibold mt-2">
                                            {stats.present} Present / {stats.present + stats.absent} Days
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Right — Records list */}
                            <div className="flex-1 overflow-y-auto p-8">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Calendar size={13} /> Date-wise Records ({data?.history?.length || 0})
                                </h3>


                                {!data?.history?.length ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm font-medium">No attendance records found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.history.map((rec) => {
                                            const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Absent;
                                            const StatusIcon = cfg.icon;
                                            const isEditing = editingNoteFor === rec.date;
                                            const isDeleting = deletingDate === rec.date;

                                            return (
                                                <div key={rec.date} className={`rounded-2xl border ${cfg.border} ${cfg.light} overflow-hidden`}>
                                                    {/* Row */}
                                                    <div className="flex items-center gap-3 px-4 py-3">
                                                        <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                                                            <StatusIcon size={14} className="text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 leading-tight">{formatDate(rec.date)}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.bg} text-white`}>{cfg.label}</span>
                                                                {rec.source === 'qr' ? (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 flex items-center gap-1">
                                                                        <QrCode size={8} /> QR Scan
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Manual</span>
                                                                )}
                                                                {rec.checkInTime && (
                                                                    <span className="text-[9px] text-slate-500 font-medium flex items-center gap-0.5">
                                                                        <Clock size={8} /> In: {formatTime(rec.checkInTime)}{rec.checkOutTime ? ` · Out: ${formatTime(rec.checkOutTime)}` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {rec.checkInPhoto && (
                                                                <button onClick={() => setSelectedPhoto(rec.checkInPhoto)} title="View Check-In selfie"
                                                                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer">
                                                                    <ImageIcon size={13} />
                                                                </button>
                                                            )}
                                                            {rec.checkOutPhoto && (
                                                                <button onClick={() => setSelectedPhoto(rec.checkOutPhoto)} title="View Check-Out selfie"
                                                                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer">
                                                                    <ImageIcon size={13} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => { setEditingNoteFor(isEditing ? null : rec.date); setNoteText(rec.teacherNote || ''); }}
                                                                title="Teacher note"
                                                                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                                                    rec.teacherNote ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                                }`}>
                                                                <Edit3 size={12} />
                                                            </button>
                                                            <button onClick={() => handleDelete(rec.date)} disabled={isDeleting} title="Delete record"
                                                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition cursor-pointer disabled:opacity-50">
                                                                {isDeleting
                                                                    ? <div className="w-3 h-3 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
                                                                    : <Trash2 size={12} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Teacher Note Editor */}
                                                    {isEditing && (
                                                        <div className="px-4 pb-3 border-t border-white/50 bg-white/60">
                                                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-2 mb-1.5">
                                                                Teacher Note (student bhi dekh sakta hai)
                                                            </p>
                                                            <textarea rows={2} value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus
                                                                placeholder="e.g. Medical leave approved, Arrived late..."
                                                                className="w-full text-xs border border-indigo-200 rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-white transition" />
                                                            <div className="flex gap-2 justify-end mt-1.5">
                                                                <button onClick={() => setEditingNoteFor(null)}
                                                                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition cursor-pointer">
                                                                    Cancel
                                                                </button>
                                                                <button onClick={() => handleSaveTeacherNote(rec.date)} disabled={savingNote}
                                                                    className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-60">
                                                                    <Save size={11} /> {savingNote ? 'Saving...' : 'Save Note'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Existing Teacher Note Display */}
                                                    {!isEditing && rec.teacherNote && (
                                                        <div className="px-4 pb-3 border-t border-white/60">
                                                            <div className="mt-2 flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100">
                                                                <BookOpen size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                                                                <div>
                                                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">Teacher Note</p>
                                                                    <p className="text-xs text-indigo-800 font-medium mt-0.5">{rec.teacherNote}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Student Leave Application */}
                                                    {(rec.leaveNote || rec.leaveFile) && (
                                                        <div className="px-4 pb-3 border-t border-white/60">
                                                            <div className="mt-2 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100 flex flex-col gap-2">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Student Leave Application</p>
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                                                        rec.leaveStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                                                        rec.leaveStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                                                        'bg-amber-100 text-amber-800 animate-pulse'
                                                                    }`}>
                                                                        {rec.leaveStatus || 'Pending'}
                                                                    </span>
                                                                </div>

                                                                {rec.leaveNote && <p className="text-xs text-amber-800 font-medium">{rec.leaveNote}</p>}
                                                                
                                                                <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
                                                                    {rec.leaveFile && (
                                                                        <a href={rec.leaveFile} target="_blank" rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-white border border-amber-200 rounded-lg px-2.5 py-1 transition hover:bg-amber-50">
                                                                            {isImageFile(rec.leaveFile)
                                                                                ? <><ImageIcon size={11} /> View Image</>
                                                                                : <><ExternalLink size={11} /> View Document</>}
                                                                        </a>
                                                                    )}

                                                                    {/* Approve/Reject Controls for Teacher */}
                                                                    {(!rec.leaveStatus || rec.leaveStatus === 'Pending') && (
                                                                        <div className="flex gap-2 ml-auto">
                                                                            <button
                                                                                onClick={() => handleLeaveApproval(rec.date, true)}
                                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleLeaveApproval(rec.date, false)}
                                                                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Selfie Photo Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-sm w-full mx-4 bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedPhoto(null)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/50 text-white flex items-center justify-center z-10 hover:bg-slate-900/70 transition cursor-pointer">
                            <X size={16} />
                        </button>
                        <div className="p-3 text-center text-xs font-bold text-slate-600 border-b border-slate-100">QR Attendance Selfie</div>
                        <img src={selectedPhoto} alt="Attendance Selfie" className="w-full aspect-square object-cover" />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: scale(0.95); opacity: 0; }
                    to   { transform: scale(1);    opacity: 1; }
                }
            `}</style>
        </>
    );
};

export default StudentAttendanceDetailModal;
