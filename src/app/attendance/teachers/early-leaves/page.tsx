"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import EarlyLeavesView from "@/components/attendance/EarlyLeavesView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function TeacherEarlyLeavesPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "استئذانات المعلمين" : "Teacher Permissions"}
      subtitle={lang === "ar" ? "طلبات الاستئذان والخروج المبكر للمعلمين" : "Teacher early leave requests"}
    >
      <EarlyLeavesView fetcher={attendanceApi.teachers.earlyLeaves} />
    </DashboardLayout>
  );
}
