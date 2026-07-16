import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    X, Check, Calendar, CheckCircle, XCircle, FileText, Sun,
    Edit3, Trash2, ChevronLeft, ChevronRight, User, Image as ImageIcon,
    Save, ExternalLink, Clock
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
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-sm">
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
const StaffAttendanceDetailModal = ({ staffId, onClose, onDataChange }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMonth, setViewMonth] = useState(new Date());
    const [editingNoteFor, setEditingNoteFor] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [deletingDate, setDeletingDate] = useState(null);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const { data: res } = await axios.get(`/api/attendance/staff/${staffId}/history`);
            setData(res);
        } catch {
            toast.error('Failed to load attendance history');
        } finally {
            setLoading(false);
        }
    }, [staffId]);

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
            await axios.post(`/api/users/${staffId}/physical-attendance`, {
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
            await axios.delete(`/api/attendance/staff/${staffId}/date/${date}`);
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
            await axios.post(`/api/attendance/staff/${staffId}/date/${date}/leave-approve`, { approved });
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

    return (
        <>
            <div className="fixed inset-0 z-[9995] flex items-center justify-center" style={{ animation: 'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1) both' }}>
                <div className="bg-white w-full h-full flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
                    <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-white/30 shrink-0">
                        {data?.staff?.avatar
                            ? <img src={data.staff.avatar} alt="" className="w-full h-full object-cover" />
                            : <User size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-base leading-tight truncate">
                            {loading ? 'Loading...' : (data?.staff?.name || 'Staff Member')}
                        </h2>
                        <p className="text-slate-400 text-xs font-bold truncate mt-0.5">
                            {loading ? 'Fetching records...' : `${data?.staff?.designation || 'Staff'} • ${data?.staff?.department || 'LMS'}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition text-white/80 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center flex-col gap-3 text-slate-400">
                            <div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-black">Loading attendance archive...</span>
                        </div>
                    ) : (
                        <div className="max-w-4.5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* Left panel: Heatmap calendar, metrics */}
                            <div className="lg:col-span-4 space-y-6">
                                <CalendarHeatmap history={data?.history || []} viewMonth={viewMonth} onMonthChange={setViewMonth} />

                                {/* Mini Statistics */}
                                {stats && (
                                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3.5">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Attendance Breakdown</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-emerald-50/55 rounded-xl p-3 border border-emerald-100/60">
                                                <span className="text-[10px] font-bold text-emerald-600 block">Present Days</span>
                                                <span className="text-lg font-black text-emerald-700 leading-none mt-1 block">{stats.present}</span>
                                            </div>
                                            <div className="bg-rose-50/55 rounded-xl p-3 border border-rose-100/60">
                                                <span className="text-[10px] font-bold text-rose-600 block">Absent Days</span>
                                                <span className="text-lg font-black text-rose-700 leading-none mt-1 block">{stats.absent}</span>
                                            </div>
                                            <div className="bg-amber-50/55 rounded-xl p-3 border border-amber-100/60">
                                                <span className="text-[10px] font-bold text-amber-600 block">On Leave</span>
                                                <span className="text-lg font-black text-amber-700 leading-none mt-1 block">{stats.leave}</span>
                                            </div>
                                            <div className="bg-blue-50/55 rounded-xl p-3 border border-blue-100/60">
                                                <span className="text-[10px] font-bold text-blue-600 block">Holidays</span>
                                                <span className="text-lg font-black text-blue-700 leading-none mt-1 block">{stats.holiday}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right panel: Timeline of records */}
                            <div className="lg:col-span-8 space-y-4">
                                <h3 className="font-black text-sm text-slate-700 px-1 flex items-center gap-2">
                                    <Clock size={16} className="text-slate-450" />
                                    Detailed Logs
                                </h3>

                                <div className="space-y-3">
                                    {(!data?.history || data.history.length === 0) ? (
                                        <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-10 text-center text-slate-400">
                                            <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-xs font-bold">No physical attendance logs recorded yet.</p>
                                        </div>
                                    ) : data.history.map(rec => {
                                        const config = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Absent;
                                        const StatusIcon = config.icon;
                                        const isLeavePending = rec.status === 'Leave' && rec.leaveStatus === 'Pending';
                                        const isEditingNote = editingNoteFor === rec.date;

                                        return (
                                            <div key={rec.date} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                                                {/* Meta Info */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full ${config.light} flex items-center justify-center ${config.text}`}>
                                                            <StatusIcon size={16} />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-black text-slate-800 block">{formatDate(rec.date)}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.light} ${config.text}`}>
                                                                    {config.label}
                                                                </span>
                                                                {rec.source && (
                                                                    <span className="text-[9px] font-semibold text-slate-400 capitalize">
                                                                        via {rec.source}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setEditingNoteFor(isEditingNote ? null : rec.date);
                                                                setNoteText(rec.teacherNote || '');
                                                            }}
                                                            title="Edit Note"
                                                            className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer border border-transparent hover:border-slate-200"
                                                        >
                                                            <Edit3 size={13} />
                                                        </button>
                                                        <button
                                                            disabled={deletingDate === rec.date}
                                                            onClick={() => handleDelete(rec.date)}
                                                            title="Delete Log"
                                                            className="w-7 h-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-rose-450 hover:text-rose-600 transition cursor-pointer border border-transparent hover:border-rose-100"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Time logs (checkin/out) */}
                                                {(rec.checkInTime || rec.checkOutTime) && (
                                                    <div className="grid grid-cols-2 gap-4 bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-xs">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Check In</span>
                                                            <span className="font-extrabold text-slate-700 mt-1 block">{formatTime(rec.checkInTime)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Check Out</span>
                                                            <span className="font-extrabold text-slate-700 mt-1 block">{formatTime(rec.checkOutTime)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Notes section */}
                                                {(!isEditingNote && rec.teacherNote) && (
                                                    <div className="bg-slate-50/40 rounded-xl p-3 border border-slate-100 text-xs">
                                                        <span className="font-black text-slate-600">Note:</span>
                                                        <p className="text-slate-500 font-medium mt-1">{rec.teacherNote}</p>
                                                    </div>
                                                )}

                                                {/* Note editing mode */}
                                                {isEditingNote && (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={noteText}
                                                            onChange={e => setNoteText(e.target.value)}
                                                            placeholder="Add internal note for staff attendance..."
                                                            className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-650 min-h-[60px]"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setEditingNoteFor(null)} className="px-3 py-1.5 text-[10px] font-bold text-slate-550 hover:bg-slate-100 rounded-lg cursor-pointer">
                                                                Cancel
                                                            </button>
                                                            <button
                                                                disabled={savingNote}
                                                                onClick={() => handleSaveTeacherNote(rec.date)}
                                                                className="px-3 py-1.5 text-[10px] font-black text-white bg-indigo-650 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-100 flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Save size={11} /> Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Leave request handling */}
                                                {rec.status === 'Leave' && (rec.leaveNote || rec.leaveFile) && (
                                                    <div className="bg-white border-l-4 border-amber-500 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-1.5">
                                                                <FileText size={12} className="text-amber-600" />
                                                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Leave Application Details</span>
                                                            </div>
                                                            {!isLeavePending && rec.leaveStatus && (
                                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                                                                    rec.leaveStatus === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                                    'bg-rose-50 border-rose-200 text-rose-700'
                                                                }`}>
                                                                    {rec.leaveStatus === 'Approved' ? <span className="flex items-center gap-1"><CheckCircle size={10} /> Approved</span> : <span className="flex items-center gap-1"><XCircle size={10} /> Rejected</span>}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {rec.leaveNote && (
                                                            <div className="bg-slate-50/65 rounded-xl p-3 border border-slate-100/80">
                                                                <p className="text-xs font-bold text-slate-700 leading-relaxed">{rec.leaveNote}</p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                                            {rec.leaveFile ? (
                                                                <a href={rec.leaveFile} target="_blank" rel="noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-700 hover:text-amber-900 bg-amber-50/40 border border-amber-200 rounded-xl px-3 py-1.8 transition hover:bg-amber-50 shadow-sm">
                                                                    <ExternalLink size={11} /> View Document
                                                                </a>
                                                            ) : (
                                                                <div />
                                                            )}

                                                            {/* Approval Buttons */}
                                                            {isLeavePending && (
                                                                <div className="flex gap-2 ml-auto">
                                                                    <button onClick={() => handleLeaveApproval(rec.date, false)}
                                                                        className="flex items-center gap-1 px-3.5 py-1.8 text-xs font-black bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-xl transition cursor-pointer shadow-sm">
                                                                        <X size={11} /> Reject
                                                                    </button>
                                                                    <button onClick={() => handleLeaveApproval(rec.date, true)}
                                                                        className="flex items-center gap-1 px-3.5 py-1.8 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-100 transition cursor-pointer">
                                                                        <Check size={11} /> Approve
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default StaffAttendanceDetailModal;
