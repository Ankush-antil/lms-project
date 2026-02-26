import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, ArrowLeft, GraduationCap, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';

const NotFoundPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canvasRef = useRef(null);

    // Animated floating particles background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const particles = Array.from({ length: 40 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            dx: (Math.random() - 0.5) * 0.6,
            dy: (Math.random() - 0.5) * 0.6,
            alpha: Math.random() * 0.5 + 0.1,
        }));

        let animId;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(129,140,248,${p.alpha})`;
                ctx.fill();
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            animId = requestAnimationFrame(draw);
        };
        draw();

        const handleResize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleGoHome = () => {
        if (!user) return navigate('/');
        if (user.role === 'Admin') return navigate('/admin');
        if (user.role === 'Teacher') return navigate('/teacher');
        if (user.role === 'Student') return navigate('/student');
        navigate('/');
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
            {/* Particle canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Decorative blobs */}
            <div className="absolute top-[-120px] left-[-120px] w-96 h-96 bg-indigo-300 rounded-full opacity-20 blur-3xl animate-pulse" />
            <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-purple-300 rounded-full opacity-10 blur-2xl" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/60 p-10 text-center" style={{ animation: 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>

                {/* Logo mark */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <GraduationCap size={32} className="text-white" />
                    </div>
                </div>

                {/* Giant 404 */}
                <div className="relative inline-block mb-2" style={{ animation: 'popIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
                    <span className="text-[110px] font-black leading-none tracking-tighter bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent select-none">
                        404
                    </span>
                    {/* Search icon floating */}
                    <div className="absolute -top-3 -right-5 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg" style={{ animation: 'float 3s ease-in-out infinite' }}>
                        <Search size={18} className="text-white" />
                    </div>
                </div>

                <h1 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
                    Page Not Found
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                    Oops! The page you're looking for doesn't exist or may have been moved.
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">What now?</span>
                    <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        id="go-back-btn"
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 active:scale-95 transition-all"
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>
                    <button
                        id="go-home-btn"
                        onClick={handleGoHome}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all"
                    >
                        <Home size={16} />
                        {user ? 'Back to Dashboard' : 'Back to Login'}
                    </button>
                </div>

                {/* URL hint */}
                <p className="mt-8 text-[11px] font-mono text-slate-300 bg-slate-50 rounded-xl px-4 py-2 inline-block">
                    {window.location.pathname}
                </p>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                @keyframes popIn {
                    from { transform: scale(0.7); opacity: 0; }
                    to   { transform: scale(1);   opacity: 1; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0)    rotate(-5deg); }
                    50%       { transform: translateY(-10px) rotate(5deg);  }
                }
            `}</style>
        </div>
    );
};

export default NotFoundPage;
