"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import AddEarlyLeaveView from "@/components/attendance/AddEarlyLeaveView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function AddTeacherEarlyLeavePage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إضافة استئذان — المعلمين" : "Add Early Leave — Teachers"}
      subtitle={lang === "ar" ? "إضافة طلب استئذان لمجموعة معلمين دفعة واحدة" : "Bulk-add early leave for teachers"}
    >
      <AddEarlyLeaveView
        type="teacher"
        roleLabel="معلم"
        bulkAction={attendanceApi.teachers.earlyLeavesBulk}
      />
    </DashboardLayout>
  );
}
