"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DailyReportPage from "@/components/attendance/DailyReportPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";
export default function TeachersAbsentPage() {
  const { lang } = useUi();
  return (<DashboardLayout title={lang==="ar"?"غياب المعلمين":"Teacher Absent"}><DailyReportPage fetcher={attendanceApi.teachers.absent} /></DashboardLayout>);
}
