import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Compass, 
    BookOpen, 
    FileText, 
    HelpCircle, 
    CheckCircle, 
    X, 
    Clock, 
    Sparkles, 
    LogOut, 
    MessageSquare, 
    AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const GuestDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [simulatorTab, setSimulatorTab] = useState('dashboard');
    const [mockTestStarted, setMockTestStarted] = useState(false);
    const [mockTestSubmitted, setMockTestSubmitted] = useState(false);
    const [selectedMockAnswer, setSelectedMockAnswer] = useState('');
    const [mockTestScore, setMockTestScore] = useState(null);

    const simulatorCourse = user?.guestProfile?.demoCourse?.name || "Full Stack Web Development";
    const simulatorInstitute = user?.institute?.name || "Digital Study Academy";
    const isExpired = user?.guestProfile?.demoExpiryDate 
        ? new Date(user.guestProfile.demoExpiryDate) < new Date() 
        : false;

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logged out successfully");
            navigate('/');
        } catch (error) {
            toast.error("Failed to log out");
        }
    };

    if (isExpired) {
        return (
            <div className="min-h-screen w-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
                <div className="bg-white rounded-[32px] border border-slate-150 p-8 md:p-12 max-w-lg w-full text-center shadow-xl space-y-6 animate-fade-in">
                    <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-md">
                        <Clock size={40} className="animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-150 px-3 py-1 rounded-full uppercase tracking-wider">
                            Trial Expired
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-3">Demo Period Ended</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-sans mt-1">
                            Dear <span className="font-extrabold text-slate-700">{user?.name}</span>, your demo trial period for the course <span className="font-extrabold text-indigo-650">{simulatorCourse}</span> at <span className="font-extrabold text-indigo-650">{simulatorInstitute}</span> has expired.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 text-left space-y-1 text-[11px] font-semibold text-slate-650 font-sans">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Trial Length:</span>
                            <span className="text-slate-700">{user?.guestProfile?.demoDuration || 1} Day(s)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Expired On:</span>
                            <span className="text-slate-700">{new Date(user?.guestProfile?.demoExpiryDate).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <p className="text-[10px] text-slate-400">
                            Please contact the institute administration to upgrade to a regular student account or extend your trial.
                        </p>
                        <button
                            onClick={handleLogout}
                            className="w-full py-3.5 bg-[#0b1329] hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer border-none"
                        >
                            <LogOut size={14} />
                            Log Out & Exit
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen bg-[#f8fafc] flex flex-col md:flex-row overflow-hidden text-slate-800 font-sans">
            {/* SIDEBAR */}
            <div className="w-full md:w-64 bg-[#0b1329] text-slate-350 p-6 flex flex-col justify-between border-r border-slate-850 shrink-0">
                <div className="space-y-8">
                    {/* Sidebar branding */}
                    <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
                            G
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-extrabold text-white tracking-wide truncate">Guest Portal</span>
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded w-fit mt-0.5">Demo Mode</span>
                        </div>
                    </div>

                    {/* Nav Menu */}
                    <nav className="space-y-1.5">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: Compass },
                            { id: 'courses', label: 'My Courses', icon: BookOpen },
                            { id: 'tests', label: 'Online Exams', icon: FileText },
                            { id: 'helpdesk', label: 'Helpdesk Support', icon: HelpCircle }
                        ].map((item) => {
                            const IconComponent = item.icon;
                            const isActive = simulatorTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setSimulatorTab(item.id);
                                        setMockTestStarted(false);
                                    }}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'hover:bg-slate-800/40 text-slate-450 hover:text-slate-200'
                                    }`}
                                >
                                    <IconComponent size={16} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="space-y-4">
                    {/* User profile card & Logout */}
                    <div className="p-3.5 bg-slate-900/50 rounded-2xl border border-slate-800/60 flex items-center justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-white truncate">{user?.name || 'Guest User'}</span>
                            <span className="text-[10px] text-slate-450 truncate">{user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-450 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                            title="Log Out"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>

                    <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                            <Sparkles size={12} />
                            <span>Preview Sandbox</span>
                        </div>
                        <p className="text-[10px] text-slate-450 leading-relaxed">
                            This simulates a student's active dashboard environment. Try starting the **mock exam** to experience the test engine!
                        </p>
                    </div>
                </div>
            </div>

            {/* MAIN PANEL CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
                {/* Header */}
                <header className="bg-white border-b border-slate-100 py-5 px-6 md:px-8 flex items-center justify-between flex-shrink-0 shadow-sm">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Student Portal Sandbox</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Active Institute: <span className="font-extrabold text-indigo-650">{simulatorInstitute}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
                            Preview Mode
                        </span>
                    </div>
                </header>

                {/* Body Area */}
                <div className="flex-1 p-6 md:p-8">
                    {mockTestStarted ? (
                        /* ───── SIMULATED TEST ENVIRONMENT ───── */
                        <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 max-w-2xl mx-auto shadow-md animate-fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full">
                                        Mock Exam Sandbox
                                    </span>
                                    <h4 className="text-base font-extrabold text-slate-900 mt-1">Pre-Admission Aptitude Assessment</h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-500">Duration: 15 Mins</span>
                                </div>
                            </div>

                            {!mockTestSubmitted ? (
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-sans">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Question 1 of 1</span>
                                        <p className="text-sm font-bold text-slate-800 mt-1.5">
                                            Which of the following database query models allows counting documents based on a criteria in Mongoose?
                                        </p>
                                    </div>

                                    <div className="space-y-2.5">
                                        {[
                                            { key: 'A', text: 'findCountDocuments({})' },
                                            { key: 'B', text: 'countDocuments({})' },
                                            { key: 'C', text: 'aggregateCount({})' },
                                            { key: 'D', text: 'count({})' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.key}
                                                onClick={() => setSelectedMockAnswer(opt.key)}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl text-left text-xs font-semibold border transition-all ${
                                                    selectedMockAnswer === opt.key
                                                        ? 'bg-indigo-600/5 border-indigo-500 text-indigo-700 shadow-sm'
                                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                                }`}
                                            >
                                                <span>{opt.key}) {opt.text}</span>
                                                <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                                    selectedMockAnswer === opt.key
                                                        ? 'border-indigo-600 bg-indigo-600 text-white text-[9px]'
                                                        : 'border-slate-300'
                                                }`}>
                                                    {selectedMockAnswer === opt.key && '✓'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (!selectedMockAnswer) {
                                                toast.error("Please select an answer first");
                                                return;
                                            }
                                            setMockTestSubmitted(true);
                                            if (selectedMockAnswer === 'B') {
                                                setMockTestScore(1);
                                                toast.success("Correct answer selected!");
                                            } else {
                                                setMockTestScore(0);
                                                toast.error("Incorrect. The correct answer is B.");
                                            }
                                        }}
                                        className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-750 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-[0.98]"
                                    >
                                        Submit Exam
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-8 space-y-5">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white shadow-lg ${
                                        mockTestScore === 1 ? 'bg-emerald-500 shadow-emerald-200 animate-bounce' : 'bg-red-500 shadow-red-200'
                                    }`}>
                                        {mockTestScore === 1 ? <CheckCircle size={32} /> : <X size={32} />}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-black text-slate-800">
                                            {mockTestScore === 1 ? 'Excellent Job! 100% Score' : 'Oops! Exam Failed'}
                                        </h4>
                                        <p className="text-xs text-slate-555">
                                            Score achieved: {mockTestScore}/1 Points. {mockTestScore === 1 ? 'Your concepts are strong!' : 'Keep practicing and reading notes.'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2.5 max-w-sm mx-auto pt-4">
                                        <button
                                            onClick={() => {
                                                setMockTestSubmitted(false);
                                                setSelectedMockAnswer('');
                                                setMockTestScore(null);
                                            }}
                                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200"
                                        >
                                            Try Again
                                        </button>
                                        <button
                                            onClick={() => setMockTestStarted(false)}
                                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs rounded-xl transition-all"
                                        >
                                            Back to Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ───── TAB DISPLAY ───── */
                        <div className="animate-fade-in max-w-5xl mx-auto">
                            {simulatorTab === 'dashboard' && (
                                <div className="space-y-6">
                                    {/* Welcome banner */}
                                    <div className="bg-indigo-650 text-white rounded-3xl p-6 shadow-lg shadow-indigo-600/15 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                                        <div className="space-y-2 relative z-10 text-center sm:text-left">
                                            <h4 className="text-xl font-black">Welcome to your LMS Demo Portal!</h4>
                                            <p className="text-xs text-indigo-100 max-w-md leading-relaxed">
                                                Explore a customized virtual workspace mimicking what you will see as an active student of <span className="font-bold text-white">{simulatorInstitute}</span>.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSimulatorTab('courses')}
                                            className="px-4 py-2.5 bg-white text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-50 transition-all active:scale-95 flex-shrink-0"
                                        >
                                            Browse Course Modules
                                        </button>
                                    </div>

                                    {/* Stat cards grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Active Test Assignments</span>
                                                <h4 className="text-2xl font-black text-slate-900 mt-1">1</h4>
                                            </div>
                                            <div className="p-3 bg-orange-50 text-orange-500 rounded-xl">
                                                <Clock size={20} />
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Completed Assignments</span>
                                                <h4 className="text-2xl font-black text-slate-900 mt-1">{mockTestSubmitted && mockTestScore === 1 ? '1' : '0'}</h4>
                                            </div>
                                            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                                                <CheckCircle size={20} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dashboard grid layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Main widgets */}
                                        <div className="lg:col-span-2 space-y-4">
                                            {/* Mock upcoming exam */}
                                            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                                                <h4 className="font-extrabold text-sm text-slate-800">Your Upcoming Online Exams</h4>
                                                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-150 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center text-indigo-650 rounded-xl shadow-sm">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-slate-800 text-xs">Pre-Admission Aptitude Assessment</h5>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Duration: 15 mins &bull; 1 MCQ Query</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setMockTestStarted(true);
                                                            setMockTestSubmitted(false);
                                                            setSelectedMockAnswer('');
                                                            setMockTestScore(null);
                                                        }}
                                                        className="px-4 py-2 bg-[#0b1329] text-white hover:bg-slate-850 font-bold rounded-xl text-xs transition-all"
                                                    >
                                                        Start Test
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sidebar widgets */}
                                        <div className="space-y-4">
                                            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                                                <h4 className="font-extrabold text-sm text-slate-800">Assigned Faculty</h4>
                                                <div className="flex items-center gap-3 p-1">
                                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                        DS
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-xs text-slate-800">Faculty Coordinator</h5>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{simulatorInstitute}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {simulatorTab === 'courses' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col">
                                        <h4 className="text-base font-extrabold text-slate-900">Enrolled Course Modules</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">Active Demo Course: <span className="font-extrabold text-indigo-650">{simulatorCourse}</span></p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { title: "Introduction to HTML & CSS", duration: "Week 1-2", desc: "Learn the core markup and styling rules that build the web." },
                                            { title: "Javascript Programming Basics", duration: "Week 3-4", desc: "Gain familiarity with variables, logic structures, and ES6 functions." },
                                            { title: "React Frontend Framework", duration: "Week 5-7", desc: "Build modular interfaces using state, effects, and components." },
                                            { title: "Backend API Development with Express", duration: "Week 8-9", desc: "Build RESTful APIs and set up database storage with MongoDB." }
                                        ].map((m, i) => (
                                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3 hover:border-indigo-150 transition-all flex flex-col justify-between">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="text-[10px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                            {m.duration}
                                                        </span>
                                                    </div>
                                                    <h5 className="font-extrabold text-slate-800 text-sm mt-1">{m.title}</h5>
                                                    <p className="text-xs text-slate-500 leading-relaxed font-sans">{m.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => toast.success("Access denied in Sandbox preview mode")}
                                                    className="w-full mt-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-750 font-bold text-xs rounded-xl transition-all border border-slate-150 flex items-center justify-center gap-1.5"
                                                >
                                                    <BookOpen size={13} />
                                                    View Study Materials
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {simulatorTab === 'tests' && (
                                <div className="space-y-6">
                                    <h4 className="text-base font-extrabold text-slate-900">Your Online Exam Center</h4>
                                    <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-sm">
                                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                            <div>
                                                <h5 className="font-extrabold text-slate-800 text-sm">Pre-Admission Aptitude Assessment</h5>
                                                <p className="text-[10px] text-slate-400 mt-0.5">MCQ Exam &bull; Single Question Demo</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                mockTestSubmitted
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-150'
                                                    : 'bg-orange-50 text-orange-600 border border-orange-150'
                                            }`}>
                                                {mockTestSubmitted ? 'Completed' : 'Pending'}
                                            </span>
                                        </div>
                                        <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">Topic:</span> Mongoose Database Queries</p>
                                                <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">Total Marks:</span> 1.00</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setMockTestStarted(true);
                                                    setMockTestSubmitted(false);
                                                    setSelectedMockAnswer('');
                                                    setMockTestScore(null);
                                                }}
                                                className="px-5 py-2.5 bg-indigo-650 text-white hover:bg-indigo-750 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                                            >
                                                {mockTestSubmitted ? 'Re-take Assessment' : 'Start Exam Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {simulatorTab === 'helpdesk' && (
                                <div className="space-y-6">
                                    <h4 className="text-base font-extrabold text-slate-900">Institute Helpdesk Support</h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                                            <h5 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                                                <MessageSquare size={16} className="text-indigo-600" />
                                                Submit Support Ticket
                                            </h5>
                                            <div className="space-y-3 font-sans">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Subject</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Query regarding fees, batch timing"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                                                    <textarea 
                                                        rows={4}
                                                        placeholder="Explain your query in detail..."
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all resize-none"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toast.success("Ticket submitted! (Simulated submission)")}
                                                    className="w-full py-3 bg-[#0b1329] text-white hover:bg-slate-850 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                >
                                                    Submit Ticket to Faculty
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4 h-fit">
                                            <h5 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                                                <AlertCircle size={16} className="text-amber-500" />
                                                Support Details
                                            </h5>
                                            <p className="text-xs text-slate-550 leading-relaxed font-sans">
                                                All support tickets are directed directly to the administrative coordinators at <span className="font-bold">{simulatorInstitute}</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuestDashboard;
