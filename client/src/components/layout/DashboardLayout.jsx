import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, LogOut, FileText,
    Link as LinkIcon, User, Building, Menu, X, PenTool, ClipboardCheck
} from 'lucide-react';
import { useUserProfile } from '../common/UserProfileContext';

const Header = ({ role, user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openProfile } = useUserProfile();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = {
        Admin: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
            { name: 'Institutes', icon: Building, path: '/admin/institutes' },
            { name: 'Students', icon: Users, path: '/admin/students' },
            { name: 'Teachers', icon: GraduationCap, path: '/admin/teachers' },
            { name: 'Courses', icon: BookOpen, path: '/admin/courses' },
            { name: 'Tests', icon: FileText, path: '/admin/tests' },
            { name: 'Tools', icon: PenTool, path: '/admin/tools' },
        ],
        Teacher: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/teacher' },
            { name: 'Activities', icon: FileText, path: '/teacher/activities' },
            { name: 'Evaluate', icon: ClipboardCheck, path: '/teacher/evaluate' },
        ],
        Student: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/student' },
            { name: 'My Tests', icon: FileText, path: '/student/tests' },
        ]
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/');
    };

    const isActive = (path) => {
        if (path === '/admin' || path === '/teacher' || path === '/student') {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 fixed top-0 left-0 right-0 z-50 px-4 md:px-8 flex items-center justify-between shadow-sm">
            {/* Logo Section */}
            <div className="flex items-center space-x-6 xl:space-x-12">
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate(`/${role.toLowerCase()}`)}>
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">L</div>
                    <span className="text-xl font-black text-slate-900 tracking-tight hidden sm:block">LMS<span className="text-indigo-600">Portal</span></span>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-1">
                    {menuItems[role]?.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-sm ${isActive(item.path)
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <item.icon size={18} strokeWidth={isActive(item.path) ? 2.5 : 2} />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* User Profile & Mobile Toggle */}
            <div className="flex items-center space-x-4">
                <div
                    className="flex items-center space-x-3 pl-4 border-l border-slate-200 relative group cursor-pointer"
                    onClick={() => openProfile(user._id || user.id)}
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 leading-none">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5 opacity-70">{user?.role || 'Guest'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-100 ring-2 ring-white hover:rotate-3 transition-transform">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            user?.name?.[0] || 'U'
                        )}
                    </div>

                    {/* Desktop Dropdown */}
                    <div className="absolute top-full right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <div className="px-4 py-3 border-b border-slate-50 mb-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed in as</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={() => openProfile(user._id || user.id)}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all font-bold"
                        >
                            <User size={18} />
                            <span>My Profile Settings</span>
                        </button>
                        <hr className="my-1 border-slate-50" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold"
                        >
                            <LogOut size={18} />
                            <span>Sign Out Portal</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation Drawer */}
            <div className={`lg:hidden fixed inset-0 top-20 bg-white z-[60] p-6 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none translate-x-full'}`}>
                <nav className="space-y-3">
                    {menuItems[role]?.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={`flex items-center space-x-4 w-full p-5 rounded-2xl transition-all font-bold ${isActive(item.path)
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <item.icon size={22} />
                            <span className="text-lg">{item.name}</span>
                        </button>
                    ))}
                    <div className="h-px bg-slate-100 my-6"></div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center space-x-3 w-full p-5 bg-red-50 text-red-600 rounded-2xl font-black text-lg transition-all border border-red-100 shadow-sm"
                    >
                        <LogOut size={22} />
                        <span>Logout from Portal</span>
                    </button>
                </nav>
            </div>
        </header>
    );
};

const DashboardLayout = ({ children, role }) => {
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header role={role} user={user} />
            <main className="flex-1 pt-24 pb-12 px-4 md:px-8">
                <div className="max-w-7xl mx-auto animate-fade-in relative">
                    {children}
                </div>
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                body { overflow-x: hidden; }
            `}} />
        </div>
    );
};

export default DashboardLayout;
