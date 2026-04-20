"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import StatisticsView from "@/components/attendance/StatisticsView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function TeacherStatisticsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إحصائيات الغياب والتأخير — المعلمين" : "Absence & Delay Statistics — Teachers"}
      subtitle={lang === "ar" ? "إجمالي أيام الغياب ووقت التأخير لكل معلم" : "Total absent days and delay time per teacher"}
    >
      <StatisticsView
        fetcher={attendanceApi.teachers.statistics}
        roleLabel="المعلم"
        classLabel="المجموعة"
      />
    </DashboardLayout>
  );
}
