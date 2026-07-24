import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
const StaffAttendanceDetailModal = ({ staffId, onClose, onDataChange }) => {
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

    return createPortal(
        <>
            <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fade-in" onClick={onClose}>
                <div className="bg-[#f5f5f5] w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden rounded-3xl shadow-2xl border border-slate-200/80" onClick={e => e.stopPropagation()}>

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
                        {!loading && data?.staff && (
                            <p className="text-white/60 text-xs font-medium mt-0.5">
                                {data.staff.email}{data.staff.designation ? ` · ${data.staff.designation}` : data.staff.department ? ` · ${data.staff.department}` : ''}
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
                                    <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-sm">
                                        <table className="w-full min-w-[1100px] border-collapse text-xs text-left">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-left bg-slate-50/50">
                                                    <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                                                    <th className="py-3.5 px-4 whitespace-nowrap">Mode</th>
                                                    <th className="py-3.5 px-4 whitespace-nowrap">Marked By</th>
                                                    <th className="py-3.5 px-4 whitespace-nowrap">Student Note</th>
                                                    <th className="py-3.5 px-4 whitespace-nowrap">Teacher Note</th>
                                                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Check-In</th>
                                                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Check-Out</th>
                                                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Time Spent</th>
                                                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Selfies</th>
                                                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                                                    <th className="py-3.5 px-4 text-center whitespace-nowrap w-24">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                {data.history.map((rec, idx) => {
                                                    const status = rec.status || 'Absent';
                                                    let badgeClass = 'text-rose-700 bg-rose-50 border-rose-100';
                                                    if (status === 'Present') badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                                                    else if (status === 'Leave') badgeClass = 'text-amber-700 bg-amber-50 border-amber-100';
                                                    else if (status === 'Holiday') badgeClass = 'text-blue-700 bg-blue-50 border-blue-100';
                                                    else if (status === 'In') badgeClass = 'text-indigo-700 bg-indigo-50 border-indigo-100';

                                                    const checkInVal = rec.checkInTime;
                                                    const checkOutVal = rec.checkOutTime;
                                                    let timeSpentStr = '—';
                                                    if (checkInVal && checkOutVal) {
                                                        const durationMs = new Date(checkOutVal) - new Date(checkInVal);
                                                        if (durationMs > 0) {
                                                            const totalMins = Math.floor(durationMs / 60000);
                                                            const h = Math.floor(totalMins / 60);
                                                            const m = totalMins % 60;
                                                            timeSpentStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                                                        }
                                                    }

                                                    const isEditing = editingNoteFor === rec.date;
                                                    const isDeleting = deletingDate === rec.date;

                                                    return (
                                                        <>
                                                            <tr key={rec.date || idx} className="hover:bg-slate-50/30 transition-colors">
                                                                <td className="py-4 px-4 text-slate-800 whitespace-nowrap font-bold">
                                                                    {formatDate(rec.date)}
                                                                </td>
                                                                <td className="py-4 px-4 whitespace-nowrap">
                                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-black text-slate-550">
                                                                        {rec.source === 'qr' ? 'QR Scan' : rec.source === 'biometric' ? 'Biometric' : 'Manual'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 px-4 text-slate-500 font-semibold whitespace-nowrap">
                                                                    {rec.source === 'qr' ? 'System (QR)' : rec.source === 'biometric' ? 'Biometric Device' : (rec.markedBy || 'Teacher')}
                                                                </td>
                                                                <td className="py-4 px-4 whitespace-nowrap">
                                                                    {rec.leaveNote ? (
                                                                        <button
                                                                            onClick={() => setSelectedPhoto({ title: 'Student Leave / Note Description', content: rec.leaveNote, type: 'note' })}
                                                                            className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-150 rounded-lg text-[10px] font-black tracking-wider transition-colors cursor-pointer"
                                                                        >
                                                                            See Note
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-slate-350 italic text-[10px] font-medium">No Note</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-4 px-4 whitespace-nowrap">
                                                                    {rec.teacherNote ? (
                                                                        <button
                                                                            onClick={() => setSelectedPhoto({ title: 'Faculty / Admin Note Description', content: rec.teacherNote, type: 'note' })}
                                                                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-lg text-[10px] font-black tracking-wider transition-colors cursor-pointer"
                                                                        >
                                                                            See Note
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-slate-355 italic text-[10px] font-medium">No Note</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-4 px-4 text-center text-slate-550 whitespace-nowrap font-medium">
                                                                    {formatTime(checkInVal)}
                                                                </td>
                                                                <td className="py-4 px-4 text-center text-slate-550 whitespace-nowrap font-medium">
                                                                    {formatTime(checkOutVal)}
                                                                </td>
                                                                <td className="py-4 px-4 text-center text-slate-600 font-bold whitespace-nowrap">
                                                                    {timeSpentStr}
                                                                </td>
                                                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                                                    <div className="flex justify-center items-center gap-1.5">
                                                                        {rec.checkInPhoto ? (
                                                                            <button
                                                                                onClick={() => setSelectedPhoto({ title: 'Check-In Verification Selfie', url: rec.checkInPhoto, type: 'photo' })}
                                                                                className="w-6.5 h-6.5 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer shadow-sm"
                                                                                title="Check-In Selfie"
                                                                            >
                                                                                <ImageIcon size={11} />
                                                                            </button>
                                                                        ) : '—'}
                                                                        {rec.checkOutPhoto ? (
                                                                            <button
                                                                                onClick={() => setSelectedPhoto({ title: 'Check-Out Verification Selfie', url: rec.checkOutPhoto, type: 'photo' })}
                                                                                className="w-6.5 h-6.5 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-550 hover:bg-slate-50 cursor-pointer shadow-sm"
                                                                                title="Check-Out Selfie"
                                                                            >
                                                                                <ImageIcon size={11} />
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeClass}`}>
                                                                        {status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                                                    <div className="flex justify-center items-center gap-1">
                                                                        <button
                                                                            onClick={() => { setEditingNoteFor(isEditing ? null : rec.date); setNoteText(rec.teacherNote || ''); }}
                                                                            title="Add Note"
                                                                            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                                                                rec.teacherNote ? 'bg-indigo-50 border-indigo-200 text-indigo-650' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                                                            }`}
                                                                        >
                                                                            <Edit3 size={11} />
                                                                        </button>
                                                                        <button onClick={() => handleDelete(rec.date)} disabled={isDeleting} title="Delete record"
                                                                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition cursor-pointer disabled:opacity-50">
                                                                            {isDeleting
                                                                                ? <div className="w-3 h-3 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
                                                                                : <Trash2 size={11} />}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {/* Expandable row for inline Note Editing or Leave Application */}
                                                            {(isEditing || rec.leaveNote || rec.leaveFile) && (
                                                                <tr>
                                                                    <td colSpan={11} className="py-3.5 px-6 bg-slate-50/40 border-b border-slate-100">
                                                                        <div className="flex flex-col gap-3">
                                                                            {isEditing && (
                                                                                <div className="bg-white border-l-4 border-indigo-500 border border-slate-200/80 rounded-2xl p-5 shadow-sm max-w-xl text-left">
                                                                                    <div className="flex items-center gap-1.5 mb-2.5">
                                                                                        <Edit3 size={12} className="text-indigo-600" />
                                                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Teacher Note Editor</p>
                                                                                    </div>
                                                                                    <textarea 
                                                                                        rows={3} 
                                                                                        value={noteText} 
                                                                                        onChange={e => setNoteText(e.target.value)} 
                                                                                        autoFocus
                                                                                        placeholder="Enter note details here..."
                                                                                        className="w-full text-xs border border-slate-250 rounded-xl px-3.5 py-2.5 resize-none outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-slate-50/50 hover:bg-slate-50 transition" 
                                                                                    />
                                                                                    <div className="flex gap-2 justify-end mt-3">
                                                                                        <button 
                                                                                            onClick={() => setEditingNoteFor(null)}
                                                                                            className="text-xs px-3.5 py-1.8 bg-white border border-slate-200 text-slate-550 rounded-xl hover:bg-slate-50 transition cursor-pointer font-bold"
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={() => handleSaveTeacherNote(rec.date)} 
                                                                                            disabled={savingNote}
                                                                                            className="text-xs px-3.5 py-1.8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60 shadow-sm shadow-indigo-150"
                                                                                        >
                                                                                            <Save size={12} /> {savingNote ? 'Saving...' : 'Save Note'}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Leave Application Details */}
                                                                            {(rec.leaveNote || rec.leaveFile) && (
                                                                                <div className="bg-white border-l-4 border-amber-500 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3 max-w-xl text-left shadow-sm">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <FileText size={12} className="text-amber-600" />
                                                                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Leave Application Details</p>
                                                                                        </div>
                                                                                        <span className={`text-[10px] font-black px-2.5 py-0.8 rounded-full border ${
                                                                                            rec.leaveStatus === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                                                            rec.leaveStatus === 'Rejected' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                                                                            'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                                                                                        }`}>
                                                                                            {rec.leaveStatus || 'Pending'}
                                                                                        </span>
                                                                                    </div>
                                                                                    {rec.leaveNote && (
                                                                                        <div className="bg-slate-50/65 rounded-xl p-3 border border-slate-100/80">
                                                                                            <p className="text-xs text-slate-700 font-bold leading-relaxed">{rec.leaveNote}</p>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex items-center justify-between gap-3 mt-1 flex-wrap">
                                                                                        {rec.leaveFile ? (
                                                                                            <a href={rec.leaveFile} target="_blank" rel="noopener noreferrer"
                                                                                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50/40 border border-amber-200 rounded-xl px-3 py-1.8 transition hover:bg-amber-50 shadow-sm">
                                                                                                <ExternalLink size={11} /> View Document Attachment
                                                                                            </a>
                                                                                        ) : (
                                                                                            <div />
                                                                                        )}
                                                                                        {(!rec.leaveStatus || rec.leaveStatus === 'Pending') && (
                                                                                            <div className="flex gap-2 ml-auto">
                                                                                                <button
                                                                                                    onClick={() => handleLeaveApproval(rec.date, true)}
                                                                                                    className="px-3.5 py-1.8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-100 flex items-center gap-1"
                                                                                                >
                                                                                                    <Check size={11} /> Approve
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleLeaveApproval(rec.date, false)}
                                                                                                    className="px-3.5 py-1.8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-100 flex items-center gap-1"
                                                                                                >
                                                                                                    <X size={11} /> Reject
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Detail Popup Modal (Selfies & Notes) */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-md w-full mx-4 bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4.5 right-4.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-550 flex items-center justify-center z-10 transition cursor-pointer">
                            <X size={15} />
                        </button>
                        <div className="px-6 py-4.5 border-b border-slate-100 font-extrabold text-sm text-slate-800">{selectedPhoto.title}</div>
                        <div className="p-6">
                            {selectedPhoto.type === 'photo' ? (
                                <img src={selectedPhoto.url} alt="Verification" className="w-full rounded-2xl aspect-video object-cover border border-slate-150 shadow-sm" />
                            ) : (
                                <div className="bg-slate-50/70 border-l-4 border-indigo-500 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <FileText size={14} className="text-indigo-600" />
                                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Note Message</span>
                                    </div>
                                    <p className="text-slate-700 text-sm font-bold whitespace-pre-wrap leading-relaxed">{selectedPhoto.content}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </>,
        document.body
    );
};

export default StaffAttendanceDetailModal;
