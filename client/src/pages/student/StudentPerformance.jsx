import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Award, BarChart3, Calendar, CheckCircle2, Clock,
    FileText, Info, Mic, MonitorPlay, Phone,
    Star, TrendingUp, Trophy, Video, Camera, ArrowRight,
    AlertCircle, Sparkles, Activity, ShieldCheck, ChevronRight,
    RefreshCw, CreditCard
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import toast from 'react-hot-toast';

const StudentPerformance = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [cloudFiles, setCloudFiles] = useState([]);
    const [localFilesCount, setLocalFilesCount] = useState({
        screenshots: 0,
        screenRecordings: 0,
        audios: 0,
        videos: 0,
        calls: 0
    });
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('graded'); // 'graded' | 'pending' | 'unattempted'

    // College ERP Integration Mock States
    const [isSyncing, setIsSyncing] = useState(false);
    const [erpPresent, setErpPresent] = useState(42);
    const [erpTotal] = useState(50);

    const handleSyncERP = () => {
        setIsSyncing(true);
        const loadingToast = toast.loading("Syncing data with College ERP Server...");

        setTimeout(() => {
            toast.dismiss(loadingToast);
            // Randomly update attendance slightly to simulate live sync
            const randomAdd = Math.floor(Math.random() * 3) - 1; // -1, 0, 1, or 2
            const newPresent = Math.min(erpTotal, Math.max(35, erpPresent + randomAdd));
            setErpPresent(newPresent);

            toast.success("ERP Attendance and Fees records synced successfully!");
            setIsSyncing(false);
        }, 1500);
    };

    // Calculate dynamic percentage
    const erpAttendancePercent = useMemo(() => {
        return Math.round((erpPresent / erpTotal) * 100);
    }, [erpPresent, erpTotal]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [testsRes, subsRes, cloudRes, profileRes] = await Promise.all([
                    axios.get('/api/tests'),
                    axios.get('/api/submissions'),
                    axios.get('/api/practice-files').catch(() => ({ data: { files: [] } })),
                    axios.get('/api/users/profile')
                ]);

                setTests(testsRes.data || []);
                setSubmissions(subsRes.data || []);
                setCloudFiles(cloudRes.data?.files || []);
                setProfile(profileRes.data || null);

                // Load local storage counts
                const localCounts = {
                    screenshots: 0,
                    screenRecordings: 0,
                    audios: 0,
                    videos: 0,
                    calls: 0
                };

                try {
                    const sc = localStorage.getItem('practice_screenshots');
                    if (sc) localCounts.screenshots = JSON.parse(sc).length || 0;

                    const sr = localStorage.getItem('practice_screen_recordings');
                    if (sr) localCounts.screenRecordings = JSON.parse(sr).length || 0;

                    const au = localStorage.getItem('practice_audios');
                    if (au) localCounts.audios = JSON.parse(au).length || 0;

                    const vi = localStorage.getItem('practice_videos');
                    if (vi) localCounts.videos = JSON.parse(vi).length || 0;

                    const ca = localStorage.getItem('practice_call_logs');
                    if (ca) localCounts.calls = JSON.parse(ca).length || 0;
                } catch (e) {
                    console.error("Failed to parse local storage practice logs:", e);
                }

                setLocalFilesCount(localCounts);
            } catch (err) {
                console.error("Failed to load performance data:", err);
                toast.error("Could not load your performance records.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // ── DATA PREPARATION & CALCULATIONS ────────────────────────────────

    // 1. Practice tools statistics
    const practiceStats = useMemo(() => {
        const cloudCountForTool = (toolType) => {
            return cloudFiles.filter(f => f.toolType === toolType).length;
        };

        return [
            {
                title: "Screenshot Tool",
                icon: Camera,
                count: localFilesCount.screenshots + cloudCountForTool('screenshot'),
                color: "text-indigo-600 bg-indigo-50 border-indigo-100",
                path: "/student/practice-tools/screenshot"
            },
            {
                title: "Screen Recorder",
                icon: Video,
                count: localFilesCount.screenRecordings + cloudCountForTool('screen-recorder'),
                color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                path: "/student/practice-tools/screen-recorder"
            },
            {
                title: "Voice Recorder",
                icon: Mic,
                count: localFilesCount.audios + cloudCountForTool('voice-recorder'),
                color: "text-blue-600 bg-blue-50 border-blue-100",
                path: "/student/practice-tools/voice-recorder"
            },
            {
                title: "Video Recorder",
                icon: MonitorPlay,
                count: localFilesCount.videos + cloudCountForTool('video-recorder'),
                color: "text-purple-600 bg-purple-50 border-purple-100",
                path: "/student/practice-tools/video-recorder"
            },
            {
                title: "Web-Calling Tool",
                icon: Phone,
                count: localFilesCount.calls + cloudCountForTool('web-calling'),
                color: "text-pink-600 bg-pink-50 border-pink-100",
                path: "/student/practice-tools/web-calling"
            }
        ];
    }, [cloudFiles, localFilesCount]);

    // 2. Active days (for attendance tracking)
    const activeDatesMap = useMemo(() => {
        const dates = {};

        // Submissions dates
        submissions.forEach(sub => {
            const dateStr = new Date(sub.submittedAt || sub.createdAt).toDateString();
            dates[dateStr] = { type: 'Submission', desc: `Submitted test: ${sub.test?.title || 'Test'}` };
        });

        // Cloud practice files dates
        cloudFiles.forEach(file => {
            const dateStr = new Date(file.createdAt).toDateString();
            dates[dateStr] = { type: 'Practice Tool', desc: `Uploaded ${file.filename} via ${file.toolType}` };
        });

        return dates;
    }, [submissions, cloudFiles]);

    const activeDaysCount = Object.keys(activeDatesMap).length;

    // 3. Dynamic Attendance Calculation
    // Establish a baseline attendance rate of 88% and add 2% bonus per active practice/test submission day (capped at 100%)
    const attendancePercentage = useMemo(() => {
        const baseline = 88;
        const bonus = activeDaysCount * 2;
        return Math.min(100, baseline + bonus);
    }, [activeDaysCount]);

    const attendanceStatus = useMemo(() => {
        if (attendancePercentage >= 95) return { label: 'Outstanding', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
        if (attendancePercentage >= 90) return { label: 'Good', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
        return { label: 'Needs Consistency', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }, [attendancePercentage]);

    // 4. Academic stats (scores & averages)
    const academicStats = useMemo(() => {
        const evaluated = submissions.filter(s => s.status === 'evaluated');
        let totalScored = 0;
        let totalMax = 0;

        evaluated.forEach(sub => {
            totalScored += sub.totalMarks || 0;
            // Get test max marks: sum question marks, fallback to 100 if questions are empty
            const maxMarks = sub.test?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;
            totalMax += maxMarks;
        });

        const percentage = totalMax > 0 ? Math.round((totalScored / totalMax) * 100) : 0;

        let grade = 'N/A';
        let feedback = 'Complete graded tests to see your report.';
        if (evaluated.length > 0) {
            if (percentage >= 90) {
                grade = 'A+';
                feedback = 'Exceptional performance! Keep up the excellent work.';
            } else if (percentage >= 80) {
                grade = 'A';
                feedback = 'Great job! You have demonstrated strong subject knowledge.';
            } else if (percentage >= 70) {
                grade = 'B';
                feedback = 'Good progress, with room to optimize scores.';
            } else if (percentage >= 60) {
                grade = 'C';
                feedback = 'Passing score. Review test remarks to improve.';
            } else {
                grade = 'D';
                feedback = 'Review course content and try practicing more tests.';
            }
        }

        return {
            evaluatedCount: evaluated.length,
            percentage,
            grade,
            feedback,
            totalScored,
            totalMax
        };
    }, [submissions]);

    // 5. Subject wise analysis
    const subjectWisePerformance = useMemo(() => {
        const subjectsMap = {};

        submissions.forEach(sub => {
            const subject = sub.test?.subject || 'General';
            const isEvaluated = sub.status === 'evaluated';

            if (!subjectsMap[subject]) {
                subjectsMap[subject] = {
                    totalTests: 0,
                    evaluatedCount: 0,
                    scoredPoints: 0,
                    maxPoints: 0
                };
            }

            subjectsMap[subject].totalTests += 1;
            if (isEvaluated) {
                subjectsMap[subject].evaluatedCount += 1;
                subjectsMap[subject].scoredPoints += sub.totalMarks || 0;
                const testMax = sub.test?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;
                subjectsMap[subject].maxPoints += testMax;
            }
        });

        return Object.keys(subjectsMap).map(subject => {
            const data = subjectsMap[subject];
            const percent = data.maxPoints > 0 ? Math.round((data.scoredPoints / data.maxPoints) * 100) : null;
            return {
                name: subject,
                totalTests: data.totalTests,
                percent,
                evaluatedCount: data.evaluatedCount
            };
        });
    }, [submissions]);

    // 6. Test submission list filter groups
    const submissionMap = useMemo(() => {
        const map = new Map();
        submissions.forEach(sub => {
            const testId = sub.test?._id || sub.test;
            if (testId) map.set(testId, sub);
        });
        return map;
    }, [submissions]);

    const filteredTests = useMemo(() => {
        const graded = [];
        const pending = [];
        const unattempted = [];

        tests.forEach(test => {
            const sub = submissionMap.get(test._id);
            if (sub) {
                if (sub.status === 'evaluated') {
                    graded.push({ test, submission: sub });
                } else {
                    pending.push({ test, submission: sub });
                }
            } else {
                unattempted.push(test);
            }
        });

        return { graded, pending, unattempted };
    }, [tests, submissionMap]);

    // 7. Recent 7 days attendance log
    const attendanceLogs = useMemo(() => {
        const logs = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const activity = activeDatesMap[dateStr];

            logs.push({
                date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }),
                status: activity ? 'Present' : 'Absent',
                description: activity ? activity.desc : 'Self-study / No system logs'
            });
        }
        return logs;
    }, [activeDatesMap]);

    if (loading) {
        return (
            <DashboardLayout role="Student" fullWidth={true}>
                <LoadingPlaceholder type="dashboard" />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="space-y-8 font-sans max-w-7xl mx-auto pb-12">

                {/* ── HEADER ROW ───────────────────────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                            <Activity className="text-indigo-600 animate-pulse" size={26} />
                            My Performance Dashboard
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Track your class attendance, academic test scores, and tool practice statistics.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-2xl text-xs font-black shadow-sm">
                            Subject: {profile?.studentProfile?.subject || 'N/A'}
                        </span>
                        <span className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl text-xs font-bold shadow-sm">
                            Course: {profile?.studentProfile?.course?.name || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* ── METRICS GRID ─────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* CARD 1: Attendance Rate */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">LMS Attendance</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${attendanceStatus.color}`}>
                                    {attendanceStatus.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-6 my-2">
                                {/* Circular SVG Indicator */}
                                <div className="relative w-20 h-20 shrink-0">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path
                                            className="text-slate-100"
                                            strokeWidth="3.5"
                                            stroke="currentColor"
                                            fill="transparent"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            className="text-indigo-600 transition-all duration-1000 ease-out"
                                            strokeWidth="3.5"
                                            strokeDasharray={`${attendancePercentage}, 100`}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-base font-black text-slate-800">{attendancePercentage}%</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-slate-800">{activeDaysCount} Days</h4>
                                    <p className="text-slate-500 text-xs font-semibold uppercase mt-0.5">Active Workspace Logs</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                            <Info size={14} className="text-indigo-500 shrink-0" />
                            <p className="text-[11px] text-slate-500 font-medium">
                                Calculated from test submissions and workspace practice sessions.
                            </p>
                        </div>
                    </div>

                </div>

                {/* ── ERP FEE ACCOUNTING & LEDGER ────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden text-left animate-fade-in">
                    <div className="border-b border-slate-100 p-6 bg-slate-50/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-sm">
                                <CreditCard size={18} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">ERP Financial Ledger & Accounting</h3>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Semester fee transactions and official receipts</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-655">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Account Status: <span className="text-emerald-700 font-black">CLEARED</span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Summary Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                                <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">Total Semester Fee</span>
                                <h4 className="text-xl font-black text-slate-800 mt-2">₹48,500</h4>
                                <span className="text-[9px] text-slate-400 font-semibold mt-1">Course: BCA / Semester V</span>
                            </div>
                            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                                <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Total Amount Paid</span>
                                <h4 className="text-xl font-black text-emerald-800 mt-2">₹48,500</h4>
                                <span className="text-[9px] text-emerald-600/80 font-semibold mt-1">100% Cleared on 18 Jan 2026</span>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                                <span className="text-slate-455 text-[10px] font-bold uppercase tracking-wider">Outstanding Dues</span>
                                <h4 className="text-xl font-black text-slate-800 mt-2">₹0</h4>
                                <span className="text-[9px] text-emerald-600 font-extrabold mt-1">No pending dues found</span>
                            </div>
                        </div>

                        {/* Fee Allocation Meter */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                <span>Fee Structure breakdown</span>
                                <span>Total: ₹48,500</span>
                            </div>
                            <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                                <div className="h-full bg-indigo-500" style={{ width: '86.6%' }} title="Tuition Fee: ₹42,000 (86.6%)" />
                                <div className="h-full bg-teal-500" style={{ width: '7.2%' }} title="Lab & Internet Fee: ₹3,500 (7.2%)" />
                                <div className="h-full bg-purple-500" style={{ width: '6.2%' }} title="Exam & Library Fee: ₹3,000 (6.2%)" />
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-505 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Tuition Fee (₹42,000)
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Lab & Internet Fee (₹3,500)
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Exam & Library Fee (₹3,000)
                                </div>
                            </div>
                        </div>

                        {/* Transactions Ledger Table */}
                        <div className="space-y-3">
                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Official Receipts & Transactions</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-left bg-slate-50/50">
                                            <th className="py-2.5 px-3">Receipt No</th>
                                            <th className="py-2.5 px-3">Date</th>
                                            <th className="py-2.5 px-3">Category</th>
                                            <th className="py-2.5 px-3 text-right">Amount</th>
                                            <th className="py-2.5 px-3">Payment Mode</th>
                                            <th className="py-2.5 px-3 text-center">Status</th>
                                            <th className="py-2.5 px-3 text-center">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                        {[
                                            { receipt: 'ERP/REC/2026/1024', date: '15 Jan 2026', category: 'Tuition Fee', amount: '₹42,000', mode: 'Net Banking', status: 'SUCCESS' },
                                            { receipt: 'ERP/REC/2026/1089', date: '16 Jan 2026', category: 'Lab & Internet Fee', amount: '₹3,500', mode: 'UPI / GPay', status: 'SUCCESS' },
                                            { receipt: 'ERP/REC/2026/1105', date: '18 Jan 2026', category: 'Exam & Library Fee', amount: '₹3,000', mode: 'Credit Card', status: 'SUCCESS' }
                                        ].map((tx, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{tx.receipt}</td>
                                                <td className="py-3 px-3 text-slate-500">{tx.date}</td>
                                                <td className="py-3 px-3 text-slate-800">{tx.category}</td>
                                                <td className="py-3 px-3 text-right font-black text-slate-850">{tx.amount}</td>
                                                <td className="py-3 px-3 text-slate-500">{tx.mode}</td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-black rounded-lg text-[9px]">
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <button
                                                        onClick={() => toast.success(`Downloading PDF Receipt ${tx.receipt}...`)}
                                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-850 underline uppercase tracking-wider"
                                                    >
                                                        Download
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default StudentPerformance;
