"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import EmployeesCrudView from "@/components/attendance/EmployeesCrudView";
import { useUi } from "@/contexts/UiContext";

export default function StudentsTablePage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إدارة الطلاب" : "Students Management"}
      subtitle={lang === "ar" ? "إضافة وتعديل وحذف الطلاب" : "CRUD for students"}
    >
      <EmployeesCrudView type="student" roleLabel="طالب" />
    </DashboardLayout>
  );
}
