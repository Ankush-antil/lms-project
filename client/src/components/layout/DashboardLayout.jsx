import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, LogOut, FileText,
    Link as LinkIcon, User, Building, Menu, X, PenTool, ClipboardCheck,
    ChevronLeft, ChevronRight, MessageSquare, Bell, BellRing, Settings,
    BarChart3, UserPlus, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useUserProfile } from '../common/UserProfileContext';

/* ─────────────────────────────────────────
   Chat Notification Bar
───────────────────────────────────────── */
const ChatNotificationBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { chatNotifications, setChatNotifications } = useSocket();
    const [visible, setVisible] = useState([]);
    const timersRef = useRef({});

    // Sync visible from global list
    useEffect(() => {
        setVisible(chatNotifications.slice(0, 3));
    }, [chatNotifications]);

    // Auto-dismiss each notification after 8s
    useEffect(() => {
        visible.forEach(n => {
            if (!timersRef.current[n.id]) {
                timersRef.current[n.id] = setTimeout(() => {
                    dismiss(n.id);
                    delete timersRef.current[n.id];
                }, 8000);
            }
        });
    }, [visible]);

    const dismiss = (id) => {
        setChatNotifications(prev => prev.filter(n => n.id !== id));
    };

    const dismissAll = () => {
        // Clear all timers
        Object.values(timersRef.current).forEach(clearTimeout);
        timersRef.current = {};
        setChatNotifications([]);
    };

    const handleClick = (notif) => {
        dismiss(notif.id);
        const chatPath = user?.role === 'Student' ? '/student/chat' : '/teacher/chat';
        // Navigate and pass senderId in state so ChatPage can auto-select
        navigate(chatPath, { state: { openContactId: notif.senderId } });
    };

    // Don't show on the chat page itself — already reading messages there
    const onChatPage = location.pathname.includes('/chat');
    if (onChatPage || visible.length === 0) return null;

    return (
        <div className="fixed top-16 left-0 right-0 z-[200] flex flex-col items-end gap-1.5 px-4 pt-2 pointer-events-none">
            {/* Clear all — only if more than 1 */}
            {visible.length > 1 && (
                <button
                    onClick={dismissAll}
                    className="pointer-events-auto text-[10px] font-black text-slate-400 hover:text-slate-600 bg-white/80 backdrop-blur-md border border-slate-200 px-3 py-1 rounded-full mr-1 shadow-sm transition-colors"
                >
                    Clear all ({visible.length})
                </button>
            )}
            {visible.map((notif, idx) => (
                <div
                    key={notif.id}
                    className="pointer-events-auto w-full max-w-sm"
                    style={{
                        animation: `slideInNotif 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                        animationDelay: `${idx * 60}ms`,
                        opacity: 0
                    }}
                >
                    <div
                        className="bg-white/95 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-xl shadow-indigo-100/40 overflow-hidden group cursor-pointer"
                        onClick={() => handleClick(notif)}
                    >
                        {/* Colored top accent */}
                        <div className={`h-0.5 w-full ${notif.isDoubt ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} />
                        <div className="flex items-start gap-3 p-3">
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm ${notif.isDoubt ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                }`}>
                                {notif.isDoubt ? <BellRing size={16} /> : <MessageSquare size={16} />}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                    <p className="text-xs font-black text-slate-800 truncate leading-tight">
                                        {notif.senderName || 'Someone'}
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                                        className="flex-shrink-0 text-slate-300 hover:text-slate-600 transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                {notif.isDoubt && notif.testTitle && (
                                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-500 mb-0.5 truncate">
                                        Doubt · {notif.testTitle}{notif.questionIndex !== null ? ` · Q${notif.questionIndex + 1}` : ''}
                                    </p>
                                )}
                                <p className="text-[11px] text-slate-500 font-medium leading-snug truncate">{notif.text}</p>
                            </div>
                        </div>
                        {/* Click hint */}
                        <div className="px-3 pb-2.5 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider group-hover:text-indigo-600 transition-colors">Tap to open chat →</span>
                            {/* Progress bar for auto-dismiss */}
                            <div className="h-0.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-400 rounded-full"
                                    style={{ animation: 'notifProgress 8s linear forwards' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideInNotif {
                    from { opacity: 0; transform: translateX(40px) scale(0.96); }
                    to   { opacity: 1; transform: translateX(0)   scale(1); }
                }
                @keyframes notifProgress {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            ` }} />
        </div>
    );
};

const menuItems = {
    Admin: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { name: 'Users', icon: User, path: '/admin/users' },
        { name: 'Students', icon: Users, path: '/admin/students' },
        { name: 'Teachers', icon: GraduationCap, path: '/admin/teachers' },
        { name: 'Editors', icon: Users, path: '/admin/editors' },
        { name: 'Institutes', icon: Building, path: '/admin/institutes' },
        { name: 'Courses', icon: BookOpen, path: '/admin/courses' },
        { name: 'Subjects', icon: BookOpen, path: '/admin/subjects' },
        { name: 'Activities', icon: FileText, path: '/admin/activities' },
        { name: 'Activities Builder', icon: PenTool, path: '/admin/activities-builder' },
    ],
    Institute: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/institute' },
        { name: 'Students', icon: Users, path: '/institute/students' },
        { name: 'Teachers', icon: GraduationCap, path: '/institute/teachers' },
        { name: 'Editors', icon: Users, path: '/institute/editors' },
        { name: 'Courses', icon: BookOpen, path: '/institute/courses' },
        { name: 'Subjects', icon: BookOpen, path: '/institute/subjects' },
        { name: 'Activities', icon: FileText, path: '/institute/activities' },
        { name: 'Activities Builder', icon: PenTool, path: '/institute/activities-builder' },
        { name: 'Chat', icon: MessageSquare, path: '/institute/chat' },
    ],
    Teacher: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/teacher' },
        { name: 'Student Activities', icon: FileText, path: '/teacher/activities' },
        { name: 'Evaluate', icon: ClipboardCheck, path: '/teacher/evaluate' },
        { name: 'Snapshots', icon: ClipboardCheck, path: '/teacher/snapshots' },
        { name: 'Activities Builder', icon: ClipboardCheck, path: '/teacher/activities-builder' },
        { name: 'Chat', icon: MessageSquare, path: '/teacher/chat' },
    ],
    Editor: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/editor' },
        { name: 'Teachers', icon: FileText, path: '/editor/teachers' },
        { name: 'Courses', icon: ClipboardCheck, path: '/editor/courses' },
        { name: 'Subjects', icon: ClipboardCheck, path: '/editor/subjects' },
        { name: 'Activities', icon: ClipboardCheck, path: '/editor/activities' },
        { name: 'Activities Builder', icon: ClipboardCheck, path: '/editor/activities-builder' },
        { name: 'Chat', icon: MessageSquare, path: '/editor/chat' },
    ],
    Student: [
        { name: 'My Activities', icon: FileText, path: '/student/tests' },
        { name: 'Dashboard', icon: LayoutDashboard, path: '/student' },
        { name: 'Tools', icon: Settings, path: '/student/practice-tools' },
        { name: 'My SnapShots', icon: BarChart3, path: '/student/performance' },
        { name: 'Chat', icon: MessageSquare, path: '/student/chat' }
    ]
};

