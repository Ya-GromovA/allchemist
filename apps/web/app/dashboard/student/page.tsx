import { ApprovedStudentDashboard } from "../../../components/approved/ApprovedStudentDashboard";
import { adaptApprovedStudentDashboard } from "../../../lib/adapters/student-dashboard";
import { approvedStudentDashboardSource } from "../../../lib/demo/approved-student-dashboard";

export default function StudentDashboardPage() {
  const data = adaptApprovedStudentDashboard(approvedStudentDashboardSource);

  return <ApprovedStudentDashboard data={data} mode="student" />;
}
