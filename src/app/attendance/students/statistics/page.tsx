"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import StatisticsView from "@/components/attendance/StatisticsView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function StudentStatisticsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إحصائيات الغياب والتأخير — الطلاب" : "Absence & Delay Statistics — Students"}
      subtitle={lang === "ar" ? "إجمالي أيام الغياب ووقت التأخير لكل طالب" : "Total absent days and delay time per student"}
    >
      <StatisticsView
        fetcher={attendanceApi.students.statistics}
        roleLabel="الطالب"
        classLabel="الفصل"
      />
    </DashboardLayout>
  );
}
