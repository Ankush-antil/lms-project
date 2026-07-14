import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { BookOpen, Clock, FileText, CheckCircle, User, Award, ShieldAlert } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-1">{value}</h3>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
    </div>
);

const ParentDashboard = () => {
    const { user } = useAuth();
    const [studentProfile, setStudentProfile] = useState(null);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const studentId = user?.parentProfile?.student?._id || user?.parentProfile?.student;

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!studentId) {
                    setLoading(false);
                    return;
                }

                const [profileRes, testsRes, subsRes] = await Promise.all([
                    axios.get(`/api/users/view/${studentId}`),
                    axios.get(`/api/tests`),
                    axios.get(`/api/submissions`)
                ]);

                setStudentProfile(profileRes.data);
                setTests(testsRes.data);
                setSubmissions(subsRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching child's dashboard data:", error);
                setLoading(false);
            }
        };
        fetchData();
    }, [studentId]);

    if (loading) return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <LoadingPlaceholder type="dashboard" />
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

    const submittedTestIds = new Set(submissions.map(s => s.test?._id || s.test));
    const pendingTests = tests.filter(t => !submittedTestIds.has(t._id));
    const completedTests = tests.filter(t => submittedTestIds.has(t._id));
    const recentSubmissions = submissions.slice(0, 5);

    return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Parent Dashboard</h1>
                    <p className="text-slate-500">Welcome, {user?.name}! Track your child, {studentProfile?.name}'s activities.</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold shadow-sm border border-indigo-100">
                        {studentProfile?.studentProfile?.subject || 'No Subject Assigned'}
                    </span>
                    <span className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold shadow-sm">
                        {studentProfile?.studentProfile?.course?.name || studentProfile?.studentProfile?.course || 'No Course'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StatCard title="Child's Pending Tests" value={pendingTests.length} icon={Clock} color="bg-orange-500 text-orange-500" />
                <StatCard title="Child's Completed Tests" value={completedTests.length} icon={CheckCircle} color="bg-emerald-500 text-emerald-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Child's recent submissions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Child's Recent Submissions</h3>
                        </div>
                        <div className="space-y-4">
                            {recentSubmissions.length > 0 ? recentSubmissions.map((sub) => (
                                <div key={sub._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-650 shadow-sm">
                                            <FileText size={22} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-850">{sub.test?.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <span>Subject: {sub.test?.subject}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>Status: <span className="font-extrabold text-emerald-600 uppercase">{sub.status}</span></span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {sub.score !== undefined && (
                                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
                                            <Award size={14} />
                                            <span className="text-xs font-black">{sub.score} / {sub.totalScore || 100}</span>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-10">
                                    <p className="text-slate-450 italic font-semibold">No recent submissions found for your child.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Card / Syllabus */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-indigo-50 overflow-hidden">
                                {studentProfile?.avatar ? (
                                    <img src={studentProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    studentProfile?.name?.[0]?.toUpperCase()
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">{studentProfile?.name}</h2>
                            <span className="text-sm text-slate-500">Student Account: {studentProfile?.email}</span>

                            <div className="w-full mt-8 space-y-4">
                                <div className="flex justify-between text-sm items-center p-3 bg-slate-50 rounded-xl">
                                    <span className="text-slate-500">Batch / Session</span>
                                    <span className="font-bold text-slate-700">{studentProfile?.studentProfile?.batch || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center p-3 bg-slate-50 rounded-xl">
                                    <span className="text-slate-500">Section</span>
                                    <span className="font-bold text-indigo-700">Section {studentProfile?.studentProfile?.section || 'A'}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center p-3 bg-slate-50 rounded-xl">
                                    <span className="text-slate-500">Enrollment Date</span>
                                    <span className="font-bold text-slate-700">
                                        {studentProfile?.studentProfile?.enrollmentDate ? new Date(studentProfile.studentProfile.enrollmentDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Course Syllabus */}
                    {studentProfile?.studentProfile?.course?.subjects && studentProfile.studentProfile.course.subjects.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 text-slate-800">
                                <BookOpen size={18} className="text-indigo-600" />
                                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 font-bold">Child's Syllabus</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {studentProfile.studentProfile.course.subjects
                                    .filter(sub => {
                                        if (!studentProfile?.studentProfile?.subject) return true;
                                        return studentProfile.studentProfile.subject.split(',').map(s => s.trim().toLowerCase()).includes(sub.trim().toLowerCase());
                                    })
                                    .map((sub, i) => {
                                        return (
                                            <div 
                                                key={i} 
                                                className="px-3 py-2 rounded-xl text-xs font-bold border transition-all bg-indigo-50 border-indigo-250 text-indigo-700"
                                            >
                                                {sub}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ParentDashboard;