/* ─────────────────────────────────────────
   Bell Notification Button (inside Header)
───────────────────────────────────────── */
const NotificationBell = ({ safeRole }) => {
    const navigate = useNavigate();
    const { chatNotifications, setChatNotifications } = useSocket();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const unread = chatNotifications.length;

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const openChat = (notif) => {
        setChatNotifications(prev => prev.filter(n => n.id !== notif.id));
        setOpen(false);
        const chatPath = safeRole === 'Student' ? '/student/chat' : '/teacher/chat';
        navigate(chatPath, {
            state: {
                openContactId: notif.senderId,
                isDoubt: notif.isDoubt || false,
                testId: notif.testId || null,
                questionIndex: notif.questionIndex !== undefined ? notif.questionIndex : null
            }
        });
    };

    const clearAll = (e) => {
        e.stopPropagation();
        setChatNotifications([]);
    };

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(prev => !prev)}
                className={`relative p-2.5 rounded-xl transition-all border ${unread > 0
                    ? 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20'
                    : 'text-slate-400 border-transparent hover:bg-white/10 hover:text-slate-200'
                    }`}
                title="Notifications"
            >
                {unread > 0 ? (
                    <BellRing size={19} style={{ animation: 'bellRing 1.4s ease-in-out infinite' }} />
                ) : (
                    <Bell size={19} />
                )}
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-indigo-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-indigo-500/50 ring-2 ring-[#0b1329]">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute top-[calc(100%+10px)] right-0 w-80 bg-[#0d1635] border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-[9999]"
                    style={{ animation: 'dropIn 0.18s cubic-bezier(0.16,1,0.3,1) both' }}
                >
                    {/* Header Row */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <BellRing size={13} className="text-indigo-400" />
                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Notifications</span>
                            {unread > 0 && (
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                    {unread}
                                </span>
                            )}
                        </div>
                        {unread > 0 && (
                            <button onClick={clearAll} className="text-[10px] font-black text-slate-500 hover:text-slate-300 transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                        {unread === 0 ? (
                            <div className="py-10 flex flex-col items-center gap-2 text-center select-none">
                                <Bell size={26} className="text-slate-700" />
                                <p className="text-xs font-bold text-slate-500">No new notifications</p>
                                <p className="text-[10px] text-slate-600">Chat messages will appear here</p>
                            </div>
                        ) : (
                            chatNotifications.map((notif, idx) => (
                                <button
                                    key={notif.id}
                                    onClick={() => openChat(notif)}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors group"
                                    style={{ animation: 'itemIn 0.15s ease both', animationDelay: `${idx * 35}ms`, opacity: 0 }}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar chip */}
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${notif.isDoubt ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'
                                            }`}>
                                            {notif.senderName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <p className="text-[11px] font-black text-slate-200 truncate group-hover:text-white transition-colors">
                                                    {notif.senderName || 'Someone'}
                                                </p>
                                                {notif.isDoubt && (
                                                    <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Doubt</span>
                                                )}
                                            </div>
                                            {notif.isDoubt && notif.testTitle && (
                                                <p className="text-[9px] font-extrabold text-amber-400/70 truncate">
                                                    {notif.testTitle}{notif.questionIndex !== null ? ` · Q${notif.questionIndex + 1}` : ''}
                                                </p>
                                            )}
                                            <p className="text-[11px] text-slate-400 truncate group-hover:text-slate-300 transition-colors">
                                                {notif.text}
                                            </p>
                                        </div>
                                        <span className="text-slate-600 group-hover:text-indigo-400 transition-colors text-base leading-none mt-1 flex-shrink-0">›</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {unread > 0 && (
                        <div className="border-t border-slate-700/50 px-4 py-2.5 bg-slate-900/30">
                            <button
                                onClick={() => { setOpen(false); navigate(safeRole === 'Student' ? '/student/chat' : '/teacher/chat'); }}
                                className="w-full text-[11px] font-black text-indigo-400 hover:text-indigo-300 transition-colors text-center"
                            >
                                Open Chat Page →
                            </button>
                        </div>
                    )}

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes bellRing {
                            0%,100%{transform:rotate(0)}
                            10%{transform:rotate(14deg)}
                            20%{transform:rotate(-12deg)}
                            30%{transform:rotate(10deg)}
                            40%{transform:rotate(-7deg)}
                            50%{transform:rotate(4deg)}
                            60%{transform:rotate(-2deg)}
                            70%{transform:rotate(0)}
                        }
                        @keyframes dropIn {
                            from{opacity:0;transform:translateY(-6px) scale(0.97)}
                            to{opacity:1;transform:translateY(0) scale(1)}
                        }
                        @keyframes itemIn {
                            from{opacity:0;transform:translateX(-5px)}
                            to{opacity:1;transform:translateX(0)}
                        }
                    `}} />
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────
   Shared Header (branding + user profile)
───────────────────────────────────────── */
const Header = ({ role = 'Admin', onMobileMenuToggle, isMobileMenuOpen }) => {
    const navigate = useNavigate();
    const { openProfile } = useUserProfile();
    const { logout, user, switchAccount, removeAccount } = useAuth();
    const handleLogout = () => logout();
    const safeRole = role || 'Admin';
    const showBell = safeRole === 'Teacher' || safeRole === 'Student';
    
    const savedAccounts = (() => {
        try {
            const listStr = localStorage.getItem('lmsSavedAccounts');
            const list = listStr ? JSON.parse(listStr) : [];
            return Array.isArray(list) ? list.filter(acc => acc.user?.email !== user?.email) : [];
        } catch (e) {
            return [];
        }
    })();

    return (
        <header className="h-16 bg-[#0b1329] border-b border-slate-800 fixed top-0 left-0 right-0 z-50 px-4 md:px-8 flex items-center justify-between shadow-md text-white">
            {/* Logo */}
            <div className="flex items-center space-x-6 xl:space-x-12">
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate(`/${safeRole.toLowerCase()}`)}>
                    <div className="w-10 h-10 bg-white text-[#0b1329] rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300">L</div>
                    <span className="text-xl font-black text-white tracking-tight hidden sm:block">LMS<span className="text-slate-300">Portal</span></span>
                </div>
            </div>

            {/* Right side: Bell + Profile + Mobile */}
            <div className="flex items-center gap-2">

                {/* Bell icon — Teacher & Student only */}
                {showBell && <NotificationBell safeRole={safeRole} />}

                {/* Divider */}
                <div className="w-px h-7 bg-slate-800 mx-1 hidden sm:block" />

                {/* Profile */}
                <div
                    className="flex items-center space-x-3 relative group cursor-pointer"
                    onClick={() => openProfile(user?._id || user?.id)}
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-200 leading-none">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 opacity-70">{user?.role || 'Guest'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold shadow-md shadow-black/10 ring-2 ring-slate-800 hover:rotate-3 transition-transform overflow-hidden">
                        {user?.role === 'Institute' && user?.institute?.imageUrl ? (
                            <img src={user.institute.imageUrl} alt="Institute Logo" className="w-full h-full object-cover" />
                        ) : user?.avatar ? (
                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : user?.institute?.imageUrl ? (
                            <img src={user.institute.imageUrl} alt="Institute Logo" className="w-full h-full object-cover" />
                        ) : (
                            user?.name?.[0] || 'U'
                        )}
                    </div>

                    {/* Profile dropdown */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full right-0 mt-3 w-64 bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-white z-50 flex flex-col gap-1.5"
                    >
                        <div className="px-3 py-2.5 border-b border-slate-800">
                            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Signed in as</p>
                            <p className="text-sm font-bold text-slate-200 truncate">{user?.email}</p>
                            <span className="inline-block mt-1.5 text-[8px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-widest">{user?.role}</span>
                        </div>
                        
                        <button
                            onClick={() => openProfile(user?._id || user?.id)}
                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold"
                        >
                            <User size={16} />
                            <span>My Profile Settings</span>
                        </button>
                        
                        {/* Saved Accounts Switcher */}
                        {savedAccounts.length > 0 && (
                            <div className="border-t border-b border-slate-800/80 py-2 flex flex-col gap-1">
                                <p className="px-3 text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Switch Account</p>
                                {savedAccounts.map((acc, index) => (
                                    <div
                                        key={index}
                                        onClick={() => switchAccount(acc.token, acc.user)}
                                        className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/5 rounded-xl transition-all group/acc cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-200 overflow-hidden shrink-0">
                                                {acc.user?.avatar ? (
                                                    <img src={acc.user.avatar} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    acc.user?.name?.[0]?.toUpperCase() || 'U'
                                                )}
                                            </div>
                                            <div className="text-left min-w-0">
                                                <p className="text-xs font-bold text-slate-200 truncate leading-none">{acc.user?.name || 'Saved Account'}</p>
                                                <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider">{acc.user?.role}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeAccount(acc.user?.email);
                                            }}
                                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-md transition-all opacity-0 group-hover/acc:opacity-100"
                                            title="Remove Account"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                window.location.href = '/login?mode=add-account';
                            }}
                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-indigo-400 hover:bg-indigo-950/20 rounded-xl transition-all font-bold border border-indigo-900/30 border-dashed"
                        >
                            <UserPlus size={16} />
                            <span>Add More Account</span>
                        </button>
                        
                        <hr className="my-0.5 border-slate-800" />
                        
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-red-400 hover:bg-red-950/20 rounded-xl transition-all font-bold"
                        >
                            <LogOut size={16} />
                            <span>Sign Out Portal</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={onMobileMenuToggle}
                    className="lg:hidden p-2.5 ml-1 bg-slate-850 text-slate-300 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-slate-700"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </header>
    );
};

/* ─────────────────────────────────────────
   Left Sidebar (unified for all roles)
───────────────────────────────────────── */
const Sidebar = ({ role = 'Admin', collapsed, onToggle, isMobileOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const safeRole = role || 'Admin';
    const items = menuItems[safeRole] || [];

    const isActive = (path) => {
        const baseRolePath = `/${safeRole.toLowerCase()}`;
        if (path === baseRolePath) return location.pathname === path;
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
                    className="absolute -right-3.5 top-6 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md text-slate-500 hover:text-[#3E3ADD] hover:bg-slate-50 transition-all z-10 cursor-pointer border-none"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {items.map((item) => {
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
                <div className="px-3 pb-6">
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
                        {items.map((item) => {
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
   Main DashboardLayout
───────────────────────────────────────── */
const DashboardLayout = ({ children, role = 'Admin', fullWidth = false }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    const safeRole = role || 'Admin';
    const hasSidebar = !!menuItems[safeRole];

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const sidebarWidth = hasSidebar ? (sidebarCollapsed ? 72 : 224) : 0;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header
                role={safeRole}
                onMobileMenuToggle={() => setIsMobileMenuOpen(prev => !prev)}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            {/* Left sidebar & mobile drawer */}
            {hasSidebar && (
                <Sidebar
                    role={safeRole}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(prev => !prev)}
                    isMobileOpen={isMobileMenuOpen}
                />
            )}


            {/* Main content */}
            <main
                style={{
                    transition: 'padding-left 0.3s cubic-bezier(0.4,0,0.2,1)'
                }}
                className={`flex-1 pt-20 pb-12 px-4 md:px-8 ${hasSidebar ? (sidebarCollapsed ? 'lg:pl-[112px]' : 'lg:pl-[264px]') : ''
                    }`}
            >
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
