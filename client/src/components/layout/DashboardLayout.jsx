import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, LogOut, FileText, Bell, PenTool,
    ChevronLeft, ChevronRight, Menu, User, Building
} from 'lucide-react';
import { useUserProfile } from '../common/UserProfileContext';

const Sidebar = ({ role, isOpen, toggleSidebar }) => {
    const navigate = useNavigate();

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

    return (
        <div className={`h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ${isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'}`}>
            <div className={`p-6 border-b border-slate-700 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-lg">L</div>
                    {isOpen && <span className="text-xl font-bold tracking-wide animate-fade-in">LMS Portal</span>}
                </div>
                {isOpen && (
                    <button onClick={toggleSidebar} className="text-slate-400 hover:text-white">
                        <ChevronLeft size={20} />
                    </button>
                )}
            </div>

            {/* Collapsed Toggle Button when closed */}
            {!isOpen && (
                <div className="flex justify-center py-4 border-b border-slate-700/50">
                    <button onClick={toggleSidebar} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-md">
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
                {menuItems[role]?.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => navigate(item.path)}
                        className={`flex items-center ${isOpen ? 'space-x-3 px-4' : 'justify-center px-2'} w-full py-3 rounded-xl text-slate-300 hover:bg-indigo-600 hover:text-white transition-all group relative`}
                        title={!isOpen ? item.name : ''}
                    >
                        <item.icon size={20} className="group-hover:scale-110 transition-transform flex-shrink-0" />
                        {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-700">
                <button
                    onClick={handleLogout}
                    className={`flex items-center ${isOpen ? 'space-x-3 px-4' : 'justify-center px-2'} w-full py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all`}
                    title={!isOpen ? "Logout" : ''}
                >
                    <LogOut size={20} />
                    {isOpen && <span className="font-medium">Logout</span>}
                </button>
            </div>
        </div>
    );
};

const Header = ({ user, isSidebarOpen, toggleSidebar }) => {
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    return (
        <header className={`h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 fixed top-0 right-0 z-40 px-4 md:px-8 flex items-center justify-between transition-all duration-300 ${isSidebarOpen ? 'md:left-64 left-0' : 'md:left-20 left-0'}`}>
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                    <Menu size={20} />
                </button>

            </div>

            <div
                className="flex items-center space-x-3 pl-2 md:pl-6 border-l border-slate-200 relative group cursor-pointer"
                onClick={() => openProfile(user._id || user.id)}
            >
                <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-500">{user?.role || 'Guest'}</p>
                </div>
                <div
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold ring-2 md:ring-4 ring-indigo-50 hover:scale-105 transition-transform overflow-hidden shadow-sm"
                >
                    {user?.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        user?.name?.[0] || 'U'
                    )}
                </div>

                {/* Dropdown Menu */}
                <div
                    className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-2">
                        <button
                            onClick={() => openProfile(user._id || user.id)}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                            <User size={16} />
                            <span className="font-semibold">My Profile</span>
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('userInfo');
                                navigate('/');
                            }}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <LogOut size={16} />
                            <span className="font-semibold">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

const DashboardLayout = ({ children, role }) => {
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar role={role} isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <Header user={user} isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <main className={`pt-20 p-4 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64 ml-0' : 'md:ml-20 ml-0'}`}>
                {/* Overlay for mobile sidebar */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}
                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
