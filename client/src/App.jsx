import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import InstituteDashboard from './pages/institute/InstituteDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentsList from './pages/admin/StudentsList';
import StudentDetails from './pages/admin/StudentDetails';
import TeachersList from './pages/admin/TeachersList';
import TeacherDetails from './pages/admin/TeacherDetails';
import EditorsList from './pages/admin/EditorsList';

import TestsList from './pages/admin/TestsList';
import TestBuilder from './pages/admin/TestBuilder';
import EditorDashboard from './pages/editor/EditorDashboard';
// import ToolsPage from './pages/admin/ToolsPage';

import InstitutesList from './pages/admin/InstitutesList';
import CoursesList from './pages/admin/CoursesList';
import StudentTests from './pages/student/StudentTests';
import ShortAnswerTest from './pages/student/ShortAnswerTest';
import ViewTestResult from './pages/student/ViewTestResult';
import EvaluatePage from './pages/teacher/EvaluatePage';
import TeacherActivities from './pages/teacher/TeacherActivities';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import TakeTestPage from './pages/student/TakeTestPage';
import PublicTestPage from './pages/student/PublicTestPage';
import { UserProfileProvider } from './components/common/UserProfileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
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

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <UserProfileProvider>
                        <Toaster position="top-right" reverseOrder={false} />
                        <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />

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
                        <Route path="/institute/courses" element={
                            <PrivateRoute role="Institute">
                                <CoursesList />
                            </PrivateRoute>
                        } />
                        <Route path="/institute/tests" element={
                            <PrivateRoute role="Institute">
                                <TestsList />
                            </PrivateRoute>
                        } />
                        <Route path="/institute/tests/builder" element={
                            <PrivateRoute role="Institute">
                                <TestBuilder />
                            </PrivateRoute>
                        } />
                        <Route path="/institute/tests/edit/:id" element={
                            <PrivateRoute role="Institute">
                                <TestBuilder />
                            </PrivateRoute>
                        } />

                        {/* Admin Routes */}
                        <Route path="/admin" element={
                            <PrivateRoute role="Admin">
                                <AdminDashboard />
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

                        <Route path="/admin/courses" element={
                            <PrivateRoute role="Admin">
                                <CoursesList />
                            </PrivateRoute>
                        } />
                        <Route path="/admin/tests" element={
                            <PrivateRoute role="Admin">
                                <TestsList />
                            </PrivateRoute>
                        } />
                        {/* <Route path="/admin/tools" element={
                            <PrivateRoute role="Admin">
                                <ToolsPage />
                            </PrivateRoute>
                        } /> */}


                        <Route path="/admin/tests/builder" element={
                            <PrivateRoute role={['Admin', 'Editor']}>
                                <TestBuilder />
                            </PrivateRoute>
                        } />
                        <Route path="/admin/tests/edit/:id" element={
                            <PrivateRoute role={['Admin', 'Editor']}>
                                <TestBuilder />
                            </PrivateRoute>
                        } />

                        {/* Editor Routes */}
                        <Route path="/editor" element={
                            <PrivateRoute role="Editor">
                                <EditorDashboard />
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

                        {/* Student Routes */}
                        <Route path="/student" element={
                            <PrivateRoute role="Student">
                                <StudentDashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/student/tests" element={
                            <PrivateRoute role="Student">
                                <StudentTests />
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
                        <Route path="/student/test-result/:id" element={
                            <PrivateRoute role={['Student', 'Teacher', 'Admin']}>
                                <ViewTestResult />
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
                        <Route path="/shared/test-result/:id" element={<ViewTestResult isSharedView={true} />} />

                        {/* 404 – catch all unmatched routes */}
                        <Route path="*" element={<NotFoundPage />} />

                    </Routes>
                </UserProfileProvider>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
