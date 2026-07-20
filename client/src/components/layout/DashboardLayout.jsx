import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, LogOut, FileText,
    Link as LinkIcon, User, Building, Menu, X, PenTool, ClipboardCheck,
    ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Bell, BellRing, Settings,
    BarChart3, UserPlus, Trash2, Wallet, CreditCard, HardDrive,
    Calculator, Megaphone, Calendar, StickyNote, Briefcase, DollarSign, CheckSquare,
    RefreshCw, Award, Package
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useUserProfile } from '../common/UserProfileContext';
import ChangeRoleModal from '../common/ChangeRoleModal';

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
        const chatPath = `/${(user?.role || 'student').toLowerCase()}/chat`;
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
        { name: '_section_dashboard', icon: LayoutDashboard, path: null },
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },

        { name: '_section_Users', icon: Users, path: null },
        { name: 'Users', icon: User, path: '/admin/users' },
        { name: 'Students', icon: Users, path: '/admin/students' },
        { name: 'Teachers', icon: GraduationCap, path: '/admin/teachers' },
        { name: 'Editors', icon: Users, path: '/admin/editors' },
        { name: 'Institutes', icon: Building, path: '/admin/institutes' },
        { name: 'Accountants', icon: Users, path: '/admin/accountants' },
        { name: 'Marketers', icon: Megaphone, path: '/admin/marketers' },
        { name: 'Parents', icon: Users, path: '/admin/parents' },

        { name: '_section_content', icon: BookOpen, path: null },
        { name: 'Courses', icon: BookOpen, path: '/admin/courses' },
        { name: 'Subjects', icon: BookOpen, path: '/admin/subjects' },
        { name: 'Study Material', icon: BookOpen, path: '/admin?tab=study-material' },
        { name: 'Activities', icon: FileText, path: '/admin/activities' },
        { name: 'Tools', icon: PenTool, path: '/admin/tools' },

        { name: '_section_management', icon: Briefcase, path: null },
        { name: 'Staff Mgt', icon: Users, path: '/admin/staff' },
        { name: 'Asset Mgt', icon: Package, path: '/admin/assets' },
        { name: 'Lead Mgt', icon: Users, path: '/admin/leads' },
        { name: 'Ads Mgt', icon: Megaphone, path: '/admin/ads' },

        { name: '_section_services', icon: Settings, path: null },
        { name: 'Drive', icon: HardDrive, path: '/admin/drive' },
        { name: 'Notes', icon: StickyNote, path: '/admin/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/admin/chat' }
    ],
    Institute: [
        { name: '_section_dashboard', icon: LayoutDashboard, path: null },
        { name: 'Dashboard', icon: LayoutDashboard, path: '/institute' },

        { name: '_section_Users', icon: Users, path: null },
        { name: 'Users', icon: User, path: '/institute/users' },
        { name: 'Students', icon: Users, path: '/institute/students' },
        { name: 'Teachers', icon: GraduationCap, path: '/institute/teachers' },
        { name: 'Editors', icon: Users, path: '/institute/editors' },
        { name: 'Accountants', icon: Users, path: '/institute/accountants' },
        { name: 'Parents', icon: Users, path: '/institute/parents' },

        { name: '_section_content', icon: BookOpen, path: null },
        { name: 'Courses', icon: BookOpen, path: '/institute/courses' },
        { name: 'Subjects', icon: BookOpen, path: '/institute/subjects' },
        { name: 'Study Material', icon: BookOpen, path: '/institute?tab=study-material' },
        { name: 'Activities', icon: FileText, path: '/institute/activities' },
        { name: 'Tools', icon: PenTool, path: '/institute/tools' },

        { name: '_section_management', icon: Briefcase, path: null },
        { name: 'Staff Mgt', icon: Users, path: '/institute/staff' },
        { name: 'Asset Mgt', icon: Package, path: '/institute/assets' },
        { name: 'Lead Mgt', icon: Users, path: '/institute/leads' },
        { name: 'Ads Mgt', icon: Megaphone, path: '/institute/ads' },

        { name: '_section_services', icon: Settings, path: null },
        { name: 'Drive', icon: HardDrive, path: '/institute/drive' },
        { name: 'Notes', icon: StickyNote, path: '/institute/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/institute/chat' }
    ],
    Teacher: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/teacher' },
        { name: 'Student Activities', icon: FileText, path: '/teacher/activities' },
        { name: 'Evaluate', icon: ClipboardCheck, path: '/teacher/evaluate' },
        { name: 'Snapshots', icon: ClipboardCheck, path: '/teacher/snapshots' },
        { name: 'Tools', icon: PenTool, path: '/teacher/tools' },
        { name: 'Task', icon: CheckSquare, path: '/teacher/task' },
        { name: 'Attendance', icon: Calendar, path: '/teacher/attendance' },
        { name: 'Salary', icon: DollarSign, path: '/teacher/salary' },
        { name: 'Drive', icon: HardDrive, path: '/teacher/drive' },
        { name: 'Notes', icon: StickyNote, path: '/teacher/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/teacher/chat' },
    ],
    Editor: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/editor' },
        { name: 'Teachers', icon: FileText, path: '/editor/teachers' },
        { name: 'Courses', icon: ClipboardCheck, path: '/editor/courses' },
        { name: 'Subjects', icon: ClipboardCheck, path: '/editor/subjects' },
        { name: 'Activities', icon: ClipboardCheck, path: '/editor/activities' },
        { name: 'Tools', icon: ClipboardCheck, path: '/editor/tools' },
        { name: 'Task', icon: CheckSquare, path: '/editor/task' },
        { name: 'Attendance', icon: Calendar, path: '/editor/attendance' },
        { name: 'Salary', icon: DollarSign, path: '/editor/salary' },
        { name: 'Drive', icon: HardDrive, path: '/editor/drive' },
        { name: 'Notes', icon: StickyNote, path: '/editor/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/editor/chat' },
    ],
    Accountant: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/accountant' },
        { name: 'Fee Portal', icon: CreditCard, path: '/accountant/fee-portal' },
        { name: 'Asset Mgt', icon: Package, path: '/accountant/assets' },
        { name: 'Attendance Mgt', icon: Calendar, path: '/admin/attendance-portal' },
        { name: 'Task', icon: CheckSquare, path: '/accountant/task' },
        { name: 'Attendance', icon: Calendar, path: '/accountant/attendance' },
        { name: 'Salary', icon: DollarSign, path: '/accountant/salary' },
        { name: 'Drive', icon: HardDrive, path: '/accountant/drive' },
        { name: 'Notes', icon: StickyNote, path: '/accountant/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/accountant/chat' },
    ],
    Marketer: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/marketer' },
        { name: 'Leads Mgt', icon: Users, path: '/marketer/leads' },
        { name: 'Ads Mgt', icon: Megaphone, path: '/marketer/ads' },
        { name: 'Referral Mkt', icon: UserPlus, path: '/marketer/referrals' },
        { name: 'Affiliate Mkt', icon: Award, path: '/marketer/affiliates' },
        { name: 'Task', icon: CheckSquare, path: '/marketer/task' },
        { name: 'Attendance', icon: Calendar, path: '/marketer/attendance' },
        { name: 'Salary', icon: DollarSign, path: '/marketer/salary' },
        { name: 'Drive', icon: HardDrive, path: '/marketer/drive' },
        { name: 'Notes', icon: StickyNote, path: '/marketer/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/marketer/chat' },
    ],
    Student: [
        { name: 'My Activities', icon: FileText, path: '/student/tests' },
        { name: 'Dashboard', icon: LayoutDashboard, path: '/student' },
        { name: 'Fee Portal', icon: Wallet, path: '/student/fee-portal' },
        { name: 'Tools', icon: Settings, path: '/student/practice-tools' },
        { name: 'My SnapShots', icon: BarChart3, path: '/student/performance' },
        { name: 'Drive', icon: HardDrive, path: '/student/drive' },
        { name: 'Notes', icon: StickyNote, path: '/student/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/student/chat' },
    ],
    Parent: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/parent' },
        { name: 'Student Fee', icon: Wallet, path: '/parent/fee' },
        { name: 'Attendance', icon: Calendar, path: '/parent/attendance' },
        { name: 'Activities', icon: FileText, path: '/parent/activities' },
        { name: 'Drive', icon: HardDrive, path: '/parent/drive' },
        { name: 'Notes', icon: StickyNote, path: '/parent/notes' },
        { name: 'Chat', icon: MessageSquare, path: '/parent/chat' },
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
        const chatPath = `/${(user?.role || safeRole || 'student').toLowerCase()}/chat`;
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
                    className="absolute top-[calc(100%+10px)] right-0 w-[min(320px,calc(100vw-1.5rem))] bg-[#0d1635] border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-[9999]"
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
                                onClick={() => { setOpen(false); navigate(`/${(user?.role || safeRole || 'student').toLowerCase()}/chat`); }}
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
    const { logout, user, switchAccount, removeAccount, login } = useAuth();
    const handleLogout = () => logout();
    const safeRole = role || 'Admin';
    const showBell = safeRole === 'Teacher' || safeRole === 'Student';
    const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);

    // Switch Account password prompt states
    const [switchingToAccount, setSwitchingToAccount] = useState(null);
    const [switchPassword, setSwitchPassword] = useState('');
    const [switchLoading, setSwitchLoading] = useState(false);

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
        <header className="h-16 bg-[#0b1329] border-b border-slate-800 fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 md:px-8 flex items-center justify-between shadow-md text-white">
            {/* Logo */}
            <div className="flex items-center">
                <div className="flex items-center space-x-2.5 cursor-pointer group" onClick={() => navigate(`/${safeRole.toLowerCase()}`)}>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-[#0b1329] rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300">L</div>
                    <span className="text-lg sm:text-xl font-black text-white tracking-tight hidden sm:block">LMS<span className="text-slate-300">Portal</span></span>
                </div>
            </div>

            {/* Right side: Bell + Profile + Mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2">

                {/* Bell icon — Teacher & Student only */}
                {showBell && <NotificationBell safeRole={safeRole} />}

                {/* Divider */}
                <div className="w-px h-7 bg-slate-800 mx-1 hidden sm:block" />

                {/* Profile */}
                <div
                    className="flex items-center space-x-3 relative group cursor-default"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-200 leading-none">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 opacity-70">{user?.role || 'Guest'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold shadow-md shadow-black/10 ring-2 ring-slate-800 hover:rotate-3 transition-transform overflow-hidden cursor-pointer">
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
                        className="absolute top-full right-0 mt-3 w-[min(256px,calc(100vw-1.5rem))] bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-white z-50 flex flex-col gap-1.5"
                    >
                        <div
                            onClick={() => openProfile(user?._id || user?.id)}
                            className="px-3 py-2.5 border-b border-slate-800 cursor-pointer hover:bg-white/5 rounded-xl transition-all"
                        >
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                            <p className="text-sm font-bold text-slate-200 truncate">{user?.email}</p>
                            <span className="inline-block mt-1.5 text-[8px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-widest">{user?.role}</span>
                        </div>

                        <button
                            onClick={() => setIsChangeRoleModalOpen(true)}
                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-all font-bold"
                        >
                            <RefreshCw size={16} />
                            <span>Change Role</span>
                        </button>

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
                                <div className="max-h-[160px] overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                                    {savedAccounts.map((acc, index) => (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                if (user?.role === 'Student') {
                                                    setSwitchingToAccount(acc);
                                                    setSwitchPassword('');
                                                } else {
                                                    switchAccount(acc.token, acc.user);
                                                }
                                            }}
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
            <ChangeRoleModal isOpen={isChangeRoleModalOpen} onClose={() => setIsChangeRoleModalOpen(false)} />
            {switchingToAccount && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0b1329] text-white w-full max-w-md rounded-3xl p-6 border border-slate-800 shadow-2xl animate-fade-in">
                        <h3 className="text-lg font-black text-slate-100 mb-2">Switch Account Security</h3>
                        <p className="text-xs text-slate-400 font-bold mb-4">
                            You are switching from a Student profile. Please enter the password for <span className="text-indigo-400">{switchingToAccount.user?.email}</span> to verify your identity.
                        </p>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!switchPassword) {
                                    toast.error("Please enter password");
                                    return;
                                }
                                try {
                                    setSwitchLoading(true);
                                    const loggedIn = await login(switchingToAccount.user?.email, switchPassword);
                                    setSwitchingToAccount(null);
                                    setSwitchPassword('');
                                    switchAccount(loggedIn.token, loggedIn);
                                } catch (err) {
                                    toast.error(err.response?.data?.message || "Invalid password. Access denied.");
                                } finally {
                                    setSwitchLoading(false);
                                }
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Account Password</label>
                                <input
                                    type="password"
                                    required
                                    value={switchPassword}
                                    onChange={(e) => setSwitchPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder-slate-600"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSwitchingToAccount(null)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all bg-transparent border border-slate-800 rounded-xl cursor-pointer"
                                    disabled={switchLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 transition-all rounded-xl cursor-pointer shadow-lg shadow-indigo-650/15 disabled:opacity-50"
                                    disabled={switchLoading}
                                >
                                    {switchLoading ? "Verifying..." : "Verify & Switch"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
};

/* ─────────────────────────────────────────
   Left Sidebar (unified for all roles)
───────────────────────────────────────── */
const Sidebar = ({ role = 'Admin', collapsed, onToggle, isMobileOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const [activeSection, setActiveSection] = useState('_section_dashboard');

    const toggleSection = (sectionName) => {
        setActiveSection(prev => prev === sectionName ? null : sectionName);
    };

    const safeRole = role || 'Admin';
    const items = menuItems[safeRole] || [];

    const preparedItems = items.map(item => {
        // 1. Check Institute-level global controls first
        const instControls = user?.institute?.controls || (user?.role === 'Institute' ? user?.controls : null);
        if (instControls) {
            const name = item.name.toLowerCase();
            let instControlKey = '';
            if (name === 'drive') instControlKey = 'drive';
            else if (name === 'notes') instControlKey = 'notes';
            else if (name === 'chat') instControlKey = 'chat';
            else if (name === 'tools') instControlKey = 'tools';
            else if (name === 'courses') instControlKey = 'course';
            else if (name === 'subjects') instControlKey = 'subject';
            else if (name === 'activities' || name === 'student activities' || name === 'my activities') instControlKey = 'activities';
            else if (name === 'students') instControlKey = 'student';
            else if (name === 'teachers') instControlKey = 'teacher';
            else if (name === 'editors') instControlKey = 'editor';
            else if (name === 'accountants') instControlKey = 'accountant';
            else if (name === 'my staff' || name === 'all staff' || name === 'staff') instControlKey = 'staff';
            else if (name === 'parents') instControlKey = 'parent';
            else if (name === 'dashboard' && user?.role === 'Institute') instControlKey = 'dashboard';

            if (instControlKey) {
                const ctrl = instControls[instControlKey];
                if (ctrl && ctrl.show === false && ctrl.mode === 'disable') {
                    return { ...item, disabled: true, note: ctrl.note || 'Disabled by Institute Administrator' };
                }
            }
        }

        // 2. Check User-level individual controls
        const userRole = user?.role;
        let userControls = null;
        if (userRole === 'Student') userControls = user.studentProfile?.controls;
        else if (userRole === 'Teacher') userControls = user.teacherProfile?.controls;
        else if (userRole === 'Editor') userControls = user.editorProfile?.controls;
        else if (userRole === 'Accountant') userControls = user.accountantProfile?.controls;
        else if (userRole === 'Marketer') userControls = user.marketerProfile?.controls;
        else if (userRole === 'Staff') userControls = user.staffProfile?.controls;
        else if (userRole === 'Parent') userControls = user.parentProfile?.controls;

        if (userControls) {
            const name = item.name.toLowerCase();
            let controlKey = '';
            if (userRole === 'Student') {
                if (name === 'my activities') controlKey = 'myActivity';
                else if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'fee portal') controlKey = 'feePortal';
                else if (name === 'tools') controlKey = 'tools';
                else if (name === 'my snapshots') controlKey = 'mySnapshots';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Teacher') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'student activities') controlKey = 'studentActivities';
                else if (name === 'evaluate') controlKey = 'evaluate';
                else if (name === 'snapshots') controlKey = 'snapshots';
                else if (name === 'tools') controlKey = 'tools';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Editor') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'teachers') controlKey = 'teachers';
                else if (name === 'courses') controlKey = 'courses';
                else if (name === 'subjects') controlKey = 'subjects';
                else if (name === 'activities') controlKey = 'activities';
                else if (name === 'tools') controlKey = 'tools';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Accountant') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'fee portal') controlKey = 'feePortal';
                else if (name === 'attendance') controlKey = 'attendance';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Marketer') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Staff') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'task') controlKey = 'task';
                else if (name === 'attendance') controlKey = 'attendance';
                else if (name === 'salary') controlKey = 'salary';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Parent') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'student fee') controlKey = 'studentFee';
                else if (name === 'attendance') controlKey = 'attendance';
                else if (name === 'activities') controlKey = 'activities';
            }

            if (controlKey) {
                const ctrl = userControls[controlKey];
                if (ctrl && ctrl.enabled === false && ctrl.mode === 'disable') {
                    return { ...item, disabled: true, note: ctrl.note || 'Disabled by Administrator' };
                }
            }
        }

        return item;
    });

    const isMenuItemAllowed = (item) => {
        if (item.name.startsWith('_section_')) return true;
        // Super Admins bypass all controls
        if (user?.role === 'Admin') return true;

        // 1. Check Institute-level global controls first if user belongs to an institute
        const instControls = user?.institute?.controls || (user?.role === 'Institute' ? user?.controls : null);
        if (instControls) {
            const name = item.name.toLowerCase();
            let instControlKey = '';
            if (name === 'drive') instControlKey = 'drive';
            else if (name === 'notes') instControlKey = 'notes';
            else if (name === 'chat') instControlKey = 'chat';
            else if (name === 'tools') instControlKey = 'tools';
            else if (name === 'courses') instControlKey = 'course';
            else if (name === 'subjects') instControlKey = 'subject';
            else if (name === 'activities' || name === 'student activities' || name === 'my activities') instControlKey = 'activities';
            else if (name === 'students') instControlKey = 'student';
            else if (name === 'teachers') instControlKey = 'teacher';
            else if (name === 'editors') instControlKey = 'editor';
            else if (name === 'accountants') instControlKey = 'accountant';
            else if (name === 'my staff' || name === 'all staff' || name === 'staff' || name === 'staff management') instControlKey = 'staff';
            else if (name === 'asset management' || name === 'asset mgt' || name === 'assets') instControlKey = 'assets';
            else if (name === 'parents') instControlKey = 'parent';
            else if (name === 'dashboard' && user?.role === 'Institute') instControlKey = 'dashboard';

            if (instControlKey) {
                const ctrl = instControls[instControlKey];
                if (ctrl && ctrl.show === false && ctrl.mode === 'hide') {
                    return false;
                }
            }
        }

        // 2. Check User-level individual controls
        const userRole = user?.role;
        let userControls = null;
        if (userRole === 'Student') userControls = user.studentProfile?.controls;
        else if (userRole === 'Teacher') userControls = user.teacherProfile?.controls;
        else if (userRole === 'Editor') userControls = user.editorProfile?.controls;
        else if (userRole === 'Accountant') userControls = user.accountantProfile?.controls;
        else if (userRole === 'Marketer') userControls = user.marketerProfile?.controls;
        else if (userRole === 'Staff') userControls = user.staffProfile?.controls;
        else if (userRole === 'Parent') userControls = user.parentProfile?.controls;

        if (userControls) {
            const name = item.name.toLowerCase();
            let controlKey = '';
            if (userRole === 'Student') {
                if (name === 'my activities') controlKey = 'myActivity';
                else if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'fee portal') controlKey = 'feePortal';
                else if (name === 'tools') controlKey = 'tools';
                else if (name === 'my snapshots') controlKey = 'mySnapshots';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Teacher') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'student activities') controlKey = 'studentActivities';
                else if (name === 'evaluate') controlKey = 'evaluate';
                else if (name === 'snapshots') controlKey = 'snapshots';
                else if (name === 'tools') controlKey = 'tools';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Editor') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'teachers') controlKey = 'teachers';
                else if (name === 'courses') controlKey = 'courses';
                else if (name === 'subjects') controlKey = 'subjects';
                else if (name === 'activities') controlKey = 'activities';
                else if (name === 'tools') controlKey = 'tools';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Accountant') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'fee portal') controlKey = 'feePortal';
                else if (name === 'attendance') controlKey = 'attendance';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Marketer') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Staff') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'task') controlKey = 'task';
                else if (name === 'attendance') controlKey = 'attendance';
                else if (name === 'salary') controlKey = 'salary';
                else if (name === 'drive') controlKey = 'drive';
                else if (name === 'notes') controlKey = 'notes';
                else if (name === 'chat') controlKey = 'chat';
            } else if (userRole === 'Parent') {
                if (name === 'dashboard') controlKey = 'dashboard';
                else if (name === 'student fee') controlKey = 'studentFee';
                else if (name === 'attendance') controlKey = 'attendance';
                else if (name === 'activities') controlKey = 'activities';
            }

            if (controlKey) {
                const ctrl = userControls[controlKey];
                if (ctrl && ctrl.enabled === false && ctrl.mode === 'hide') {
                    return false;
                }
            }
        }

        return true;
    };

    const filteredItems = preparedItems.filter(isMenuItemAllowed);

    const handleItemClick = (item) => {
        if (item.disabled) return;
        navigate(item.path);
    };

    const isActive = (path) => {
        if (!path) return false;

        // Match practice tools sub-pages and notes pages to highlight the Tools or Notes sidebar item
        const isToolSubPage = location.pathname.startsWith('/student/practice-tools') ||
            location.pathname.startsWith('/student/notes') ||
            location.pathname.includes('/practice-tools/');

        if (isToolSubPage) {
            if (safeRole !== 'Student') {
                if (location.pathname.startsWith('/student/notes') || location.pathname.includes('/notes')) {
                    if (path === `/${safeRole.toLowerCase()}/notes`) return true;
                } else {
                    if (path === `/${safeRole.toLowerCase()}/tools`) return true;
                }
            } else {
                if (location.pathname.startsWith('/student/notes')) {
                    if (path === '/student/notes') return true;
                } else {
                    if (path === '/student/practice-tools') return true;
                }
            }
        }

        if (path.includes('?')) {
            return (location.pathname + location.search).startsWith(path);
        }
        const baseRolePath = `/${safeRole.toLowerCase()}`;
        if (path === baseRolePath) return location.pathname === path && !location.search;
        return location.pathname.startsWith(path);
    };

    useEffect(() => {
        const activeItem = filteredItems.find(item => !item.name.startsWith('_section_') && isActive(item.path));
        if (activeItem) {
            let currentSection = null;
            for (const item of filteredItems) {
                if (item.name.startsWith('_section_')) {
                    currentSection = item.name;
                }
                if (item === activeItem) {
                    if (currentSection) {
                        setActiveSection(currentSection);
                    }
                    break;
                }
            }
        } else {
            setActiveSection('_section_dashboard');
        }
    }, [location.pathname]);

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
                    {(() => {
                        let currentSection = null;
                        return filteredItems.map((item) => {
                            if (item.name.startsWith('_section_')) {
                                currentSection = item.name;
                                const label = item.name.replace('_section_', '');
                                const isExpanded = activeSection === item.name;

                                if (collapsed) {
                                    return (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => toggleSection(item.name)}
                                            title={`Toggle ${label}`}
                                            className={`flex items-center justify-center w-full py-3 my-2 text-slate-500 hover:text-white transition-all rounded-xl border-none bg-transparent cursor-pointer ${isExpanded ? 'text-indigo-400 bg-white/5' : ''
                                                }`}
                                        >
                                            {item.icon ? <item.icon size={20} /> : <div className="border-t border-slate-800/80 w-8" />}
                                        </button>
                                    );
                                }

                                return (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => toggleSection(item.name)}
                                        className="w-full pt-5 pb-1.5 px-4 flex items-center justify-between text-slate-500 hover:text-slate-300 transition-all select-none border-none bg-transparent cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            {item.icon && <item.icon size={13} className="text-slate-500" />}
                                            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">{label}</span>
                                        </div>
                                        {isExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                                    </button>
                                );
                            }

                            const showItem = currentSection === null || activeSection === currentSection;
                            if (!showItem) return null;

                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => handleItemClick(item)}
                                    title={item.disabled ? (item.note || 'Feature Restricted') : (collapsed ? item.name : undefined)}
                                    className={`flex items-center w-full rounded-xl transition-all duration-200 font-bold text-sm group cursor-pointer
                                        ${collapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-3'}
                                        ${active
                                            ? 'bg-white text-[#0b1329] shadow-lg shadow-black/10'
                                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        }
                                        ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <item.icon size={20} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
                                    {!collapsed && <span>{item.name}</span>}
                                </button>
                            );
                        });
                    })()}
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
                    <nav className="flex-1 space-y-2 overflow-y-auto">
                        {(() => {
                            let currentSection = null;
                            return filteredItems.map((item) => {
                                if (item.name.startsWith('_section_')) {
                                    currentSection = item.name;
                                    const label = item.name.replace('_section_', '');
                                    const isExpanded = activeSection === item.name;

                                    return (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => toggleSection(item.name)}
                                            className="w-full pt-4 pb-1.5 px-4 flex items-center justify-between text-slate-400 hover:text-slate-200 transition-all select-none border-none bg-transparent cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                {item.icon && <item.icon size={13} className="text-slate-400" />}
                                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{label}</span>
                                            </div>
                                            {isExpanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                                        </button>
                                    );
                                }

                                const showItem = currentSection === null || activeSection === currentSection;
                                if (!showItem) return null;

                                const active = isActive(item.path);
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => handleItemClick(item)}
                                        title={item.disabled ? (item.note || 'Feature Restricted') : undefined}
                                        className={`flex items-center space-x-4 w-full p-4 rounded-2xl transition-all font-bold 
                                            ${active
                                                ? 'bg-white text-[#0b1329] shadow-xl shadow-black/10'
                                                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                            }
                                            ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <item.icon size={22} />
                                        <span className="text-base">{item.name}</span>
                                    </button>
                                );
                            });
                        })()}
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
const DashboardLayout = ({ children, role = 'Admin', fullWidth = false, noPadding = false }) => {
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
                className={`flex-1 pt-20 ${noPadding ? 'pb-0 px-0' : 'pb-12 px-4 md:px-8'} ${hasSidebar ? (sidebarCollapsed ? (noPadding ? 'lg:pl-[72px]' : 'lg:pl-[112px]') : (noPadding ? 'lg:pl-[224px]' : 'lg:pl-[264px]')) : ''
                    }`}
            >
                <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} ${noPadding ? 'h-full' : ''} animate-fade-in relative`}>
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
