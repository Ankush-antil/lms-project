import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';

import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import InstituteDashboard from './pages/institute/InstituteDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentsList from './pages/admin/StudentsList';
import StudentDetails from './pages/admin/StudentDetails';
import ParentsList from './pages/admin/ParentsList';
import TeachersList from './pages/admin/TeachersList';
import TeacherDetails from './pages/admin/TeacherDetails';
import EditorsList from './pages/admin/EditorsList';
import AccountantsList from './pages/admin/AccountantsList';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import UsersList from './pages/admin/UsersList';
import SubjectsList from './pages/admin/SubjectsList';
import MarketersList from './pages/admin/MarketersList';
import AdminDrive from './pages/admin/AdminDrive';

import TestsList from './pages/admin/TestsList';
import TestBuilder from './pages/admin/TestBuilder';
import EditorDashboard from './pages/editor/EditorDashboard';
import ToolsPage from './pages/admin/ToolsPage';

import InstitutesList from './pages/admin/InstitutesList';
import CoursesList from './pages/admin/CoursesList';
import StudentTests from './pages/student/StudentTests';
import StudentPracticeTools from './pages/student/StudentPracticeTools';
import ShortAnswerTest from './pages/student/ShortAnswerTest';
import ViewTestResult from './pages/student/ViewTestResult';
import StudentPerformance from './pages/student/StudentPerformance';
import EvaluatePage from './pages/teacher/EvaluatePage';
import TeacherActivities from './pages/teacher/TeacherActivities';
import TeacherSnapshots from './pages/teacher/TeacherSnapshots';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherAttendanceRegister from './pages/admin/TeacherAttendanceRegister';
import TeacherDrive from './pages/teacher/TeacherDrive';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/common/ChatPage';
import NotFoundPage from './pages/NotFoundPage';
import TakeTestPage from './pages/student/TakeTestPage';
import PublicTestPage from './pages/student/PublicTestPage';
import PublicResponseViewPage from './pages/student/PublicResponseViewPage';
import ScreenshotToolPage from './pages/student/tools/ScreenshotToolPage';
import ScreenRecorderPage from './pages/student/tools/ScreenRecorderPage';
import VoiceRecorderPage from './pages/student/tools/VoiceRecorderPage';
import VideoRecorderPage from './pages/student/tools/VideoRecorderPage';
import WebCallingPage from './pages/student/tools/WebCallingPage';
import FileUploadPage from './pages/student/tools/FileUploadPage';
import NotesPage from './pages/student/tools/NotesPage';
import StudentFeePortal from './pages/student/StudentFeePortal';
import AdminFeePortal from './pages/admin/AdminFeePortal';
import SharedAudioPage from './pages/SharedAudioPage';
import SharedVideoPage from './pages/SharedVideoPage';
import MobileCallPage from './pages/common/MobileCallPage';
import SharedScreenshotPage from './pages/SharedScreenshotPage';
import ApplicationsTrackingPage from './pages/ApplicationsTrackingPage';
import ComingSoon from './components/common/ComingSoon';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentFee from './pages/parent/ParentFee';
import ParentAttendance from './pages/parent/ParentAttendance';
import ParentActivities from './pages/parent/ParentActivities';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffTask from './pages/staff/StaffTask';
import StaffAttendance from './pages/staff/StaffAttendance';
import StaffSalary from './pages/staff/StaffSalary';
import StaffList from './pages/admin/StaffList';
import AdminStaffAttendance from './pages/admin/AdminStaffAttendance';
import AdminStaffSalary from './pages/admin/AdminStaffSalary';
import AdminStaffTask from './pages/admin/AdminStaffTask';
import InstituteStaff from './pages/institute/InstituteStaff';
import StaffTaskDetailPage from './pages/institute/StaffTaskDetailPage';
import { InstituteStaffAttendance, InstituteStaffSalary, InstituteStaffTask } from './pages/institute/InstituteStaffPages';
import { UserProfileProvider } from './components/common/UserProfileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ScreenshotProvider } from './context/ScreenshotContext';
import { Toaster } from 'react-hot-toast';


// Mock components for now
const PrivateRoute = ({ children, role }) => {
    const { user, loading } = useAuth();

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
            if (subdomain !== 'landing' && !isPublicPath) {
                window.location.href = `${window.location.protocol}//landing.digitalstudyacademy.com/login`;
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

        if ((subdomain === 'landing' || (expectedSubdomain && subdomain !== expectedSubdomain)) && !isPublicPath) {
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
                                    <PrivateRoute role="Student">
                                        <ScreenshotToolPage />
                                    </PrivateRoute>
                                } />
                                <Route path="/student/practice-tools/screen-recorder" element={
                                    <PrivateRoute role="Student">
                                        <ScreenRecorderPage />
                                    </PrivateRoute>
                                } />
                                <Route path="/student/practice-tools/voice-recorder" element={
                                    <PrivateRoute role="Student">
                                        <VoiceRecorderPage />
                                    </PrivateRoute>
                                } />
                                <Route path="/student/practice-tools/video-recorder" element={
                                    <PrivateRoute role="Student">
                                        <VideoRecorderPage />
                                    </PrivateRoute>
                                } />
                                <Route path="/student/practice-tools/web-calling" element={
                                    <PrivateRoute role="Student">
                                        <WebCallingPage />
                                    </PrivateRoute>
                                } />
                                <Route path="/student/practice-tools/file-uploader" element={
                                    <PrivateRoute role="Student">
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
                        </ScreenshotProvider>
                    </UserProfileProvider>
                </SocketProvider>
            </SubdomainRedirectHandler>
        </AuthProvider>
    </BrowserRouter>
);
}

export default App;
