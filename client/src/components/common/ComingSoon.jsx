import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ComingSoon = ({ title = 'Coming Soon', message = 'This feature is under development and will be available shortly. Stay tuned!' }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const getDashboardPath = () => {
        const role = user?.role;
        if (role === 'Admin') return '/admin';
        if (role === 'Institute') return '/institute';
        if (role === 'Teacher') return '/teacher';
        if (role === 'Editor') return '/editor';
        if (role === 'Student') return '/student';
        if (role === 'Accountant') return '/accountant';
        if (role === 'Marketer') return '/marketer';
        if (role === 'Staff') return '/staff';
        return '/';
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
            flexDirection: 'column',
            gap: '20px',
            padding: '40px',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Rocket Icon */}
            <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '28px',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '42px',
                boxShadow: '0 20px 40px rgba(99,102,241,0.3)',
                marginBottom: '4px'
            }}>
                🚀
            </div>

            {/* Heading */}
            <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.04em',
                textAlign: 'center'
            }}>
                {title}
            </h1>

            {/* Sub text */}
            <p style={{
                fontSize: '0.95rem',
                color: '#64748b',
                fontWeight: 600,
                margin: 0,
                textAlign: 'center',
                maxWidth: '400px',
                lineHeight: '1.6'
            }}>
                {message}
            </p>

            {/* Dots animation */}
            <div style={{ display: 'flex', gap: '8px', margin: '4px 0 12px' }}>
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#6366f1',
                            opacity: 0.3 + i * 0.35,
                        }}
                    />
                ))}
            </div>

            {/* Back to Dashboard button */}
            <button
                onClick={() => navigate(getDashboardPath())}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 28px',
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                    boxShadow: '0 8px 20px rgba(15,23,42,0.2)',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
                ← Back to Dashboard
            </button>
        </div>
    );
};

export default ComingSoon;
