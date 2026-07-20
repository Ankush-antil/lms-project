import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Calendar, Clock, X, ChevronRight, ChevronLeft, Loader2, List, Calendar as CalendarIcon, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = '1091703484552-ogtcuj2470cnoh22bvke65ul96a0n5hc.apps.googleusercontent.com';
const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const LS_TOKEN = 'lms_gcal_token';
const LS_USER  = 'lms_gcal_user';

const EVENT_TYPES = [
    { value: 'class',   label: 'Class',   color: '#3E3ADD', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'exam',    label: 'Exam',    color: '#EF4444', bg: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'holiday', label: 'Holiday', color: '#10B981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'meeting', label: 'Meeting', color: '#F59E0B', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'other',   label: 'Other',   color: '#64748B', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
];

const typeMeta = (val) => EVENT_TYPES.find(t => t.value === val) || EVENT_TYPES[4];

const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const GoogleCalendarModal = ({ isOpen, onClose, inline = false }) => {
    const [step, setStep] = useState(1);
    const [accessToken, setAccessToken] = useState('');
    const [calUser, setCalUser] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [apiError, setApiError] = useState(''); // 'disabled' | 'scope' | ''
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDateStr, setSelectedDateStr] = useState(getTodayStr());
    const [form, setForm] = useState({
        title: '', type: 'class', date: getTodayStr(), startTime: '09:00', endTime: '10:00', description: ''
    });

    // Load GSI SDK
    useEffect(() => {
        const id = 'google-gsi-client';
        if (!document.getElementById(id)) {
            const s = document.createElement('script');
            s.id = id; s.src = 'https://accounts.google.com/gsi/client';
            s.async = true; s.defer = true;
            document.body.appendChild(s);
        }
    }, []);

    // Auto-restore session
    useEffect(() => {
        if (!isOpen) return;
        const tok = localStorage.getItem(LS_TOKEN);
        const usr = localStorage.getItem(LS_USER);
        if (tok && usr) {
            try {
                setCalUser(JSON.parse(usr));
                setAccessToken(tok);
                setStep(2);
                loadEvents(tok, currentMonth);
            } catch { clearAuth(); }
        }
    }, [isOpen]);

    // Reload events when viewed month changes
    useEffect(() => {
        if (accessToken && step === 2) {
            loadEvents(accessToken, currentMonth);
        }
    }, [currentMonth]);

    const clearAuth = () => {
        localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER);
        setCalUser(null); setAccessToken(''); setEvents([]); setStep(1); setShowForm(false);
    };

    const handleSignIn = (forceSelect = false) => {
        if (!window.google) { toast.error('Google SDK still loading...'); return; }
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: CAL_SCOPE,
                prompt: forceSelect ? 'select_account' : '',
                callback: async (resp) => {
                    if (!resp?.access_token) return;
                    const tok = resp.access_token;
                    setAccessToken(tok);
                    localStorage.setItem(LS_TOKEN, tok);
                    try {
                        const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tok}` } });
                        const d = await r.json();
                        const usr = { name: d.name, email: d.email };
                        setCalUser(usr); localStorage.setItem(LS_USER, JSON.stringify(usr));
                    } catch { setCalUser({ name: 'Google User', email: '' }); }
                    setStep(2); setShowForm(false);
                    loadEvents(tok, currentMonth);
                }
            });
            client.requestAccessToken({ prompt: forceSelect ? 'select_account' : '' });
        } catch (e) { console.error('Google Calendar sign-in:', e); toast.error('Sign-in failed.'); }
    };

    const loadEvents = async (token, targetMonth) => {
        setLoading(true);
        setApiError('');
        try {
            const firstDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
            const startRange = new Date(firstDay.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
            const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
            const endRange = new Date(lastDay.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

            const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startRange)}&timeMax=${encodeURIComponent(endRange)}&singleEvents=true&orderBy=startTime&maxResults=150`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token || accessToken}` } });
            if (!res.ok) {
                if (res.status === 401) { clearAuth(); return; }
                if (res.status === 403) {
                    let errMsg = '';
                    try { const body = await res.json(); errMsg = body?.error?.message || ''; } catch {}
                    console.log('[Calendar 403 Error]:', errMsg);
                    const msg = errMsg.toLowerCase();
                    if (msg.includes('has not been used') || msg.includes('disabled')) {
                        setApiError('disabled');
                    } else {
                        setApiError('scope');
                    }
                    return;
                }
                throw new Error(`Calendar API ${res.status}`);
            }
            const data = await res.json();
            setEvents(data.items || []);
        } catch (err) { toast.error(err.message || 'Failed to load events.'); }
        finally { setLoading(false); }
    };

    const handleCreateEvent = async () => {
        if (!form.title.trim()) { toast.error('Event title is required.'); return; }
        if (!form.date) { toast.error('Please select a date.'); return; }
        setCreating(true);
        const meta = typeMeta(form.type);
        const startDt = `${form.date}T${form.startTime}:00`;
        const endDt   = `${form.date}T${form.endTime}:00`;
        const body = {
            summary: `[${meta.label}] ${form.title}`,
            description: form.description || `Type: ${meta.label}`,
            start: { dateTime: startDt, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            end:   { dateTime: endDt,   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            colorId: form.type === 'class' ? '9' : form.type === 'exam' ? '11' : form.type === 'holiday' ? '2' : form.type === 'meeting' ? '5' : '1',
        };
        try {
            const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`Calendar create error ${res.status}`);
            toast.success('Event created in Google Calendar!');
            setForm({ title: '', type: 'class', date: selectedDateStr, startTime: '09:00', endTime: '10:00', description: '' });
            setShowForm(false);
            loadEvents(accessToken, currentMonth);
        } catch (err) { toast.error(err.message || 'Failed to create event.'); }
        finally { setCreating(false); }
    };

    const fmtDate = (evt) => {
        const dt = evt.start?.dateTime || evt.start?.date;
        if (!dt) return '';
        const d = new Date(dt);
        return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const fmtTime = (evt) => {
        if (!evt.start?.dateTime) return 'All day';
        const s = new Date(evt.start.dateTime);
        const e = new Date(evt.end.dateTime);
        return `${s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} – ${e.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    };

    const getEventType = (summary = '') => {
        const s = summary.toLowerCase();
        if (s.includes('[class]') || s.includes('class')) return 'class';
        if (s.includes('[exam]') || s.includes('exam') || s.includes('test')) return 'exam';
        if (s.includes('[holiday]') || s.includes('holiday')) return 'holiday';
        if (s.includes('[meeting]') || s.includes('meeting')) return 'meeting';
        return 'other';
    };

    const getMonthDays = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < firstDayIndex; i++) {
            days.push({ day: null, dateStr: null });
        }
        for (let day = 1; day <= totalDays; day++) {
            const m = String(month + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            const dateStr = `${year}-${m}-${d}`;
            days.push({ day, dateStr });
        }
        return days;
    };

    const getDayEvents = (dateStr) => {
        if (!dateStr) return [];
        return events.filter(evt => {
            const startDt = evt.start?.dateTime || evt.start?.date;
            if (!startDt) return false;
            return startDt.startsWith(dateStr);
        }).sort((a,b) => (a.start?.dateTime || a.start?.date).localeCompare(b.start?.dateTime || b.start?.date));
    };

    const changeMonth = (offset) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const selectDay = (dateStr) => {
        if (!dateStr) return;
        setSelectedDateStr(dateStr);
        setForm(f => ({ ...f, date: dateStr }));
    };

    const isToday = (dateStr) => {
        if (!dateStr) return false;
        return dateStr === getTodayStr();
    };

    const formatSelectedDateHeader = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const gridDays = getMonthDays(currentMonth);
    const selectedDayEvents = getDayEvents(selectedDateStr);

    if (!isOpen) return null;

    const cardContent = (
        <div className={inline
            ? 'bg-white rounded-3xl shadow-sm border border-slate-100 w-full overflow-hidden flex flex-col font-sans'
            : 'bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] font-sans'
        }>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2.5">
                    <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
                        <rect width="48" height="48" rx="6" fill="#fff"/>
                        <path fill="#EA4335" d="M35 13H13v4h22v-4z"/>
                        <path fill="#1967D2" d="M13 13h4V9h-4v4z"/>
                        <path fill="#1967D2" d="M31 13h4V9h-4v4z"/>
                        <rect x="13" y="17" width="22" height="22" rx="2" fill="#1967D2"/>
                        <rect x="14" y="18" width="20" height="20" rx="1" fill="#fff"/>
                        <text x="24" y="33" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1967D2">{new Date().getDate()}</text>
                    </svg>
                    <div>
                        <span className="font-extrabold text-slate-800 text-sm block">Google Calendar</span>
                        {calUser && <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Connected: {calUser.email}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {step === 2 && (
                        <>
                            <div className="bg-slate-100 border border-slate-200 p-0.5 rounded-xl flex items-center shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-black uppercase ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <CalendarIcon size={12} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-black uppercase ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <List size={12} />
                                </button>
                            </div>
                            <button onClick={clearAuth} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all flex items-center gap-1 text-[10px] font-black uppercase border border-transparent hover:border-red-200">
                                <LogOut size={13}/><span className="hidden sm:inline">Disconnect</span>
                            </button>
                        </>
                    )}
                    {!inline && <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"><X size={18}/></button>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-[350px]">
                {step === 1 && (
                    <div className="space-y-6 py-6 text-center max-w-sm mx-auto animate-fade-in">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                            <Calendar size={32} className="text-[#1967D2]"/>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Sign in with Google</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Connect your Google Calendar to view and create class schedules, exams, and events.</p>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => handleSignIn(false)}
                                className="w-full flex items-center justify-between p-4 border border-slate-200 hover:border-[#1967D2] hover:bg-blue-50/30 rounded-2xl transition-all text-left shadow-sm cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">G</div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Default Google Account</p>
                                        <p className="text-[10px] text-slate-400 font-bold">Click to link</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-400"/>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        {apiError === 'disabled' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                                <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z"/></svg>
                                    <div>
                                        <p className="text-xs font-black text-amber-800">Google Calendar API Not Enabled</p>
                                        <p className="text-[11px] text-amber-700 mt-1">Enable it in Google Cloud Console.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {apiError === 'scope' && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z"/></svg>
                                    <div>
                                        <p className="text-xs font-black text-red-700">Calendar Access Not Granted</p>
                                        <p className="text-[11px] text-red-600 mt-1">Disconnect and sign in again.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showForm && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in mb-4">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Create New Event</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {EVENT_TYPES.map(t => (
                                        <button key={t.value} onClick={() => setForm(f => ({...f, type: t.value}))}
                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all ${form.type === t.value ? t.bg + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <input type="text" placeholder="Event title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                                    className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"/>
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full px-2.5 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"/>
                                    <input type="time" value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} className="w-full px-2.5 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"/>
                                    <input type="time" value={form.endTime} onChange={e => setForm(f => ({...f, endTime: e.target.value}))} className="w-full px-2.5 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"/>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleCreateEvent} className="flex-1 py-2.5 bg-[#1967D2] text-white rounded-xl text-xs font-black uppercase tracking-wider">Create</button>
                                    <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider">Cancel</button>
                                </div>
                            </div>
                        )}

                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="flex items-center justify-between bg-slate-50 border border-slate-150 px-4 py-2 rounded-2xl select-none">
                                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-200 text-slate-600 rounded-lg"><ChevronLeft size={15} /></button>
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                            {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                        </h4>
                                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-200 text-slate-600 rounded-lg"><ChevronRight size={15} /></button>
                                    </div>
                                    {loading ? (
                                        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#1967D2]"/></div>
                                    ) : (
                                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20">
                                            <div className="grid grid-cols-7 bg-slate-50/60 border-b border-slate-100 py-1.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                                            </div>
                                            <div className="grid grid-cols-7 gap-px bg-slate-200">
                                                {gridDays.map((item, idx) => {
                                                    const dayEvents = getDayEvents(item.dateStr);
                                                    const isSelected = selectedDateStr === item.dateStr;
                                                    return (
                                                        <div key={idx} onClick={() => item.dateStr && selectDay(item.dateStr)}
                                                            className={`min-h-[58px] p-1.5 bg-white transition-all cursor-pointer hover:bg-indigo-50/30 ${isSelected ? 'ring-2 ring-indigo-500 z-10' : ''}`}>
                                                            {item.day && (
                                                                <>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-[10px] font-black ${isToday(item.dateStr) ? 'bg-[#1967D2] text-white w-4.5 h-4.5 rounded-full flex items-center justify-center' : 'text-slate-600'}`}>{item.day}</span>
                                                                    </div>
                                                                    <div className="space-y-0.5 mt-1 hidden lg:block">
                                                                        {dayEvents.slice(0, 2).map(evt => <div key={evt.id} className="h-1.5 rounded-full" style={{ backgroundColor: typeMeta(getEventType(evt.summary)).color }}/>)}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="lg:col-span-1 bg-slate-50 border border-slate-200/80 rounded-3xl p-5 min-h-[300px] flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="border-b border-slate-200 pb-3">
                                            <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5"><CalendarIcon size={14} className="text-[#1967D2]" /> {formatSelectedDateHeader(selectedDateStr)}</h4>
                                        </div>
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                                            {selectedDayEvents.length === 0 ? (
                                                <div className="text-center py-8 text-slate-400 text-[11px]">No events scheduled.</div>
                                            ) : selectedDayEvents.map(evt => (
                                                <div key={evt.id} className="p-2.5 bg-white border border-slate-150 rounded-xl">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{evt.summary?.replace(/^\[(Class|Exam|Holiday|Meeting|Other)\]\s*/i, '')}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold">{fmtTime(evt)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => { setForm(f => ({ ...f, date: selectedDateStr })); setShowForm(true); }} className="w-full py-2.5 bg-[#1967D2] text-white rounded-xl text-xs font-black uppercase">Add Event</button>
                                </div>
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <div className="space-y-2">
                                {events.map(evt => (
                                    <div key={evt.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-800">{evt.summary}</p>
                                            <p className="text-[10px] text-slate-500">{fmtDate(evt)} • {fmtTime(evt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{__html:`
                .scrollbar-thin::-webkit-scrollbar { width: 3px; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9px; }
            `}}/>
        </div>
    );

    if (inline) return cardContent;
    return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">{cardContent}</div>;
};

export default GoogleCalendarModal;
