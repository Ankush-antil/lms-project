import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import TeacherActivities from '../screens/teacher/TeacherActivities';
import { CoursesList } from '../screens/admin/CoursesInstitutesList';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Attendance screens
import ScanAttendanceScreen from '../screens/student/ScanAttendanceScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';

// Screens
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Student
import StudentDashboard from '../screens/student/StudentDashboard';
import StudentTests from '../screens/student/StudentTests';
import TakeTestScreen from '../screens/student/TakeTestScreen';
import ViewTestResult from '../screens/student/ViewTestResult';
import ContactTeacher from '../screens/student/ContactTeacher';
import StudentAttendanceHistoryScreen from '../screens/student/StudentAttendanceHistoryScreen';
import StudentFeePortalScreen from '../screens/student/StudentFeePortalScreen';
import StudentPracticeTools from '../screens/student/StudentPracticeTools';
import VoiceRecorderPage from '../screens/student/tools/VoiceRecorderPage';
import VideoRecorderPage from '../screens/student/tools/VideoRecorderPage';
import ScreenRecorderPage from '../screens/student/tools/ScreenRecorderPage';
import ScreenshotToolPage from '../screens/student/tools/ScreenshotToolPage';
import WebCallingPage from '../screens/student/tools/WebCallingPage';
import FileUploadPage from '../screens/student/tools/FileUploadPage';

// Teacher
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import EvaluatePage from '../screens/teacher/EvaluatePage';
import ContactStudents from '../screens/teacher/ContactStudents';
import TeacherSnapshotsScreen from '../screens/teacher/TeacherSnapshotsScreen';

// Accountant
import AccountantDashboard from '../screens/accountant/AccountantDashboard';
import AccountantFeePortal from '../screens/accountant/AccountantFeePortal';

// Marketer
import MarketerDashboard from '../screens/marketer/MarketerDashboard';

// Staff
import StaffDashboard from '../screens/staff/StaffDashboard';

// Parent
import ParentDashboard from '../screens/parent/ParentDashboard';

// Guest
import GuestDashboard from '../screens/guest/GuestDashboard';

// Admin
import AdminDashboard from '../screens/admin/AdminDashboard';
import TeacherAttendanceRegisterScreen from '../screens/admin/TeacherAttendanceRegisterScreen';
import { StudentsList, TeachersList, EditorsList, AccountantsList, MarketersList, StaffList, ParentsList } from '../screens/admin/UserListScreen';
import StaffScreen from '../screens/admin/StaffScreen';
import ParentsScreen from '../screens/admin/ParentsScreen';
import InstitutesScreen from '../screens/admin/InstitutesScreen';
import TestsList from '../screens/admin/TestsList';
import TestBuilder from '../screens/admin/TestBuilder';
import UserDetailScreen from '../screens/admin/UserDetailScreen';
import CreateUserScreen from '../screens/admin/CreateUserScreen';
import CreateCourseScreen from '../screens/admin/CreateCourseScreen';
import CreateInstituteScreen from '../screens/admin/CreateInstituteScreen';
import InstituteDetailScreen from '../screens/admin/InstituteDetailScreen';
import UserDirectoryScreen from '../screens/admin/UserDirectoryScreen';
import SubjectsListScreen from '../screens/admin/SubjectsListScreen';
import ChatScreen from '../screens/admin/ChatScreen';
import DriveScreen from '../screens/admin/DriveScreen';
import NotesScreen from '../screens/admin/NotesScreen';
import AdminFeePortal from '../screens/admin/AdminFeePortal';
import AssetMgtScreen from '../screens/admin/AssetMgtScreen';
import LeadMgtScreen from '../screens/admin/LeadMgtScreen';
import AdsMgtScreen from '../screens/admin/AdsMgtScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
    headerShown: false,
    animation: 'slide_from_right',
    contentStyle: { backgroundColor: colors.bg },
};

