"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DailyReportPage from "@/components/attendance/DailyReportPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";
export default function TeachersLatePage() {
  const { lang } = useUi();
  return (<DashboardLayout title={lang==="ar"?"تأخير المعلمين":"Teacher Late"}><DailyReportPage fetcher={attendanceApi.teachers.late} /></DashboardLayout>);
}
