import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, Loader2, FileText, ArrowRight, CheckCircle, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import loginIllustration from '../login-illustration.png';

const TakeTestPage = () => {
    const { user, login } = useAuth();
    const userInfo = user;
    const { id: testId } = useParams();
    const navigate = useNavigate();

    // Form state
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
        if (user) {
            checkTestAssignment(user);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId, user]);

    const checkTestAssignment = async (userInfo) => {
        if (!userInfo) return;

        // Only students can take tests via shared link
        if (userInfo.role !== 'Student') {
            setCheckState('not_student');
            return;
        }

        setCheckState('checking');
        try {
            // Fetch the test details
            const testRes = await axios.get(`/api/tests/${testId}`);
            const test = testRes.data;
            setTestTitle(test.title || 'Test');

            // Fetch the student's assigned tests
            const testsRes = await axios.get('/api/tests');
            const assignedTests = testsRes.data;
            const isAssigned = assignedTests.some(t => t._id === testId);

                if (isAssigned) {
                // Check if activity is disabled
                const configRes = await axios.get('/api/users/activity-configs').catch(() => ({ data: [] }));
                const actConfigs = configRes.data || [];
                const isActivityDisabled = actConfigs.some(c => c.test === testId && c.disabled === true);
                if (isActivityDisabled) {
                    setDenyReason('This test has been disabled by your teacher.');
                    setCheckState('denied');
                    return;
                }

                // Check if already submitted (but not returned — returned tests can be redone)
                const subsRes = await axios.get('/api/submissions');
                const existingSubmission = subsRes.data.find(s => {
                    const sid = s.test?._id || s.test;
                    return sid === testId;
                });
                const alreadySubmitted = existingSubmission && (existingSubmission.status === 'submitted' || existingSubmission.status === 'evaluated');

                if (alreadySubmitted) {
                    // Find the actual submission to get its _id for the results page
                    setSubmissionId(existingSubmission?._id || null);
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
            const data = await login(email, password);
            await checkTestAssignment(data);
        } catch (err) {
            setLoginError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoginLoading(false);
        }
    };

    // ── Render States ────────────────────────────────────────────────────────

    if (checkState === 'checking') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#fafafa] via-white to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-[#0b1329]/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Loader2 size={32} className="text-[#0b1329] animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Verifying Access…</h2>
                    <p className="text-slate-500 text-sm">Checking if this test is assigned to you.</p>
                </div>
            </div>
        );
    }

    if (checkState === 'allowed') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-[#fafafa] flex items-center justify-center p-4">
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
            <div className="min-h-screen bg-gradient-to-br from-[#fafafa] via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-[#0b1329]/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ClipboardCheck size={32} className="text-[#0b1329]" />
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
                                className="w-full py-3.5 bg-[#0b1329] text-white font-bold rounded-xl hover:bg-[#152244] transition-all shadow-md flex items-center justify-center gap-2"
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
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-[#fafafa] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} className="text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-500 text-sm mb-8">{denyReason}</p>
                    <button
                        onClick={() => navigate('/student/tests')}
                        className="px-8 py-3 bg-[#0b1329] text-white font-bold rounded-xl hover:bg-[#152244] transition-all shadow-md"
                    >
                        Go to My Tests
                    </button>
                </div>
            </div>
        );
    }

    if (checkState === 'not_student') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-[#fafafa] flex items-center justify-center p-4">
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
                        className="w-full py-3 bg-[#0b1329] text-white font-bold rounded-xl hover:bg-[#152244] transition-all shadow-md"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Default: show login form (unauthenticated)
    return (
        <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-gradient-to-r from-[#fafafa] from-35% via-[#b8c5d6] to-[#0b1329] to-65% p-4 md:p-8">
            <div className="flex w-full max-w-5xl h-[85vh] max-h-[580px] bg-transparent rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200/50 relative">
                {/* Left Side - Form (Off-White Theme) */}
                <motion.div 
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-between h-full bg-[#fafafa]"
                >
                    <div>
                        {/* Title Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: -15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.4 }}
                            className="mb-8 mt-2"
                        >
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <GraduationCap size={16} className="text-[#0b1329]" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LMS Portal</span>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Sign In to Attempt Test</h2>
                            <p className="text-slate-500 mt-1 text-xs">A test has been shared with you. Log in to check if you can attempt it.</p>
                        </motion.div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {loginError && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs border border-red-200 flex items-center gap-2"
                                >
                                    <AlertTriangle size={14} /> {loginError}
                                </motion.div>
                            )}

                            {/* Email / Username field */}
                            <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25, duration: 0.4 }}
                                className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                            >
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-1 placeholder-slate-300"
                                    placeholder="Enter your email"
                                    required
                                />
                            </motion.div>

                            {/* Password field */}
                            <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.4 }}
                                className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                            >
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-1 pr-8 placeholder-slate-300"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 bottom-1.5 text-slate-400 hover:text-[#0b1329] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </motion.div>

                            {/* Login Button */}
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.4, type: 'spring', stiffness: 90 }}
                                type="submit"
                                disabled={loginLoading}
                                className="w-full bg-[#0b1329] hover:bg-[#152244] text-white font-medium py-3 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex justify-center items-center gap-2 mt-6 text-sm"
                            >
                                {loginLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>Sign In & Check Access <ArrowRight size={16} /></>
                                )}
                            </motion.button>
                        </form>
                    </div>

                    {/* Footer / Empty area to align with LoginPage */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                        className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100"
                    >
                        <span className="text-slate-400 text-xs">Need help? Contact your administrator.</span>
                    </motion.div>
                </motion.div>

                {/* Right Side - Brand/Illustration (Navy Blue Theme) */}
                <div className="hidden md:flex flex-col justify-between items-center w-1/2 bg-[#0b1329] p-8 md:p-10 h-full relative overflow-hidden">
                    {/* Soft transition border at the left edge to blend with the form side */}
                    <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-slate-500/10 to-transparent"></div>

                    {/* Visual waves / decoration circles */}
                    <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-2xl"></div>
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>

                    {/* Text Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 90 }}
                        className="relative z-10 text-center w-full mt-2"
                    >
                        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2 leading-tight drop-shadow-sm">
                            Welcome to LMS portal
                        </h1>
                        <p className="text-slate-300 text-xs font-medium opacity-90">
                            Login to access your account
                        </p>
                    </motion.div>

                    {/* Custom Illustration Image */}
                    <div className="w-full max-w-[320px] z-10 my-auto flex justify-center">
                        <motion.img 
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.6, type: 'spring', stiffness: 80 }}
                            src={loginIllustration}
                            alt="Student Portal Illustration"
                            className="w-full h-auto max-h-[260px] object-contain select-none pointer-events-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeTestPage;