// ─── Student Stack ──────────────────────────────────────────────────────────────
const StudentStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
        <Stack.Screen name="StudentTests" component={StudentTests} />
        <Stack.Screen name="TakeTest" component={TakeTestScreen} />
        <Stack.Screen name="ViewTestResult" component={ViewTestResult} />
        <Stack.Screen name="ContactTeacher" component={ContactTeacher} />
        <Stack.Screen name="StudentPracticeTools" component={StudentPracticeTools} />
        <Stack.Screen name="VoiceRecorderPage" component={VoiceRecorderPage} />
        <Stack.Screen name="VideoRecorderPage" component={VideoRecorderPage} />
        <Stack.Screen name="ScreenRecorderPage" component={ScreenRecorderPage} />
        <Stack.Screen name="ScreenshotToolPage" component={ScreenshotToolPage} />
        <Stack.Screen name="WebCallingPage" component={WebCallingPage} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ScanAttendance" component={ScanAttendanceScreen} />
        <Stack.Screen name="StudentAttendanceHistory" component={StudentAttendanceHistoryScreen} />
        <Stack.Screen name="StudentFeePortal" component={StudentFeePortalScreen} />
        <Stack.Screen name="Drive" component={DriveScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="FileUploadPage" component={FileUploadPage} />
    </Stack.Navigator>
);

// ─── Teacher Stack ──────────────────────────────────────────────────────────────
const TeacherStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
        <Stack.Screen name="TeacherActivities" component={TeacherActivities} />
        <Stack.Screen name="EvaluatePage" component={EvaluatePage} />
        <Stack.Screen name="ContactStudents" component={ContactStudents} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
        <Stack.Screen name="TeacherSnapshots" component={TeacherSnapshotsScreen} />
        <Stack.Screen name="TestBuilder" component={TestBuilder} />
        <Stack.Screen name="Drive" component={DriveScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="StudentPracticeTools" component={StudentPracticeTools} />
        <Stack.Screen name="VoiceRecorderPage" component={VoiceRecorderPage} />
        <Stack.Screen name="VideoRecorderPage" component={VideoRecorderPage} />
        <Stack.Screen name="ScreenRecorderPage" component={ScreenRecorderPage} />
        <Stack.Screen name="ScreenshotToolPage" component={ScreenshotToolPage} />
        <Stack.Screen name="WebCallingPage" component={WebCallingPage} />
        <Stack.Screen name="FileUploadPage" component={FileUploadPage} />
    </Stack.Navigator>
);

// ─── Admin Stack ────────────────────────────────────────────────────────────────
const AdminStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="StudentsList" component={StudentsList} />
        <Stack.Screen name="TeachersList" component={TeachersList} />
        <Stack.Screen name="EditorsList" component={EditorsList} />
        <Stack.Screen name="AccountantsList" component={AccountantsList} />
        <Stack.Screen name="MarketersList" component={MarketersList} />
        <Stack.Screen name="StaffList" component={StaffScreen} />
        <Stack.Screen name="ParentsList" component={ParentsScreen} />
        <Stack.Screen name="CoursesList" component={CoursesList} />
        <Stack.Screen name="InstitutesList" component={InstitutesScreen} />
        <Stack.Screen name="TestsList" component={TestsList} />
        <Stack.Screen name="TestBuilder" component={TestBuilder} />
        <Stack.Screen name="UserDetail" component={UserDetailScreen} />
        <Stack.Screen name="InstituteDetail" component={InstituteDetailScreen} />
        <Stack.Screen name="CreateUser" component={CreateUserScreen} />
        <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
        <Stack.Screen name="CreateInstitute" component={CreateInstituteScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="TeacherAttendanceRegister" component={TeacherAttendanceRegisterScreen} />
        <Stack.Screen name="UserDirectory" component={UserDirectoryScreen} />
        <Stack.Screen name="SubjectsList" component={SubjectsListScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Drive" component={DriveScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="AdminFeePortal" component={AdminFeePortal} />
        <Stack.Screen name="AssetMgt" component={AssetMgtScreen} />
        <Stack.Screen name="LeadMgt" component={LeadMgtScreen} />
        <Stack.Screen name="AdsMgt" component={AdsMgtScreen} />
        <Stack.Screen name="AccountantFeePortal" component={AccountantFeePortal} />
        <Stack.Screen name="TeacherActivities" component={TeacherActivities} />
        <Stack.Screen name="StudentPracticeTools" component={StudentPracticeTools} />
        <Stack.Screen name="VoiceRecorderPage" component={VoiceRecorderPage} />
        <Stack.Screen name="VideoRecorderPage" component={VideoRecorderPage} />
        <Stack.Screen name="ScreenRecorderPage" component={ScreenRecorderPage} />
        <Stack.Screen name="ScreenshotToolPage" component={ScreenshotToolPage} />
        <Stack.Screen name="WebCallingPage" component={WebCallingPage} />
        <Stack.Screen name="FileUploadPage" component={FileUploadPage} />
    </Stack.Navigator>
);

// ─── Accountant Stack ─────────────────────────────────────────────────────────────
const AccountantStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="AccountantDashboard" component={AccountantDashboard} />
        <Stack.Screen name="AccountantFeePortal" component={AccountantFeePortal} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
);

