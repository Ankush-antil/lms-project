import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Award, BarChart3, Calendar, CheckCircle2, Clock,
    FileText, Info, Mic, MonitorPlay, Phone,
    Star, TrendingUp, Trophy, Video, Camera, ArrowRight,
    AlertCircle, Sparkles, Activity, ShieldCheck, ChevronRight,
    RefreshCw, CreditCard, Upload, X
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
        calls: 0,
        fileUploads: 0
    });
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('graded'); // 'graded' | 'pending' | 'unattempted'
    const [notesCount, setNotesCount] = useState(0);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedNotes, setSelectedNotes] = useState(null);

    // College ERP Integration Mock States
    const [isSyncing, setIsSyncing] = useState(false);
    const [localErpPresent, setLocalErpPresent] = useState(null);
 
    const physicalAttendanceList = profile?.studentProfile?.physicalAttendance || [];
    
    // Dynamic calculations from database attendance records
    const erpPresent = attendanceRecords.length > 0 
        ? attendanceRecords.filter(a => a.status === 'Present' || a.status === 'In').length 
        : (localErpPresent !== null ? localErpPresent : (physicalAttendanceList.length > 0 ? physicalAttendanceList.filter(a => a.status === 'Present').length : 42));
    const erpTotal = attendanceRecords.length > 0 
        ? attendanceRecords.length 
        : (physicalAttendanceList.length > 0 ? physicalAttendanceList.length : 50);
 
    const handleSyncERP = () => {
        setIsSyncing(true);
        const loadingToast = toast.loading("Syncing data with College ERP Server...");
 
        setTimeout(() => {
            toast.dismiss(loadingToast);
            // Randomly update attendance slightly to simulate live sync
            const randomAdd = Math.floor(Math.random() * 3) - 1; // -1, 0, 1, or 2
            const newPresent = Math.min(erpTotal, Math.max(35, erpPresent + randomAdd));
            setLocalErpPresent(newPresent);
 
            toast.success("ERP Attendance and Fees records synced successfully!");
            setIsSyncing(false);
        }, 1500);
    };
 
    // Calculate dynamic percentage
    const erpAttendancePercent = useMemo(() => {
        return Math.round((erpPresent / erpTotal) * 100);
    }, [erpPresent, erpTotal]);

    // Student Leave application states
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
    const [leaveNote, setLeaveNote] = useState('');
    const [leaveFile, setLeaveFile] = useState(null);
    const [submittingLeave, setSubmittingLeave] = useState(false);

    const fetchAllData = async () => {
        try {
            const [testsRes, subsRes, cloudRes, profileRes, notesRes, attendanceRes] = await Promise.all([
                axios.get('/api/tests'),
                axios.get('/api/submissions'),
                axios.get('/api/practice-files').catch(() => ({ data: { files: [] } })),
                axios.get('/api/users/profile'),
                axios.get('/api/notes').catch(() => ({ data: [] })),
                axios.get('/api/attendance/my-records').catch(() => ({ data: [] }))
            ]);

            setTests(testsRes.data || []);
            setSubmissions(subsRes.data || []);
            setCloudFiles(cloudRes.data?.files || []);
            setProfile(profileRes.data || null);
            setNotesCount(notesRes.data?.length || 0);
            setAttendanceRecords(attendanceRes.data || []);

            // Load local storage counts
            const localCounts = {
                screenshots: 0,
                screenRecordings: 0,
                audios: 0,
                videos: 0,
                calls: 0,
                fileUploads: 0
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

                const fu = localStorage.getItem('practice_file_uploads');
                if (fu) localCounts.fileUploads = JSON.parse(fu).length || 0;
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

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        if (!leaveDate) {
            toast.error("Please select a date.");
            return;
        }
        if (!leaveNote.trim()) {
            toast.error("Please write a leave note explaining the reason.");
            return;
        }

        try {
            setSubmittingLeave(true);
            const formData = new FormData();
            formData.append('date', leaveDate);
            formData.append('leaveNote', leaveNote.trim());
            if (leaveFile) {
                formData.append('leaveFile', leaveFile);
            }

            await axios.post('/api/attendance/leave-application', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Leave application submitted successfully!");
            setIsLeaveModalOpen(false);
            setLeaveNote('');
            setLeaveFile(null);
            await fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit leave application");
        } finally {
            setSubmittingLeave(false);
        }
    };

    // ── DATA PREPARATION & CALCULATIONS ────────────────────────────────

    // 1. Practice tools statistics
    const practiceStats = useMemo(() => {
        const cloudCountForTool = (toolType) => {
            return cloudFiles.filter(f => f.toolType === toolType).length;
        };

        return [
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
                title: "File Uploader",
                icon: Upload,
                count: localFilesCount.fileUploads + cloudCountForTool('file-uploader'),
                color: "text-amber-600 bg-amber-50 border-amber-100",
                path: "/student/practice-tools/file-uploader"
            },
            {
                title: "Notes Writing",
                icon: FileText,
                count: notesCount,
                color: "text-amber-500 bg-amber-50 border-amber-100",
                path: "/student/practice-tools/notes"
            },
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

    // Use dynamic database attendance records if they exist, otherwise fall back to demo records
    const displayAttendanceRecords = useMemo(() => {
        if (attendanceRecords && attendanceRecords.length > 0) {
            return attendanceRecords;
        }
        return [
            {
                _id: 'demo-att-1',
                date: new Date().toISOString(),
                checkInTime: new Date(new Date().setHours(9, 2, 0)).toISOString(),
                checkOutTime: new Date(new Date().setHours(10, 30, 0)).toISOString(),
                status: 'Present',
                session: {
                    subject: 'Cloud Computing & DevOps (CDA)',
                    teacher: { name: 'Dr. Vivek Sharma' }
                },
                checkInPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                checkOutPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
            },
            {
                _id: 'demo-att-2',
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                checkInTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
                checkOutTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
                status: 'Present',
                session: {
                    subject: 'Advanced Database Systems',
                    teacher: { name: 'Prof. Anjali Mehta' }
                },
                checkInPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
            },
            {
                _id: 'demo-att-3',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                checkInTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString(),
                checkOutTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 89 * 60 * 1000).toISOString(),
                status: 'Present',
                session: {
                    subject: 'Artificial Intelligence & ML',
                    teacher: { name: 'Dr. Rajesh Verma' }
                },
                checkInPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
                checkOutPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
            },
            {
                _id: 'demo-att-4',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'Absent',
                session: {
                    subject: 'Cyber Security & Forensic',
                    teacher: { name: 'Prof. Karan Malhotra' }
                }
            },
            {
                _id: 'demo-att-5',
                date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                checkInTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 - 2 * 60 * 1000).toISOString(),
                checkOutTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 88 * 60 * 1000).toISOString(),
                status: 'Present',
                session: {
                    subject: 'Mobile App Development',
                    teacher: { name: 'Dr. Vivek Sharma' }
                },
                checkInPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
            }
        ];
    }, [attendanceRecords]);

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
                        {profile?.studentProfile?.section && (
                            <span className="px-4 py-2 bg-violet-50 border border-violet-200 text-violet-750 rounded-2xl text-xs font-black shadow-sm flex items-center gap-1">
                                Section: {profile.studentProfile.section}
                            </span>
                        )}
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

                     {/* CARD 2: Physical Attendance */}
                     <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                         <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
 
                         <div>
                             <div className="flex justify-between items-center mb-4">
                                 <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Physical Attendance</span>
                                 <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider text-emerald-600 bg-emerald-50 border-emerald-200">
                                     Good
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
                                             className="text-emerald-600 transition-all duration-1000 ease-out"
                                             strokeWidth="3.5"
                                             strokeDasharray="84, 100"
                                             strokeLinecap="round"
                                             stroke="currentColor"
                                             fill="transparent"
                                             d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                         />
                                     </svg>
                                     <div className="absolute inset-0 flex items-center justify-center">
                                         <span className="text-base font-black text-slate-800">84%</span>
                                     </div>
                                 </div>
                                  <div>
                                      <h4 className="text-2xl font-black text-slate-800">{erpPresent} / {erpTotal} Days</h4>
                                      <p className="text-slate-500 text-xs font-semibold uppercase mt-0.5">Lectures Attended</p>
                                  </div>
                             </div>
                         </div>
 
                         <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                             <button
                                 onClick={() => setIsLeaveModalOpen(true)}
                                 className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-100 hover:-translate-y-0.5 cursor-pointer text-center"
                             >
                                 Apply for Leave
                             </button>
                         </div>
                     </div>
                  </div>
  
                  {/* ── PHYSICAL ATTENDANCE LOGS ────────────────── */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden text-left animate-fade-in">
                      <div className="border-b border-slate-100 p-6 bg-slate-50/40 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-100 shadow-sm">
                                  <Calendar size={18} />
                              </div>
                              <div>
                                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Physical Attendance Logs</h3>
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">History of physical classroom check-ins, check-outs, and verification selfies</p>
                              </div>
                          </div>
                      </div>
  
                      <div className="p-6">
                          {displayAttendanceRecords.length === 0 ? (
                              <div className="text-center py-8 text-slate-400">
                                  <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                                  <p className="font-bold text-sm">No live attendance logs found.</p>
                                  <p className="text-xs text-slate-500 mt-1">Scan QR codes on the mobile app to populate these records.</p>
                              </div>
                          ) : (
                              <div className="overflow-x-auto">
                                  <table className="w-full min-w-[700px] border-collapse text-xs">
                                      <thead>
                                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-left bg-slate-50/50">
                                              <th className="py-2.5 px-3">Date</th>
                                              <th className="py-2.5 px-3">Student Note</th>
                                              <th className="py-2.5 px-3">Teacher Note</th>
                                              <th className="py-2.5 px-3 text-center">Check-In</th>
                                              <th className="py-2.5 px-3 text-center">Check-Out</th>
                                              <th className="py-2.5 px-3 text-center">Selfie Verifications</th>
                                              <th className="py-2.5 px-3 text-center">Status</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                          {displayAttendanceRecords.map((record, idx) => {
                                              const status = record.status || 'Absent';
                                              let badgeClass = 'text-red-700 bg-red-50 border-red-150';
                                              if (status === 'Present') badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-150';
                                              else if (status === 'In') badgeClass = 'text-amber-700 bg-amber-50 border-amber-150';
  
                                              return (
                                                  <tr key={record._id || idx} className="hover:bg-slate-50/50 transition-colors">
                                                      <td className="py-3 px-3 text-slate-550">
                                                          {record.date ? new Date(record.date).toLocaleDateString('en-US', {
                                                              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                                          }) : ''}
                                                      </td>
                                                      <td className="py-3 px-3">
                                                          {record.studentNote ? (
                                                              <button
                                                                  onClick={() => setSelectedNotes({ title: 'Student Note', content: record.studentNote })}
                                                                  className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-755 border border-violet-150 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                                              >
                                                                  See Note
                                                              </button>
                                                          ) : (
                                                              <span className="text-slate-400 italic text-[10px] font-semibold">No Note</span>
                                                          )}
                                                      </td>
                                                      <td className="py-3 px-3">
                                                          {record.teacherNote ? (
                                                              <button
                                                                  onClick={() => setSelectedNotes({ title: 'Teacher Note', content: record.teacherNote })}
                                                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-755 border border-indigo-150 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                                              >
                                                                  See Note
                                                              </button>
                                                          ) : (
                                                              <span className="text-slate-400 italic text-[10px] font-semibold">No Note</span>
                                                          )}
                                                      </td>
                                                      <td className="py-3 px-3 text-center text-slate-600">
                                                          {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                      </td>
                                                      <td className="py-3 px-3 text-center text-slate-600">
                                                          {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                      </td>
                                                      <td className="py-3 px-3 text-center">
                                                          <div className="flex justify-center items-center gap-2">
                                                              {record.checkInPhoto && (
                                                                  <button
                                                                      onClick={() => setSelectedPhoto({
                                                                          title: 'Check-In Verification Selfie',
                                                                          url: record.checkInPhoto
                                                                      })}
                                                                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-150 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                                                  >
                                                                    Check-In
                                                                  </button>
                                                              )}
                                                              {record.checkOutPhoto && (
                                                                  <button
                                                                      onClick={() => setSelectedPhoto({
                                                                          title: 'Check-Out Verification Selfie',
                                                                          url: record.checkOutPhoto
                                                                      })}
                                                                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-150 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                                                  >
                                                                    Check-Out
                                                                  </button>
                                                              )}
                                                              {!record.checkInPhoto && !record.checkOutPhoto && (
                                                                  <span className="text-slate-400 text-[10px]">No Photo</span>
                                                              )}
                                                          </div>
                                                      </td>
                                                      <td className="py-3 px-3 text-center">
                                                          <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[10px] font-black tracking-wider ${badgeClass}`}>
                                                              {status === 'In' ? 'Checked-In' : status}
                                                          </span>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                               </div>
                          )}
                      </div>
                  </div>
            {/* Selfie Preview Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl max-w-sm w-full animate-scale-in">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{selectedPhoto.title}</h3>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="text-slate-400 hover:text-slate-655 p-1.5 rounded-full hover:bg-slate-100 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 flex items-center justify-center bg-slate-50/30">
                            <img
                                src={selectedPhoto.url}
                                alt="Verification Selfie"
                                className="w-64 h-64 rounded-2xl object-cover border border-slate-200 shadow-md bg-slate-100"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Notes Preview Modal */}
            {selectedNotes && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl max-w-sm w-full animate-scale-in">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{selectedNotes.title}</h3>
                            <button
                                onClick={() => setSelectedNotes(null)}
                                className="text-slate-455 hover:text-slate-655 p-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Content / Remarks</span>
                                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">
                                    {selectedNotes.content}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LEAVE APPLICATION MODAL ────────────────── */}
            {isLeaveModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden animate-fade-in">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                    <Calendar className="text-amber-500" size={22} />
                                    Apply for Leave
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">Submit your leave request to your teacher.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsLeaveModalOpen(false);
                                    setLeaveNote('');
                                    setLeaveFile(null);
                                }}
                                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-450 hover:bg-slate-100 transition-all font-black text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Leave Date</label>
                                <input
                                    type="date"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700 bg-white"
                                    value={leaveDate}
                                    onChange={e => setLeaveDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Reason / Leave Note</label>
                                <textarea
                                    rows={4}
                                    placeholder="Explain the reason for your leave..."
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 resize-none outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition bg-white"
                                    value={leaveNote}
                                    onChange={e => setLeaveNote(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Attachment (PDF/Image - optional)</label>
                                <div className="relative border border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={e => setLeaveFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-1.5">
                                        <Upload className="mx-auto text-slate-400" size={20} />
                                        <p className="text-[11px] text-slate-500 font-semibold">
                                            {leaveFile ? leaveFile.name : "Click to upload medical slip/document"}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Max Size: 5MB</p>
                                    </div>
                                </div>
                                {leaveFile && (
                                    <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2">
                                        <span className="text-[10px] text-amber-800 font-bold truncate max-w-[200px]">
                                            📎 {leaveFile.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setLeaveFile(null)}
                                            className="text-[10px] text-red-500 hover:text-red-700 font-black cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLeaveModalOpen(false);
                                        setLeaveNote('');
                                        setLeaveFile(null);
                                    }}
                                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingLeave}
                                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-60 flex items-center gap-1.5"
                                >
                                    {submittingLeave ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={12} /> Submitting...
                                        </>
                                    ) : (
                                        <>Submit Leave</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    </DashboardLayout>
    );
};

export default StudentPerformance;
