import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, Loader2, FileText, ArrowRight, CheckCircle, ClipboardCheck } from 'lucide-react';

const TakeTestPage = () => {
    const { id: testId } = useParams();
    const navigate = useNavigate();

    // Auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Test-check state
    const [checkState, setCheckState] = useState('idle'); // 'idle' | 'checking' | 'allowed' | 'submitted' | 'denied' | 'not_student'
    const [testTitle, setTestTitle] = useState('');
    const [denyReason, setDenyReason] = useState('');
    const [submissionId, setSubmissionId] = useState(null);

    // If user is already logged in, check assignment immediately
    useEffect(() => {
        const existing = localStorage.getItem('userInfo');
        if (existing) {
            const info = JSON.parse(existing);
            checkTestAssignment(info);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId]);

    const checkTestAssignment = async (userInfo) => {
        if (!userInfo?.token) return;

        // Only students can take tests via shared link
        if (userInfo.role !== 'Student') {
            setCheckState('not_student');
            return;
        }

        setCheckState('checking');
        try {
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            // Fetch the test details
            const testRes = await axios.get(`/api/tests/${testId}`, config);
            const test = testRes.data;
            setTestTitle(test.title || 'Test');

            // Fetch the student's assigned tests
            const testsRes = await axios.get('/api/tests', config);
            const assignedTests = testsRes.data;
            const isAssigned = assignedTests.some(t => t._id === testId);

            if (isAssigned) {
                // Check if already submitted
                const subsRes = await axios.get('/api/submissions', config);
                const alreadySubmitted = subsRes.data.some(s => {
                    const sid = s.test?._id || s.test;
                    return sid === testId;
                });

                if (alreadySubmitted) {
                    // Find the actual submission to get its _id for the results page
                    const submission = subsRes.data.find(s => {
                        const sid = s.test?._id || s.test;
                        return sid === testId;
                    });
                    setSubmissionId(submission?._id || null);
                    setCheckState('submitted');
                } else {
                    setCheckState('allowed');
                    // Short delay so user sees the success tick, then navigate
                    setTimeout(() => navigate(`/student/take-test/${testId}`), 900);
                }
            } else {
                setDenyReason('This test has not been assigned to you.');
                setCheckState('denied');
            }
        } catch (err) {
            console.error('[TakeTestPage] Error checking assignment:', err);
            setDenyReason(err.response?.data?.message || 'Could not verify test access. Please try again.');
            setCheckState('denied');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const { data } = await axios.post('/api/auth/login', { email, password });
            localStorage.setItem('userInfo', JSON.stringify(data));
            await checkTestAssignment(data);
        } catch (err) {
            setLoginError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoginLoading(false);
        }
    };

    const isLoggedIn = !!localStorage.getItem('userInfo');

    // ── Render States ────────────────────────────────────────────────────────

    if (checkState === 'checking') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Verifying Access…</h2>
                    <p className="text-slate-500 text-sm">Checking if this test is assigned to you.</p>
                </div>
            </div>
        );
    }

    if (checkState === 'allowed') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} className="text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Granted!</h2>
                    <p className="text-slate-500 text-sm">Redirecting you to <span className="font-bold text-slate-700">{testTitle}</span>…</p>
                    <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full animate-[grow_0.9s_ease-out_forwards]" />
                    </div>
                </div>
                <style>{`@keyframes grow { from { width: 0; } to { width: 100%; } }`}</style>
            </div>
        );
    }

    if (checkState === 'submitted') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ClipboardCheck size={32} className="text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Already Submitted</h2>
                    <p className="text-slate-500 text-sm mb-2">
                        You have already submitted <span className="font-bold text-slate-700">{testTitle}</span>.
                    </p>
                    <p className="text-slate-400 text-xs mb-8">Would you like to see how you did?</p>
                    <div className="flex flex-col gap-3">
                        {submissionId && (
                            <button
                                onClick={() => navigate(`/student/test-result/${submissionId}`)}
                                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <ClipboardCheck size={18} /> View My Results
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/student/tests')}
                            className="w-full py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-all text-sm"
                        >
                            Back to My Tests
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (checkState === 'denied') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} className="text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-500 text-sm mb-8">{denyReason}</p>
                    <button
                        onClick={() => navigate('/student/tests')}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                    >
                        Go to My Tests
                    </button>
                </div>
            </div>
        );
    }

    if (checkState === 'not_student') {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={32} className="text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Students Only</h2>
                    <p className="text-slate-500 text-sm mb-8">
                        You are logged in as <span className="font-bold text-slate-700">{userInfo.name}</span> ({userInfo.role}).
                        This link is intended for students to attempt their assigned tests.
                    </p>
                    <button
                        onClick={() => navigate(`/${userInfo.role?.toLowerCase()}`)}
                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Default: show login form (unauthenticated)
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
            <div className="flex w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[560px]">

                {/* Left branding panel */}
                <div className="hidden md:flex flex-col justify-center items-center w-2/5 bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=60')", backgroundSize: 'cover' }} />
                    <div className="relative z-10 text-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <FileText size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black mb-3 tracking-tight">LMS<span className="text-indigo-200">Portal</span></h1>
                        <p className="text-indigo-200 text-sm leading-relaxed">Sign in with your student credentials to access the test shared with you.</p>
                    </div>
                </div>

                {/* Right form panel */}
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-1">
                            <GraduationCap size={20} className="text-indigo-600" />
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">LMS Portal</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sign In to Attempt Test</h2>
                        <p className="text-slate-500 text-sm mt-1">A test has been shared with you. Log in to check if you can attempt it.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {loginError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200 flex items-center gap-2">
                                <AlertTriangle size={16} /> {loginError}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-60"
                        >
                            {loginLoading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>Sign In & Check Access <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TakeTestPage;
