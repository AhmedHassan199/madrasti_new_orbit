"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DailyReportPage from "@/components/attendance/DailyReportPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function StudentsDailyPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "التقرير اليومي للطلاب" : "Student Daily Report"}
      subtitle={lang === "ar" ? "الحضور والغياب اليومي" : "Daily attendance"}
    >
      <DailyReportPage fetcher={attendanceApi.students.daily} showStatusFilter={true} />
    </DashboardLayout>
  );
}
