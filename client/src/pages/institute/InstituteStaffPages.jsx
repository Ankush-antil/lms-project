import DashboardLayout from '../../components/layout/DashboardLayout';
import ComingSoon from '../../components/common/ComingSoon';
import InstituteStaffAttendance from './InstituteStaffAttendance';
export { InstituteStaffAttendance };
export const InstituteStaffSalary = () => (
    <DashboardLayout role="Institute">
        <ComingSoon title="Staff Salary" message="Manage salary records for your institute staff. Coming soon!" />
    </DashboardLayout>
);
export const InstituteStaffTask = () => (
    <DashboardLayout role="Institute">
        <ComingSoon title="Staff Tasks" message="Assign and track tasks for your institute staff. Coming soon!" />
    </DashboardLayout>
);