// ─── Marketer Stack ─────────────────────────────────────────────────────────────
const MarketerStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="MarketerDashboard" component={MarketerDashboard} />
        <Stack.Screen name="Drive" component={DriveScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="StudentPracticeTools" component={StudentPracticeTools} />
        <Stack.Screen name="VoiceRecorderPage" component={VoiceRecorderPage} />
        <Stack.Screen name="VideoRecorderPage" component={VideoRecorderPage} />
        <Stack.Screen name="ScreenRecorderPage" component={ScreenRecorderPage} />
        <Stack.Screen name="ScreenshotToolPage" component={ScreenshotToolPage} />
        <Stack.Screen name="WebCallingPage" component={WebCallingPage} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="FileUploadPage" component={FileUploadPage} />
    </Stack.Navigator>
);



// ─── Parent Stack ─────────────────────────────────────────────────────────────
const ParentStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="ParentDashboard" component={ParentDashboard} />
        <Stack.Screen name="StudentTests" component={StudentTests} />
        <Stack.Screen name="StudentFeePortal" component={StudentFeePortalScreen} />
        <Stack.Screen name="StudentAttendanceHistory" component={StudentAttendanceHistoryScreen} />
        <Stack.Screen name="Drive" component={DriveScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="StudentPracticeTools" component={StudentPracticeTools} />
        <Stack.Screen name="VoiceRecorderPage" component={VoiceRecorderPage} />
        <Stack.Screen name="VideoRecorderPage" component={VideoRecorderPage} />
        <Stack.Screen name="ScreenRecorderPage" component={ScreenRecorderPage} />
        <Stack.Screen name="ScreenshotToolPage" component={ScreenshotToolPage} />
        <Stack.Screen name="WebCallingPage" component={WebCallingPage} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="FileUploadPage" component={FileUploadPage} />
    </Stack.Navigator>
);

// ─── Guest Stack ─────────────────────────────────────────────────────────────
const GuestStack = () => (
    <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="GuestDashboard" component={GuestDashboard} />
        <Stack.Screen name="Drive" component={DriveScreen} />
        <Stack.Screen name="Notes" component={NotesScreen} />
        <Stack.Screen name="StudentPracticeTools" component={StudentPracticeTools} />
        <Stack.Screen name="VoiceRecorderPage" component={VoiceRecorderPage} />
        <Stack.Screen name="VideoRecorderPage" component={VideoRecorderPage} />
        <Stack.Screen name="ScreenRecorderPage" component={ScreenRecorderPage} />
        <Stack.Screen name="ScreenshotToolPage" component={ScreenshotToolPage} />
        <Stack.Screen name="WebCallingPage" component={WebCallingPage} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="FileUploadPage" component={FileUploadPage} />
    </Stack.Navigator>
);

// ─── Root Navigator ──────────────────────────────────────────────────────────────
const AppNavigator = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={styles.loadingScreen}>
                <View style={styles.loadingLogo}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
                {!user ? (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : user.role === 'Student' ? (
                    // Student
                    <Stack.Screen name="StudentRoot" component={StudentStack} />
                ) : user.role === 'Teacher' ? (
                    // Teacher
                    <Stack.Screen name="TeacherRoot" component={TeacherStack} />
                ) : user.role === 'Accountant' ? (
                    // Accountant
                    <Stack.Screen name="AccountantRoot" component={AccountantStack} />
                ) : (user.role === 'Admin' || user.role === 'Editor' || user.role === 'Institute' || user.role === 'Staff') ? (
                    // Admin/Editor/Institute/Staff
                    <Stack.Screen name="AdminRoot" component={AdminStack} />
                ) : user.role === 'Marketer' ? (
                    // Marketer
                    <Stack.Screen name="MarketerRoot" component={MarketerStack} />

                ) : user.role === 'Parent' ? (
                    // Parent
                    <Stack.Screen name="ParentRoot" component={ParentStack} />
                ) : user.role === 'Guest' ? (
                    // Guest
                    <Stack.Screen name="GuestRoot" component={GuestStack} />
                ) : (
                    // Fallback
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingScreen: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingLogo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default AppNavigator;
