"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import EmployeesCrudView from "@/components/attendance/EmployeesCrudView";
import { useUi } from "@/contexts/UiContext";

export default function TeachersTablePage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إدارة المعلمين" : "Teachers Management"}
      subtitle={lang === "ar" ? "إضافة وتعديل وحذف المعلمين" : "CRUD for teachers"}
    >
      <EmployeesCrudView type="teacher" roleLabel="معلم" />
    </DashboardLayout>
  );
}
