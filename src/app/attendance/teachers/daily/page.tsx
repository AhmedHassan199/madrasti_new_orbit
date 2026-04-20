"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DailyReportPage from "@/components/attendance/DailyReportPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";
export default function TeachersDailyPage() {
  const { lang } = useUi();
  return (<DashboardLayout title={lang==="ar"?"التقرير اليومي للمعلمين":"Teacher Daily Report"}><DailyReportPage fetcher={attendanceApi.teachers.daily} showStatusFilter={true} /></DashboardLayout>);
}
