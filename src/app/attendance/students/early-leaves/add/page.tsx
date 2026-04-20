"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import AddEarlyLeaveView from "@/components/attendance/AddEarlyLeaveView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function AddStudentEarlyLeavePage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إضافة استئذان — الطلاب" : "Add Early Leave — Students"}
      subtitle={lang === "ar" ? "إضافة طلب استئذان لمجموعة طلاب دفعة واحدة" : "Bulk-add early leave for students"}
    >
      <AddEarlyLeaveView
        type="student"
        roleLabel="طالب"
        bulkAction={attendanceApi.students.earlyLeavesBulk}
      />
    </DashboardLayout>
  );
}
