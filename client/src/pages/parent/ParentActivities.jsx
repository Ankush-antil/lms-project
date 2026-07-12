import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, FileText, CheckCircle, Clock, Eye, ShieldAlert, Award, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ParentActivities = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentProfile, setStudentProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'

    const studentId = user?.parentProfile?.student?._id || user?.parentProfile?.student;

    useEffect(() => {
        const fetchData = async () => {
            if (!studentId) {
                setLoading(false);
                return;
            }
            try {
                const [testsRes, subsRes, profileRes] = await Promise.all([
                    axios.get('/api/tests'),
                    axios.get('/api/submissions'),
                    axios.get(`/api/users/view/${studentId}`)
                ]);
                setTests(testsRes.data || []);
                setSubmissions(subsRes.data || []);
                setStudentProfile(profileRes.data);
            } catch (err) {
                console.error("Error fetching child's activities:", err);
                toast.error("Failed to load activities");
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

    const submittedTestIds = new Set(submissions.map(s => s.test?._id || s.test));
    
    // Filter tests that are not submitted
    const upcomingTests = tests.filter(t => !submittedTestIds.has(t._id) && 
        (t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
         t.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Filter submissions
    const completedSubmissions = submissions.filter(sub => 
        (sub.test?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.test?.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <div className="max-w-5xl mx-auto space-y-6 pb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Student Activities</h1>
                        <p className="text-slate-500">Monitor academic assessments, tests and test scores for {studentProfile?.name}.</p>
                    </div>
                </div>

                {/* Tabs & Search */}
                <div className="bg-white border border-slate-150 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                activeTab === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Upcoming ({upcomingTests.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                activeTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Completed ({completedSubmissions.length})
                        </button>
                    </div>

                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by title, subject..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                        />
                    </div>
                </div>

                {/* List Body */}
                <div className="space-y-4 animate-fade-in">
                    {activeTab === 'upcoming' ? (
                        upcomingTests.length === 0 ? (
                            <div className="bg-white border border-slate-150 rounded-3xl p-12 text-center shadow-sm">
                                <Clock size={36} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="font-bold text-slate-800 text-sm">No Pending Tests</h3>
                                <p className="text-slate-450 text-xs mt-1 font-bold">Your child has completed all assigned tests or none have been assigned yet.</p>
                            </div>
                        ) : (
                            upcomingTests.map(test => (
                                <div key={test._id} className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm hover:border-indigo-150 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 border border-slate-150 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                            <FileText size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-slate-850 text-sm">{test.title}</h4>
                                            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-450 mt-1 font-bold">
                                                <span>Subject: {test.subject}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>Duration: {test.settings?.duration || 60} mins</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>Created by: {test.createdBy?.name || 'Instructor'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1.5 bg-orange-50 text-orange-650 rounded-xl text-xs font-black uppercase tracking-wider border border-orange-100">
                                        Pending
                                    </span>
                                </div>
                            ))
                        )
                    ) : (
                        completedSubmissions.length === 0 ? (
                            <div className="bg-white border border-slate-150 rounded-3xl p-12 text-center shadow-sm">
                                <CheckCircle size={36} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="font-bold text-slate-800 text-sm">No Submissions Yet</h3>
                                <p className="text-slate-450 text-xs mt-1 font-bold">Your child has not submitted any assessments yet.</p>
                            </div>
                        ) : (
                            completedSubmissions.map(sub => (
                                <div key={sub._id} className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm hover:border-indigo-150 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 border border-slate-150 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-slate-850 text-sm">{sub.test?.title}</h4>
                                            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-450 mt-1 font-bold">
                                                <span>Subject: {sub.test?.subject}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>Status: <span className="text-emerald-600 uppercase font-black">{sub.status}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                        {sub.score !== undefined ? (
                                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">
                                                <Award size={14} />
                                                <span className="text-xs font-black">{sub.score} / {sub.totalScore || 100}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                                                Awaiting Evaluation
                                            </span>
                                        )}
                                        <button
                                            onClick={() => navigate(`/student/test-result/${sub._id}`)}
                                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                            <Eye size={12} />
                                            <span>View Report</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ParentActivities;
