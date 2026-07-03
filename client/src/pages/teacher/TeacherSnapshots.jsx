import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Search, CheckCircle, Users, GraduationCap, XCircle,
    Save, RotateCcw, FileText
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';

const MiniCalendar = ({ date, onSelect }) => {
    const d = new Date(date + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth();
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    const prevMonth = () => {
        const nd = new Date(year, month - 1, 1);
        onSelect(nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-01');
    };
    const nextMonth = () => {
        const nd = new Date(year, month + 1, 1);
        onSelect(nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-01');
    };
    const monthName = d.toLocaleString('default', { month: 'long' });
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer font-bold">&lt;</button>
                <span className="text-sm font-bold text-gray-700">{monthName} {year}</span>
                <button onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer font-bold">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-[10px] font-bold text-gray-400">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {cells.map((day, idx) => {
                    if (!day) return <div key={'e' + idx} />;
                    const cellDate = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                    const isSelected = cellDate === date;
                    const isToday = cellDate === today;
                    const isFuture = cellDate > today;
                    return (
                        <button key={day}
                            onClick={() => !isFuture && onSelect(cellDate)}
                            disabled={isFuture}
                            title={isFuture ? 'Cannot select future date' : ''}
                            className={`w-7 h-7 rounded-full text-xs font-semibold mx-auto flex items-center justify-center ${
                                isFuture
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : isSelected
                                        ? 'bg-green-500 text-white shadow-sm cursor-pointer'
                                        : isToday
                                            ? 'bg-green-100 text-green-700 font-bold cursor-pointer hover:bg-green-200'
                                            : 'text-gray-600 hover:bg-gray-100 cursor-pointer transition'
                            }`}>
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const TeacherSnapshots = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);
    const [records, setRecords] = useState({});
    const [noteModal, setNoteModal] = useState(null);
    const [noteText, setNoteText] = useState('');
    const todayStr = new Date().toISOString().split('T')[0];

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/users/teacher-students');
            setStudents(data);
            setLoading(false);
        } catch (error) {
            toast.error('Failed to load students list');
            setLoading(false);
        }
    };

    useEffect(() => { fetchStudents(); }, []);

    useEffect(() => {
        if (students.length === 0) return;
        const init = {};
        students.forEach(s => {
            const existing = s.studentProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id] = { status: existing?.status || 'Present', note: existing?.note || '' };
        });
        setRecords(init);
    }, [students, attendanceDate]);

    const setStatus = (id, status) =>
        setRecords(prev => ({ ...prev, [id]: { ...prev[id], status } }));

    const openNoteModal = (id) => {
        setNoteText(records[id]?.note || '');
        setNoteModal(id);
    };

    const saveNote = () => {
        if (noteModal) setRecords(prev => ({ ...prev, [noteModal]: { ...prev[noteModal], note: noteText } }));
        setNoteModal(null);
    };

    const handleMarkAll = (status) => {
        const updated = {};
        students.forEach(s => { updated[s._id] = { ...records[s._id], status }; });
        setRecords(updated);
    };

    const handleSave = async () => {
        // Block future date submission on client side
        if (attendanceDate > todayStr) {
            toast.error('Cannot mark attendance for a future date');
            return;
        }
        try {
            setSubmitting(true);
            const attendanceRecords = Object.entries(records).map(([studentId, rec]) => ({
                studentId, status: rec.status, note: rec.note
            }));
            await axios.post('/api/users/bulk-physical-attendance', { date: attendanceDate, attendanceRecords });
            toast.success('Attendance saved for ' + attendanceDate);
            await fetchStudents();
            setSubmitting(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save attendance');
            setSubmitting(false);
        }
    };

    const filteredStudents = useMemo(() =>
        students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.studentProfile?.studentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase())
        ), [students, searchTerm]);

    const stats = useMemo(() => {
        const vals = Object.values(records);
        return {
            total: students.length,
            present: vals.filter(r => r.status === 'Present').length,
            absent: vals.filter(r => r.status === 'Absent').length,
            leave: vals.filter(r => r.status === 'Leave').length
        };
    }, [records, students]);

    if (loading) return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="min-h-screen bg-gray-50 font-sans">
                <div className="bg-white border-b border-gray-200 px-8 py-5">
                    <h1 className="text-xl font-bold text-gray-800">Subject Attendance</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Mark and manage daily classroom attendance for your assigned students</p>
                </div>

                <div className="flex gap-6 p-6 max-w-7xl mx-auto items-start">
                    <div className="flex-1 min-w-0">
                        {/* Filter Bar */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 p-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">Section</label>
                                    <div className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 min-w-[110px]">
                                        {user?.teacherProfile?.assignedSections?.join(', ') || 'All Sections'}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500">Course</label>
                                    <div className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 min-w-[150px] max-w-[220px] truncate">
                                        {user?.teacherProfile?.course?.name || 'Assigned Course'}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                    <label className="text-xs font-semibold text-gray-500">Search</label>
                                    <div className="relative">
                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input type="text" placeholder="Search by name or ID..."
                                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 bg-gray-50 transition w-full" />
                                    </div>
                                </div>
                                <button className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm self-end">
                                    <Search size={14} /> Search
                                </button>
                            </div>
                        </div>

                        {/* Quick Mark */}
                        <div className="flex gap-2 mb-3 items-center">
                            <button onClick={() => handleMarkAll('Present')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-xs font-bold transition cursor-pointer">
                                <CheckCircle size={13} /> All Present
                            </button>
                            <button onClick={() => handleMarkAll('Absent')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-bold transition cursor-pointer">
                                <XCircle size={13} /> All Absent
                            </button>
                            <button onClick={() => handleMarkAll('Leave')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold transition cursor-pointer">
                                <FileText size={13} /> All Leave
                            </button>
                            <div className="flex-1" />
                            <span className="text-xs text-gray-400 font-semibold">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider w-28">Student ID</th>
                                        <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-24">Presnt</th>
                                        <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-24">Absent</th>
                                        <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-20">Leave</th>
                                        <th className="py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-20">Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                                        const rec = records[student._id] || { status: 'Present', note: '' };
                                        const shortId = student.studentProfile?.studentId || student._id.substring(18).toUpperCase();
                                        const hasNote = rec.note && rec.note.trim() !== '';
                                        return (
                                            <tr key={student._id} className={`transition-colors hover:bg-green-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                                <td className="py-3.5 px-5">
                                                    <span className="text-sm font-semibold text-gray-500">{shortId}</span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                                                            {student.avatar ? <img src={student.avatar} alt="" className="w-full h-full object-cover" /> : student.name[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800 leading-none">{student.name}</p>
                                                            <p className="text-[11px] text-gray-400 mt-0.5">{student.studentProfile?.section ? 'Section ' + student.studentProfile.section : student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <button onClick={() => setStatus(student._id, 'Present')}
                                                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-all cursor-pointer ${rec.status === 'Present' ? 'border-green-500 bg-green-500 shadow-md shadow-green-100' : 'border-gray-300 bg-white hover:border-green-400'}`}>
                                                        {rec.status === 'Present' && <div className="w-3 h-3 rounded-full bg-white" />}
                                                    </button>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <button onClick={() => setStatus(student._id, 'Absent')}
                                                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-all cursor-pointer ${rec.status === 'Absent' ? 'border-red-500 bg-red-500 shadow-md shadow-red-100' : 'border-gray-300 bg-white hover:border-red-400'}`}>
                                                        {rec.status === 'Absent' && <div className="w-3 h-3 rounded-full bg-white" />}
                                                    </button>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <button onClick={() => setStatus(student._id, 'Leave')}
                                                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-all cursor-pointer ${rec.status === 'Leave' ? 'border-amber-500 bg-amber-500 shadow-md shadow-amber-100' : 'border-gray-300 bg-white hover:border-amber-400'}`}>
                                                        {rec.status === 'Leave' && <div className="w-3 h-3 rounded-full bg-white" />}
                                                    </button>
                                                </td>
                                                <td className="py-3.5 px-5 text-center">
                                                    <button onClick={() => openNoteModal(student._id)}
                                                        className={`text-xs font-semibold transition cursor-pointer px-2 py-1 rounded-lg border ${hasNote ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' : 'text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                                        {hasNote ? 'Edit' : 'Note'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="6" className="py-16 text-center">
                                                <Users size={40} className="text-gray-200 mx-auto mb-3" />
                                                <p className="text-gray-400 font-semibold text-sm">No students found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {filteredStudents.length > 0 && (
                                <div className="border-t border-gray-100 bg-gray-50 px-5 py-3.5 flex items-center justify-between">
                                    <p className="text-xs text-gray-400 font-medium">Date: <span className="font-bold text-gray-600">{attendanceDate}</span></p>
                                    <div className="flex gap-2">
                                        <button onClick={fetchStudents}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition cursor-pointer">
                                            <RotateCcw size={13} /> Reset
                                        </button>
                                        <button onClick={handleSave} disabled={submitting}
                                            className="flex items-center gap-1.5 px-5 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">
                                            <Save size={13} /> {submitting ? 'Saving...' : 'Save Attendance'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="w-72 shrink-0 space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <MiniCalendar date={attendanceDate} onSelect={setAttendanceDate} />
                        </div>
                        <div className="bg-amber-300 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center">
                                <GraduationCap size={22} className="text-amber-800" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-amber-900 leading-none">{stats.total}</p>
                                <p className="text-amber-800 text-xs font-bold mt-0.5">Total Students</p>
                            </div>
                        </div>
                        <div className="bg-green-400 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center">
                                <CheckCircle size={22} className="text-green-900" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-green-900 leading-none">{stats.present}</p>
                                <p className="text-green-900 text-xs font-bold mt-0.5">Present Today</p>
                            </div>
                        </div>
                        <div className="bg-red-400 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center">
                                <XCircle size={22} className="text-red-900" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-red-900 leading-none">{stats.absent}</p>
                                <p className="text-red-900 text-xs font-bold mt-0.5">Absent Today</p>
                            </div>
                        </div>
                        <div className="bg-blue-300 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center">
                                <FileText size={22} className="text-blue-900" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-blue-900 leading-none">{stats.leave}</p>
                                <p className="text-blue-900 text-xs font-bold mt-0.5">On Leave</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {noteModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setNoteModal(null); }}>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-gray-800 text-base mb-1 flex items-center gap-2">
                            <FileText size={17} className="text-blue-500" /> Add Note
                        </h3>
                        <p className="text-gray-400 text-xs mb-4">{students.find(s => s._id === noteModal)?.name} — {attendanceDate}</p>
                        <textarea autoFocus rows={4} value={noteText} onChange={e => setNoteText(e.target.value)}
                            placeholder="e.g. Medical leave approved, arrived late..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition" />
                        <div className="flex gap-3 justify-end mt-4">
                            <button onClick={() => setNoteModal(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer">Cancel</button>
                            <button onClick={saveNote}
                                className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">Save Note</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherSnapshots;