import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import loginIllustration from './login-illustration.png';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await login(email, password);

            // Redirect based on Role
            if (data.role === 'Admin') navigate('/admin');
            else if (data.role === 'Teacher') navigate('/teacher');
            else if (data.role === 'Student') navigate('/student/tests');
            else if (data.role === 'Editor') navigate('/editor');
            else if (data.role === 'Institute') navigate('/institute');
            else if (data.role === 'Accountant') navigate('/accountant');
            else if (data.role === 'Marketer') navigate('/marketer');
            else if (data.role === 'Staff') navigate('/admin');
            else if (data.role === 'Parent') navigate('/parent');
            else if (data.role === 'Guest') navigate('/guest');

            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-r from-[#fafafa] from-35% via-[#b8c5d6] to-[#0b1329] to-65% p-4 md:p-8">
            <div className="flex w-full max-w-5xl h-auto md:h-[85vh] md:max-h-[580px] bg-transparent rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200/50 relative">
                {/* Left Side - Form (Off-White Theme) */}
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-between h-full bg-[#f1f5f9] min-h-[420px]"
                >
                    <div>
                        {/* Title Section */}
                        <motion.div
                            initial={{ opacity: 0, y: -15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.4 }}
                            className="mb-8 mt-2"
                        >
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Login</h2>
                            <p className="text-slate-500 mt-1.5 text-xs">Enter your account details</p>
                        </motion.div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs border border-red-200"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Email / Username field */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25, duration: 0.4 }}
                                className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                            >
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Username</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                            {/* Forgot Password Link */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.45, duration: 0.3 }}
                                className="flex justify-between items-center mt-1"
                            >
                                <a href="#" className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors font-medium">
                                    Forgot Password?
                                </a>
                            </motion.div>

                            {/* Login Button */}
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.4, type: 'spring', stiffness: 90 }}
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#0b1329] hover:bg-[#152244] text-white font-medium py-3 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex justify-center items-center mt-6 text-sm"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    "Login"
                                )}
                            </motion.button>
                        </form>
                    </div>

                    {/* Footer / Sign up link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                        className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100"
                    >
                        <span className="text-slate-400 text-xs">Don't have an account?</span>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="bg-[#f1f5f9] text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 px-4 py-1.5 rounded-lg text-xs transition-all font-medium"
                        >
                            Sign up
                        </button>
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

                    {/* Privacy Policy & Proprietary Notice */}
                    <div className="z-10 mt-auto pt-4 text-center px-4">
                        <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[11px] font-bold text-slate-300 hover:text-white transition-colors underline block mb-2">
                            Privacy Policy
                        </a>
                        <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                            DS Notebook and Digital Study Academy are proprietary educational software and brands. Unauthorized copying, reproduction, reverse engineering, redistribution, or commercial use is strictly prohibited.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
