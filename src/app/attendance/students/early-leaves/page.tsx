"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import EarlyLeavesView from "@/components/attendance/EarlyLeavesView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function StudentEarlyLeavesPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "استئذانات الطلاب" : "Student Permissions"}
      subtitle={lang === "ar" ? "طلبات الاستئذان والخروج المبكر للطلاب" : "Student early leave requests"}
    >
      <EarlyLeavesView fetcher={attendanceApi.students.earlyLeaves} />
    </DashboardLayout>
  );
}
