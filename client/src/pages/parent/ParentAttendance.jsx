import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ParentAttendance = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentProfile, setStudentProfile] = useState(null);

    const studentId = user?.parentProfile?.student?._id || user?.parentProfile?.student;

    useEffect(() => {
        const fetchData = async () => {
            if (!studentId) {
                setLoading(false);
                return;
            }
            try {
                const [attendanceRes, profileRes] = await Promise.all([
                    axios.get('/api/attendance/my-records'),
                    axios.get(`/api/users/view/${studentId}`)
                ]);
                setAttendance(attendanceRes.data || []);
                setStudentProfile(profileRes.data);
            } catch (err) {
                console.error("Error fetching child's attendance:", err);
                toast.error("Failed to load attendance history");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studentId]);

    if (loading) return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        </DashboardLayout>
    );

    if (!studentId) {
        return (
            <DashboardLayout role="Parent" fullWidth={true}>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                    <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
                    <h2 className="text-xl font-bold text-slate-800">No Student Linked</h2>
                    <p className="text-slate-500 mt-2 max-w-md">
                        Please contact the administrator or institute to link your parent account with your child's student profile.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    // Calculations
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'Present' || a.status === 'In').length;
    const leaveDays = attendance.filter(a => a.status === 'Leave').length;
    const absentDays = totalDays - presentDays - leaveDays;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <div className="max-w-5xl mx-auto space-y-6 pb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Student Attendance History</h1>
                    <p className="text-slate-500">View attendance log and leave requests for {studentProfile?.name}.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                            {percentage}%
                        </div>
                        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Attendance Ratio</h4>
                        <p className="text-xs text-slate-550 font-bold">Target: 75% Min</p>
                    </div>

                    <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Present</span>
                        </div>
                        <p className="text-3xl font-black text-slate-800">{presentDays} Days</p>
                        <p className="text-slate-400 text-[10px] font-bold mt-1">out of {totalDays} total recorded days</p>
                    </div>

                    <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-red-500 mb-2">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
                        </div>
                        <p className="text-3xl font-black text-slate-800">{absentDays} Days</p>
                        <p className="text-slate-400 text-[10px] font-bold mt-1">without leave request</p>
                    </div>

                    <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-blue-500 mb-2">
                            <Clock size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Approved Leave</span>
                        </div>
                        <p className="text-3xl font-black text-slate-800">{leaveDays} Days</p>
                        <p className="text-slate-400 text-[10px] font-bold mt-1">official approved leave applications</p>
                    </div>
                </div>

                {/* Calendar log list */}
                <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6 overflow-hidden">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-slate-800 font-black text-base">Child's Attendance Log</h2>
                            <p className="text-slate-450 text-xs mt-1.5 font-bold">List of all marked classroom and virtual session attendances.</p>
                        </div>
                        <CalendarIcon className="text-slate-350" size={20} />
                    </div>

                    {attendance.length === 0 ? (
                        <div className="py-10 text-center">
                            <CalendarIcon size={32} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-450 font-bold text-xs italic">No attendance marked yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-150 text-[11px] font-black text-slate-450 uppercase tracking-wider">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Session / Topic</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4">Check-In / Out</th>
                                        <th className="px-6 py-4">Note / Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                    {attendance.map((rec) => (
                                        <tr key={rec._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                                    rec.status === 'Present' || rec.status === 'In'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : rec.status === 'Absent'
                                                            ? 'bg-rose-50 text-rose-600'
                                                            : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{rec.session?.subject || 'Classroom Duty'}</span>
                                                    <span className="text-xs text-slate-400">By {rec.session?.teacher?.name || 'Instructor'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs uppercase font-bold text-slate-450 bg-slate-100 px-2 py-0.5 rounded">
                                                    {rec.source || 'Manual'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono">
                                                {rec.checkInTime ? (
                                                    <div className="flex flex-col">
                                                        <span>In: {rec.checkInTime}</span>
                                                        {rec.checkOutTime && <span>Out: {rec.checkOutTime}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={rec.teacherNote || rec.leaveNote}>
                                                {rec.teacherNote || rec.leaveNote || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ParentAttendance;
