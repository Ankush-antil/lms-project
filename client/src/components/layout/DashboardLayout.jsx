import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, LogOut, FileText,
    Link as LinkIcon, User, Building, Menu, X, PenTool, ClipboardCheck,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../common/UserProfileContext';

const menuItems = {
    Admin: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { name: 'Institutes', icon: Building, path: '/admin/institutes' },
        { name: 'Students', icon: Users, path: '/admin/students' },
        { name: 'Teachers', icon: GraduationCap, path: '/admin/teachers' },
        { name: 'Courses', icon: BookOpen, path: '/admin/courses' },
        { name: 'Tests', icon: FileText, path: '/admin/tests' },
        { name: 'Test Builder', icon: PenTool, path: '/admin/tests/builder' },
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

/* ─────────────────────────────────────────
   Shared Header (branding + user profile)
───────────────────────────────────────── */
const Header = ({ role, onMobileMenuToggle, isMobileMenuOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openProfile } = useUserProfile();
    const { logout, user } = useAuth();

    const handleLogout = () => logout();

    const isActive = (path) => {
        if (path === '/admin' || path === '/teacher' || path === '/student') {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    return (
        <header className="h-16 bg-[#0b1329] border-b border-slate-800 fixed top-0 left-0 right-0 z-50 px-4 md:px-8 flex items-center justify-between shadow-md text-white">
            {/* Logo + Non-admin desktop nav */}
            <div className="flex items-center space-x-6 xl:space-x-12">
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate(`/${role.toLowerCase()}`)}>
                    <div className="w-10 h-10 bg-white text-[#0b1329] rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300">L</div>
                    <span className="text-xl font-black text-white tracking-tight hidden sm:block">LMS<span className="text-slate-300">Portal</span></span>
                </div>

                {/* Desktop nav — only for non-admin roles */}
                {role !== 'Admin' && (
                    <nav className="hidden lg:flex items-center space-x-1">
                        {menuItems[role]?.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-sm ${isActive(item.path)
                                    ? 'bg-white text-[#0b1329] shadow-lg shadow-black/10'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <item.icon size={18} strokeWidth={isActive(item.path) ? 2.5 : 2} />
                                <span>{item.name}</span>
                            </button>
                        ))}
                    </nav>
                )}
            </div>

            {/* User Profile & Mobile Toggle */}
            <div className="flex items-center space-x-4">
                <div
                    className="flex items-center space-x-3 pl-4 border-l border-slate-800 relative group cursor-pointer"
                    onClick={() => openProfile(user?._id || user?.id)}
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-200 leading-none">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 opacity-70">{user?.role || 'Guest'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold shadow-md shadow-black/10 ring-2 ring-slate-800 hover:rotate-3 transition-transform">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            user?.name?.[0] || 'U'
                        )}
                    </div>

                    {/* Desktop Dropdown */}
                    <div className="absolute top-full right-0 mt-3 w-60 bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-white z-50">
                        <div className="px-4 py-3 border-b border-slate-800 mb-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed in as</p>
                            <p className="text-sm font-bold text-slate-200 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={() => openProfile(user?._id || user?.id)}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-all font-bold"
                        >
                            <User size={18} />
                            <span>My Profile Settings</span>
                        </button>
                        <hr className="my-1 border-slate-800" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-950/20 rounded-xl transition-all font-bold"
                        >
                            <LogOut size={18} />
                            <span>Sign Out Portal</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={onMobileMenuToggle}
                    className="lg:hidden p-2.5 bg-slate-850 text-slate-300 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-slate-700"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </header>
    );
};

