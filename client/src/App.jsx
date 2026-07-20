import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Lazy Loaded Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const InstituteDashboard = lazy(() => import('./pages/institute/InstituteDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentsList = lazy(() => import('./pages/admin/StudentsList'));
const StudentDetails = lazy(() => import('./pages/admin/StudentDetails'));
const ParentsList = lazy(() => import('./pages/admin/ParentsList'));
const TeachersList = lazy(() => import('./pages/admin/TeachersList'));
const TeacherDetails = lazy(() => import('./pages/admin/TeacherDetails'));
const EditorsList = lazy(() => import('./pages/admin/EditorsList'));
const AccountantsList = lazy(() => import('./pages/admin/AccountantsList'));
const AccountantDashboard = lazy(() => import('./pages/accountant/AccountantDashboard'));
const AssetManagement = lazy(() => import('./pages/accountant/AssetManagement'));
const GuestDashboard = lazy(() => import('./pages/guest/GuestDashboard'));
const UsersList = lazy(() => import('./pages/admin/UsersList'));
const SubjectsList = lazy(() => import('./pages/admin/SubjectsList'));
const MarketersList = lazy(() => import('./pages/admin/MarketersList'));
const MarketerDashboard = lazy(() => import('./pages/marketer/MarketerDashboard'));
const LeadsManagement = lazy(() => import('./pages/marketer/LeadsManagement'));
const AdsManagement = lazy(() => import('./pages/marketer/AdsManagement'));
const ReferralMarketing = lazy(() => import('./pages/marketer/ReferralMarketing'));
const AffiliateMarketing = lazy(() => import('./pages/marketer/AffiliateMarketing'));
const AdminDrive = lazy(() => import('./pages/admin/AdminDrive'));
const TestsList = lazy(() => import('./pages/admin/TestsList'));
const TestBuilder = lazy(() => import('./pages/admin/TestBuilder'));
const EditorDashboard = lazy(() => import('./pages/editor/EditorDashboard'));
const ToolsPage = lazy(() => import('./pages/admin/ToolsPage'));
const InstitutesList = lazy(() => import('./pages/admin/InstitutesList'));
const CoursesList = lazy(() => import('./pages/admin/CoursesList'));
const StudentTests = lazy(() => import('./pages/student/StudentTests'));
const StudentPracticeTools = lazy(() => import('./pages/student/StudentPracticeTools'));
const ShortAnswerTest = lazy(() => import('./pages/student/ShortAnswerTest'));
const ViewTestResult = lazy(() => import('./pages/student/ViewTestResult'));
const StudentPerformance = lazy(() => import('./pages/student/StudentPerformance'));
const EvaluatePage = lazy(() => import('./pages/teacher/EvaluatePage'));
const TeacherActivities = lazy(() => import('./pages/teacher/TeacherActivities'));
const TeacherSnapshots = lazy(() => import('./pages/teacher/TeacherSnapshots'));
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));
const TeacherAttendanceRegister = lazy(() => import('./pages/admin/TeacherAttendanceRegister'));
const TeacherDrive = lazy(() => import('./pages/teacher/TeacherDrive'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChatPage = lazy(() => import('./pages/common/ChatPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TakeTestPage = lazy(() => import('./pages/student/TakeTestPage'));
const PublicTestPage = lazy(() => import('./pages/student/PublicTestPage'));
const PublicResponseViewPage = lazy(() => import('./pages/student/PublicResponseViewPage'));
const ScreenshotToolPage = lazy(() => import('./pages/student/tools/ScreenshotToolPage'));
const ScreenRecorderPage = lazy(() => import('./pages/student/tools/ScreenRecorderPage'));
const VoiceRecorderPage = lazy(() => import('./pages/student/tools/VoiceRecorderPage'));
const VideoRecorderPage = lazy(() => import('./pages/student/tools/VideoRecorderPage'));
const WebCallingPage = lazy(() => import('./pages/student/tools/WebCallingPage'));
const FileUploadPage = lazy(() => import('./pages/student/tools/FileUploadPage'));
const NotesPage = lazy(() => import('./pages/student/tools/NotesPage'));
const StudentFeePortal = lazy(() => import('./pages/student/StudentFeePortal'));
const AdminFeePortal = lazy(() => import('./pages/admin/AdminFeePortal'));
const SharedAudioPage = lazy(() => import('./pages/SharedAudioPage'));
const SharedVideoPage = lazy(() => import('./pages/SharedVideoPage'));
const MobileCallPage = lazy(() => import('./pages/common/MobileCallPage'));
const SharedScreenshotPage = lazy(() => import('./pages/SharedScreenshotPage'));
const ApplicationsTrackingPage = lazy(() => import('./pages/ApplicationsTrackingPage'));
const ComingSoon = lazy(() => import('./components/common/ComingSoon'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentFee = lazy(() => import('./pages/parent/ParentFee'));
const ParentAttendance = lazy(() => import('./pages/parent/ParentAttendance'));
const ParentActivities = lazy(() => import('./pages/parent/ParentActivities'));
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const StaffTask = lazy(() => import('./pages/staff/StaffTask'));
const StaffAttendance = lazy(() => import('./pages/staff/StaffAttendance'));
const StaffSalary = lazy(() => import('./pages/staff/StaffSalary'));
const StaffList = lazy(() => import('./pages/admin/StaffList'));
const AdminStaffAttendance = lazy(() => import('./pages/admin/AdminStaffAttendance'));
const AdminStaffSalary = lazy(() => import('./pages/admin/AdminStaffSalary'));
const AdminStaffTask = lazy(() => import('./pages/admin/AdminStaffTask'));
const InstituteStaff = lazy(() => import('./pages/institute/InstituteStaff'));
const StaffTaskDetailPage = lazy(() => import('./pages/institute/StaffTaskDetailPage'));

// Destructured imports (can be lazily imported individually or kept static)
import { InstituteStaffAttendance, InstituteStaffSalary, InstituteStaffTask } from './pages/institute/InstituteStaffPages';

// Statically Imported Providers & Utilities
import { UserProfileProvider } from './components/common/UserProfileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ScreenshotProvider } from './context/ScreenshotContext';
import { Toaster } from 'react-hot-toast';
import { Lock } from 'lucide-react';


// Mock components for now
const PrivateRoute = ({ children, role }) => {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" />;
    }

    if (user.isActive === false) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
                <div className="max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-[30px] p-8 shadow-2xl flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-xl font-black text-white mb-2">Account Deactivated</h1>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                        Your account has been disabled by the administrator. Please contact support or your institute head for assistance.
                    </p>
                    <span className="px-3.5 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-wider">
                        disabled by admin
                    </span>
                    <button 
                        onClick={logout} 
                        className="mt-6 px-6 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-sm hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    if (role) {
        const roles = Array.isArray(role) ? role : [role];
        if (!roles.includes(user.role)) {
            return <Navigate to="/" />;
        }
    }

    return children;
};

const SubdomainRedirectHandler = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (loading) return;

        const hostname = window.location.hostname;
        const path = location.pathname;

        // Skip redirect logic for localhost, local IPs, or dev subdomain (allow root domain digitalstudyacademy.com to redirect)
        const parts = hostname.split('.');
        const isLocalHost = hostname.includes('localhost') || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith('dev.') || hostname.includes('pinggy') || hostname.includes('lhr.life') || hostname.includes('loca.lt') || hostname.includes('serveo');
        if (isLocalHost) {
            return;
        }

        const subdomain = parts[0].toLowerCase();
        // Public paths allowed without login
        const isPublicPath = path.startsWith('/share/') || path === '/track-applications' || path.startsWith('/mobile-call');

        if (!user) {
            // Unauthenticated users are forced to landing page for login (except on public paths)
            if (subdomain !== 'www' && !isPublicPath) {
                window.location.href = `${window.location.protocol}//www.digitalstudyacademy.com/login`;
            }
            return;
        }

        // Mappings for roles to expected subdomains
        const roleSubdomains = {
            Admin: 'admin',
            Teacher: 'teacher',
            Student: 'student',
            Editor: 'editor',
            Institute: 'institute',
            Accountant: 'account',
            Marketer: 'marketer',
            Staff: 'staff'
        };

        const expectedSubdomain = roleSubdomains[user.role];

        // 1. Handle feature and role subdomains root routing
        if (path === '/') {
            if (subdomain === expectedSubdomain) {
                const redirectPath = user.role === 'Student' ? '/student/tests' : `/${user.role.toLowerCase()}`;
                window.location.href = `${window.location.protocol}//${hostname}${redirectPath}`;
                return;
            }
            if (subdomain === 'notes') {

                window.location.href = `${window.location.protocol}//notes.digitalstudyacademy.com/${user.role.toLowerCase()}/notes`;
                return;
            }
            if (subdomain === 'drive') {
                window.location.href = `${window.location.protocol}//drive.digitalstudyacademy.com/${user.role.toLowerCase()}/drive`;
                return;
            }
            if (subdomain === 'chat') {
                window.location.href = `${window.location.protocol}//chat.digitalstudyacademy.com/${user.role.toLowerCase()}/chat`;
                return;
            }
            if (subdomain === 'feeportal') {
                window.location.href = `${window.location.protocol}//feeportal.digitalstudyacademy.com/${user.role.toLowerCase()}/fee-portal`;
                return;
            }
            if (subdomain === 'attandence') {
                const attPath = user.role === 'Admin' ? '/admin/attendance-portal' : '/teacher/attendance';
                window.location.href = `${window.location.protocol}//attandence.digitalstudyacademy.com${attPath}`;
                return;
            }
        }

        // 2. Enforce role subdomain routing (skip for special feature subdomains)
        const specialSubdomains = ['notes', 'drive', 'chat', 'feeportal', 'attandence'];
        if (specialSubdomains.includes(subdomain)) {
            return;
        }

        if ((subdomain === 'www' || subdomain === 'landing' || parts.length === 2 || (expectedSubdomain && subdomain !== expectedSubdomain)) && !isPublicPath) {
            if (expectedSubdomain) {
                const targetHost = `${expectedSubdomain}.digitalstudyacademy.com`;
                const redirectPath = user.role === 'Student' ? '/student/tests' : `/${user.role.toLowerCase()}`;
                window.location.href = `${window.location.protocol}//${targetHost}${redirectPath}`;
            }
        }
    }, [user, loading, location.pathname]);

    return children;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SubdomainRedirectHandler>
                    <SocketProvider>
                        <UserProfileProvider>
                            <ScreenshotProvider>
                                <Toaster position="top-right" reverseOrder={false} />
                                <Suspense fallback={
                                    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                    </div>
                                }>
                                    <Routes>
                                        <Route path="/" element={<LandingPage />} />
                                        <Route path="/login" element={<LoginPage />} />

                                        {/* Public Shared Recording Page — no auth */}
                                        <Route path="/share/voice/:id" element={<SharedAudioPage />} />
                                        <Route path="/share/video/:id" element={<SharedVideoPage />} />
                                        <Route path="/share/screenshot/:id" element={<SharedScreenshotPage />} />
                                        <Route path="/track-applications" element={<ApplicationsTrackingPage />} />
                                        <Route path="/mobile-call" element={<MobileCallPage />} />

                                        {/* Institute Routes */}
                                        <Route path="/institute" element={
                                            <PrivateRoute role="Institute">
                                                <InstituteDashboard />
                                            </PrivateRoute>
                                        } />
                                         <Route path="/institute/students" element={
                                             <PrivateRoute role="Institute">
                                                 <StudentsList />
                                             </PrivateRoute>
                                         } />
                                         <Route path="/institute/parents" element={
                                             <PrivateRoute role="Institute">
                                                 <ParentsList />
                                             </PrivateRoute>
                                         } />
                                        <Route path="/institute/teachers" element={
                                            <PrivateRoute role="Institute">
                                                <TeachersList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/editors" element={
                                            <PrivateRoute role="Institute">
                                                <EditorsList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/accountants" element={
                                            <PrivateRoute role="Institute">
                                                <AccountantsList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/marketers" element={
                                            <PrivateRoute role="Institute">
                                                <MarketersList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/courses" element={
                                            <PrivateRoute role="Institute">
                                                <CoursesList />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/institute/subjects" element={
                                            <PrivateRoute role="Institute">
                                                <SubjectsList />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/institute/activities" element={
                                            <PrivateRoute role="Institute">
                                                <TestsList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/chat" element={
                                            <PrivateRoute role="Institute">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/activities-builder" element={
                                            <PrivateRoute role="Institute">
                                                <TestBuilder />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/activities/edit/:id" element={
                                            <PrivateRoute role="Institute">
                                                <TestBuilder />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/fee-portal" element={
                                            <PrivateRoute role={['Institute', 'Admin']}>
                                                <AdminFeePortal />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/drive" element={
                                            <PrivateRoute role="Institute">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/notes" element={
                                            <PrivateRoute role="Institute">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />

                                         <Route path="/institute/users" element={
                                             <PrivateRoute role="Institute">
                                                 <UsersList />
                                             </PrivateRoute>
                                         } />
                                         <Route path="/institute/staff" element={
                                            <PrivateRoute role="Institute">
                                                <InstituteStaff />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/staff/attendance" element={
                                            <PrivateRoute role="Institute">
                                                <InstituteStaffAttendance />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/staff/salary" element={
                                            <PrivateRoute role="Institute">
                                                <InstituteStaffSalary />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/staff/task" element={
                                            <PrivateRoute role="Institute">
                                                <InstituteStaffTask />
                                            </PrivateRoute>
                                        } />
                                         <Route path="/institute/staff-task-detail/:staffName" element={
                                             <PrivateRoute role="Institute">
                                                 <StaffTaskDetailPage />
                                             </PrivateRoute>
                                         } />
                                         <Route path="/institute/assets" element={
                                             <PrivateRoute role="Institute">
                                                 <AssetManagement />
                                             </PrivateRoute>
                                         } />

                                        {/* Admin Routes */}
                                        <Route path="/admin" element={
                                            <PrivateRoute role="Admin">
                                                <AdminDashboard />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/users" element={
                                            <PrivateRoute role="Admin">
                                                <UsersList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/subjects" element={
                                            <PrivateRoute role="Admin">
                                                <SubjectsList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/institutes" element={
                                            <PrivateRoute role="Admin">
                                                <InstitutesList />
                                            </PrivateRoute>
                                        } />
                                         <Route path="/admin/students" element={
                                             <PrivateRoute role="Admin">
                                                 <StudentsList />
                                             </PrivateRoute>
                                         } />
                                         <Route path="/admin/parents" element={
                                             <PrivateRoute role="Admin">
                                                 <ParentsList />
                                             </PrivateRoute>
                                         } />
                                        <Route path="/admin/students/:id" element={
                                            <PrivateRoute role="Admin">
                                                <StudentDetails />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/admin/teachers" element={
                                            <PrivateRoute role="Admin">
                                                <TeachersList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/teachers/:id" element={
                                            <PrivateRoute role="Admin">
                                                <TeacherDetails />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/editors" element={
                                            <PrivateRoute role="Admin">
                                                <EditorsList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/accountants" element={
                                            <PrivateRoute role="Admin">
                                                <AccountantsList />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/admin/courses" element={
                                            <PrivateRoute role="Admin">
                                                <CoursesList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/activities" element={
                                            <PrivateRoute role="Admin">
                                                <TestsList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/chat" element={
                                            <PrivateRoute role="Admin">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/marketers" element={
                                            <PrivateRoute role="Admin">
                                                <MarketersList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/attendance-portal" element={
                                            <PrivateRoute role="Admin">
                                                <ComingSoon title="Coming Soon" message="The Attendance Portal is under development and will be available shortly. Stay tuned!" />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/drive" element={
                                            <PrivateRoute role="Admin">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/notes" element={
                                            <PrivateRoute role="Admin">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/tools" element={
                                            <PrivateRoute role="Admin">
                                                <ToolsPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/institute/tools" element={
                                            <PrivateRoute role="Institute">
                                                <ToolsPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/teacher/tools" element={
                                            <PrivateRoute role="Teacher">
                                                <ToolsPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/editor/tools" element={
                                            <PrivateRoute role="Editor">
                                                <ToolsPage />
                                            </PrivateRoute>
                                        } />


                                        <Route path="/admin/activities-builder" element={
                                            <PrivateRoute role={['Admin', 'Editor']}>
                                                <TestBuilder />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/activities-edit/:id" element={
                                            <PrivateRoute role={['Admin', 'Editor']}>
                                                <TestBuilder />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/fee-portal" element={
                                            <PrivateRoute role="Admin">
                                                <ComingSoon title="Coming Soon" message="The Fee Portal is under development and will be available shortly. Stay tuned!" />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/admin/staff" element={
                                            <PrivateRoute role="Admin">
                                                <StaffList />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/staff/attendance" element={
                                            <PrivateRoute role="Admin">
                                                <AdminStaffAttendance />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/admin/staff/salary" element={
                                            <PrivateRoute role="Admin">
                                                <AdminStaffSalary />
                                            </PrivateRoute>
                                        } />
                                         <Route path="/admin/staff/task" element={
                                             <PrivateRoute role="Admin">
                                                 <AdminStaffTask />
                                             </PrivateRoute>
                                         } />
                                         <Route path="/admin/assets" element={
                                             <PrivateRoute role="Admin">
                                                 <AssetManagement />
                                             </PrivateRoute>
                                         } />

                                        {/* Accountant Routes */}
                                        <Route path="/accountant" element={
                                            <PrivateRoute role="Accountant">
                                                <AccountantDashboard />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/accountant/fee-portal" element={
                                            <PrivateRoute role="Accountant">
                                                <AdminFeePortal />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/accountant/assets" element={
                                            <PrivateRoute role="Accountant">
                                                <AssetManagement />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/accountant/drive" element={
                                            <PrivateRoute role="Accountant">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/accountant/notes" element={
                                            <PrivateRoute role="Accountant">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/accountant/chat" element={
                                            <PrivateRoute role="Accountant">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />

                                        {/* Marketer Routes */}
                                        <Route path="/marketer" element={
                                            <PrivateRoute role="Marketer">
                                                <MarketerDashboard />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/marketer/leads" element={
                                            <PrivateRoute role="Marketer">
                                                <LeadsManagement />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/marketer/ads" element={
                                            <PrivateRoute role="Marketer">
                                                <AdsManagement />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/marketer/referrals" element={
                                            <PrivateRoute role="Marketer">
                                                <ReferralMarketing />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/marketer/affiliates" element={
                                            <PrivateRoute role="Marketer">
                                                <AffiliateMarketing />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/marketer/drive" element={
                                            <PrivateRoute role="Marketer">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/marketer/notes" element={
                                            <PrivateRoute role="Marketer">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/marketer/chat" element={
                                            <PrivateRoute role="Marketer">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />

                                        {/* Guest Routes */}
                                        <Route path="/guest" element={
                                            <PrivateRoute role="Guest">
                                                <GuestDashboard />
                                            </PrivateRoute>
                                        } />

                                        {/* Editor Routes */}
                                        <Route path="/editor" element={
                                            <PrivateRoute role="Editor">
                                                <EditorDashboard />
                                            </PrivateRoute>
                                        } />

                                        <Route path='/editor/teachers' element={
                                            <PrivateRoute role="Editor">
                                                <TeachersList />
                                            </PrivateRoute>
                                        } />

                                        <Route path='/editor/courses' element={
                                            <PrivateRoute role="Editor">
                                                <CoursesList />
                                            </PrivateRoute>
                                        } />

                                        <Route path='/editor/subjects' element={
                                            <PrivateRoute role="Editor">
                                                <SubjectsList />
                                            </PrivateRoute>
                                        } />

                                        <Route path='/editor/activities' element={
                                            <PrivateRoute role="Editor">
                                                <TestsList />
                                            </PrivateRoute>
                                        } />

                                        <Route path='/editor/activities-builder' element={
                                            <PrivateRoute role="Editor">
                                                <TestBuilder />
                                            </PrivateRoute>
                                        } />

                                        <Route path='/editor/activities-edit/:id' element={
                                            <PrivateRoute role="Editor">
                                                <TestBuilder />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/editor/chat" element={
                                            <PrivateRoute role="Editor">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/editor/drive" element={
                                            <PrivateRoute role="Editor">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/editor/notes" element={
                                            <PrivateRoute role="Editor">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />

                                        {/* Teacher Routes */}
                                        <Route path="/teacher" element={
                                            <PrivateRoute role="Teacher">
                                                <TeacherDashboard />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/teacher/activities" element={
                                            <PrivateRoute role="Teacher">
                                                <TeacherActivities />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/teacher/evaluate" element={
                                            <PrivateRoute role="Teacher">
                                                <EvaluatePage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/teacher/evaluate/:id" element={
                                            <PrivateRoute role="Teacher">
                                                <EvaluatePage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/teacher/activities-builder" element={
                                            <PrivateRoute role="Teacher">
                                                <TestBuilder />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/teacher/chat" element={
                                            <PrivateRoute role="Teacher">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/teacher/snapshots" element={
                                            <PrivateRoute role="Teacher">
                                                <TeacherSnapshots />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/teacher/attendance" element={
                                            <PrivateRoute role="Teacher">
                                                <TeacherAttendance />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/teacher/drive" element={
                                            <PrivateRoute role="Teacher">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/teacher/notes" element={
                                            <PrivateRoute role="Teacher">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />

                                        {/* Student Routes */}
                                        <Route path="/student" element={
                                            <PrivateRoute role="Student">
                                                <StudentDashboard />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/fee-portal" element={
                                            <PrivateRoute role="Student">
                                                <StudentFeePortal />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/tests" element={
                                            <PrivateRoute role="Student">
                                                <StudentTests />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/practice-tools" element={
                                            <PrivateRoute role="Student">
                                                <StudentPracticeTools />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/tests/short-answer" element={
                                            <PrivateRoute role="Student">
                                                <ShortAnswerTest />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/take-test/:id" element={
                                            <PrivateRoute role="Student">
                                                <ShortAnswerTest />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/chat" element={
                                            <PrivateRoute role="Student">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/drive" element={
                                            <PrivateRoute role="Student">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/test-result/:id" element={
                                            <PrivateRoute role={['Student', 'Teacher', 'Admin', 'Parent']}>
                                                <ViewTestResult />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/practice-tools/screenshot" element={
                                            <PrivateRoute role={['Student', 'Teacher', 'Admin', 'Editor', 'Institute']}>
                                                <ScreenshotToolPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/practice-tools/screen-recorder" element={
                                            <PrivateRoute role={['Student', 'Teacher', 'Admin', 'Editor', 'Institute']}>
                                                <ScreenRecorderPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/practice-tools/voice-recorder" element={
                                            <PrivateRoute role={['Student', 'Teacher', 'Admin', 'Editor', 'Institute']}>
                                                <VoiceRecorderPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/practice-tools/video-recorder" element={
                                            <PrivateRoute role={['Student', 'Teacher', 'Admin', 'Editor', 'Institute']}>
                                                <VideoRecorderPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/practice-tools/web-calling" element={
                                            <PrivateRoute role={['Student', 'Teacher', 'Admin', 'Editor', 'Institute']}>
                                                <WebCallingPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/practice-tools/file-uploader" element={
                                            <PrivateRoute role={['Student', 'Teacher', 'Admin', 'Editor', 'Institute']}>
                                                <FileUploadPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/notes" element={
                                            <PrivateRoute role="Student">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/student/performance" element={
                                            <PrivateRoute role="Student">
                                                <StudentPerformance />
                                            </PrivateRoute>
                                        } />

                                        {/* Staff Routes */}
                                        <Route path="/staff" element={
                                            <PrivateRoute role="Staff">
                                                <StaffDashboard />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/staff/task" element={
                                            <PrivateRoute role="Staff">
                                                <StaffTask />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/staff/attendance" element={
                                            <PrivateRoute role="Staff">
                                                <StaffAttendance />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/staff/salary" element={
                                            <PrivateRoute role="Staff">
                                                <StaffSalary />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/staff/chat" element={
                                            <PrivateRoute role="Staff">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/staff/notes" element={
                                            <PrivateRoute role="Staff">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/staff/drive" element={
                                            <PrivateRoute role="Staff">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />

                                        {/* Parent Routes */}
                                        <Route path="/parent" element={
                                            <PrivateRoute role="Parent">
                                                <ParentDashboard />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/parent/fee" element={
                                            <PrivateRoute role="Parent">
                                                <ParentFee />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/parent/attendance" element={
                                            <PrivateRoute role="Parent">
                                                <ParentAttendance />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/parent/activities" element={
                                            <PrivateRoute role="Parent">
                                                <ParentActivities />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/parent/chat" element={
                                            <PrivateRoute role="Parent">
                                                <ChatPage />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/parent/drive" element={
                                            <PrivateRoute role="Parent">
                                                <AdminDrive />
                                            </PrivateRoute>
                                        } />
                                        <Route path="/parent/notes" element={
                                            <PrivateRoute role="Parent">
                                                <NotesPage />
                                            </PrivateRoute>
                                        } />

                                        <Route path="/profile" element={
                                            <PrivateRoute>
                                                <ProfilePage />
                                            </PrivateRoute>
                                        } />

                                        {/* Public: shared test link — handles auth internally */}
                                        <Route path="/take-test/:id" element={<TakeTestPage />} />
                                        <Route path="/public-test/:id" element={<PublicTestPage />} />
                                        <Route path="/public-test/response/:submissionId" element={<PublicResponseViewPage />} />
                                        <Route path="/shared/test-result/:id" element={<ViewTestResult isSharedView={true} />} />

                                        {/* 404 – catch all unmatched routes */}
                                        <Route path="*" element={<NotFoundPage />} />

                                    </Routes>
                                </Suspense>
                            </ScreenshotProvider>
                        </UserProfileProvider>
                    </SocketProvider>
                </SubdomainRedirectHandler>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
