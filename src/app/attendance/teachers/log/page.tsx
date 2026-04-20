"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DailyReportPage from "@/components/attendance/DailyReportPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";
export default function TeachersLogPage() {
  const { lang } = useUi();
  return (<DashboardLayout title={lang==="ar"?"سجل الحضور":"Attendance Log"}><DailyReportPage fetcher={attendanceApi.teachers.log} showStatusFilter={true} /></DashboardLayout>);
}