/* ─────────────────────────────────────────
   Admin Left Sidebar
───────────────────────────────────────── */
const AdminSidebar = ({ collapsed, onToggle, isMobileOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const isActive = (path) => {
        if (path === '/admin') return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Sidebar — desktop */}
            <aside
                style={{ transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)' }}
                className={`hidden lg:flex flex-col fixed top-16 left-0 bottom-0 z-40 bg-[#0b1329] border-r border-slate-800/80 shadow-md text-white ${collapsed ? 'w-[72px]' : 'w-56'}`}
            >
                {/* Collapse toggle */}
                <button
                    onClick={onToggle}
                    className="absolute -right-3.5 top-6 w-7 h-7 bg-[#0b1329] border border-slate-800 rounded-full flex items-center justify-center shadow-md hover:bg-white/10 hover:text-white text-slate-400 transition-all z-10 cursor-pointer"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {menuItems.Admin.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                title={collapsed ? item.name : undefined}
                                className={`flex items-center w-full rounded-xl transition-all duration-200 font-bold text-sm group cursor-pointer
                                    ${collapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-3'}
                                    ${active
                                        ? 'bg-white text-[#0b1329] shadow-lg shadow-black/10'
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
                                {!collapsed && <span>{item.name}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout at bottom */}
                <div className={`px-3 pb-6 ${collapsed ? '' : ''}`}>
                    <button
                        onClick={logout}
                        title={collapsed ? 'Sign Out' : undefined}
                        className={`flex items-center w-full rounded-xl transition-all duration-200 font-bold text-sm text-red-400 hover:bg-red-950/20 cursor-pointer
                            ${collapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-3'}`}
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile drawer */}
            <div className={`lg:hidden fixed inset-0 top-16 z-[60] transition-all duration-300 ${isMobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                {/* Drawer panel */}
                <div className={`absolute left-0 top-0 bottom-0 w-64 bg-[#0b1329] shadow-2xl p-6 flex flex-col transition-transform duration-300 text-white ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <nav className="flex-1 space-y-2">
                        {menuItems.Admin.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => navigate(item.path)}
                                    className={`flex items-center space-x-4 w-full p-4 rounded-2xl transition-all font-bold ${active
                                        ? 'bg-white text-[#0b1329] shadow-xl shadow-black/10'
                                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <item.icon size={22} />
                                    <span className="text-base">{item.name}</span>
                                </button>
                            );
                        })}
                    </nav>
                    <div className="pt-4 border-t border-slate-800">
                        <button
                            onClick={logout}
                            className="flex items-center justify-center space-x-3 w-full p-4 bg-red-950/20 text-red-400 rounded-2xl font-black text-base transition-all border border-red-900/30 shadow-sm"
                        >
                            <LogOut size={22} />
                            <span>Logout from Portal</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

/* ─────────────────────────────────────────
   Non-admin Mobile Drawer
───────────────────────────────────────── */
const MobileNavDrawer = ({ role, isMobileOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const isActive = (path) => {
        if (path === '/teacher' || path === '/student') return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <div className={`lg:hidden fixed inset-0 top-16 bg-[#0b1329] z-[60] p-6 transition-all duration-300 text-white ${isMobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none translate-x-full'}`}>
            <nav className="space-y-3">
                {menuItems[role]?.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => navigate(item.path)}
                        className={`flex items-center space-x-4 w-full p-5 rounded-2xl transition-all font-bold ${isActive(item.path)
                            ? 'bg-white text-[#0b1329] shadow-xl shadow-black/10'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <item.icon size={22} />
                        <span className="text-lg">{item.name}</span>
                    </button>
                ))}
                <div className="h-px bg-slate-800 my-6"></div>
                <button
                    onClick={logout}
                    className="flex items-center justify-center space-x-3 w-full p-5 bg-red-950/20 text-red-400 rounded-2xl font-black text-lg transition-all border border-red-900/30 shadow-sm"
                >
                    <LogOut size={22} />
                    <span>Logout from Portal</span>
                </button>
            </nav>
        </div>
    );
};

/* ─────────────────────────────────────────
   Main DashboardLayout
───────────────────────────────────────── */
const DashboardLayout = ({ children, role, fullWidth = false }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const isAdmin = role === 'Admin';

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const sidebarWidth = isAdmin ? (sidebarCollapsed ? 72 : 224) : 0;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header
                role={role}
                onMobileMenuToggle={() => setIsMobileMenuOpen(prev => !prev)}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            {/* Admin sidebar */}
            {isAdmin && (
                <AdminSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(prev => !prev)}
                    isMobileOpen={isMobileMenuOpen}
                />
            )}

            {/* Non-admin mobile drawer */}
            {!isAdmin && (
                <MobileNavDrawer role={role} isMobileOpen={isMobileMenuOpen} />
            )}

            {/* Main content */}
            <main
                style={{
                    paddingLeft: isAdmin ? `${sidebarWidth + 16}px` : undefined,
                    transition: 'padding-left 0.3s cubic-bezier(0.4,0,0.2,1)'
                }}
                className="flex-1 pt-20 pb-12 px-4 md:px-8 hidden lg:block"
            >
                <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} animate-fade-in relative`}>
                    {children}
                </div>
            </main>

            {/* Mobile main content (no sidebar offset) */}
            <main className="flex-1 pt-20 pb-12 px-4 md:px-8 lg:hidden">
                <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} animate-fade-in relative`}>
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
