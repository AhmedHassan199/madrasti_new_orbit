"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import EarlyLeavesView from "@/components/attendance/EarlyLeavesView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

/**
 * طلبات الاستئذان الواردة — نفس عرض الاستئذانات (EarlyLeavesView)
 * مع كوبي اختلاف بسيط في الـ label.
 */
export default function StudentRequestsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "طلبات الاستئذان — الطلاب" : "Permission Requests — Students"}
      subtitle={lang === "ar" ? "الطلبات المستلمة للاستئذان والخروج المبكر" : "Received permission requests"}
    >
      <EarlyLeavesView fetcher={attendanceApi.students.earlyLeaves} />
    </DashboardLayout>
  );
}
